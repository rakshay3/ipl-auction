const EVENTS = {
    JOIN: 'JOIN_ROOM',
    UPDATE: 'STATE_UPDATE',
    ERROR: 'ERROR_MSG',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    CLAIM_TEAM: 'CLAIM_TEAM',
    ADD_CUSTOM_TEAM: 'ADD_CUSTOM_TEAM',
    START_GAME: 'START_GAME',
    UPLOAD_DATA: 'UPLOAD_DATA', 
    ADD_PLAYER: 'ADD_PLAYER',
    DELETE_PLAYER: 'DELETE_PLAYER',
    DELETE_SET: 'DELETE_SET',
    PLAYER_READY: 'PLAYER_READY', 
    START_AUCTION: 'START_AUCTION',
    START_TIMER: 'START_TIMER', 
    BID: 'BID',
    WITHDRAW: 'WITHDRAW',
    MESSAGE: 'MESSAGE',
    NEED_TIME: 'NEED_TIME',
    PAUSE_RESUME: 'PAUSE_RESUME',
    CHANGE_TIMER: 'CHANGE_TIMER',
    VOTE_FINISH: 'VOTE_FINISH',
    NAVIGATE: 'NAVIGATE',
    END_ROOM: 'END_ROOM',
    SOLD: 'SOLD',
    UNSOLD: 'UNSOLD',
    VOTE_FAST_AUCTION: 'VOTE_FAST_AUCTION',
    SUBMIT_SHORTLIST: 'SUBMIT_SHORTLIST',
    CONFIRM_FAST_AUCTION: 'CONFIRM_FAST_AUCTION'
};

const INITIAL_STATE = {
    roomId: null,
    hostId: null,
    config: { budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8, defaultTimer: 30 },
    activeTeams: [],
    customTeams: [],
    connectedUsers: [], 
    playerSets: [],
    unsoldPlayers: [],
    feed: [],
    currentPage: 'landing', 
    currentSetIndex: 0,
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null, 
    activeBidders: [],   
    timer: 10,
    auctionStatus: 'IDLE', 
    isPaused: false,
    finishVotes: [],
    fastAuctionVotes: [],
    teamShortlists: {},
    aggregatedShortlist: [] 
};

function handleGameEvents(io, socket, rooms) {

    const getSafeState = (room) => {
        const { timerInterval, ...safeState } = room;
        return safeState;
    };

    const broadcastState = (roomId) => {
        if(rooms[roomId]) {
            io.to(roomId).emit(EVENTS.UPDATE, getSafeState(rooms[roomId]));
        }
    };

    const addToFeed = (room, msg, type='INFO') => {
        const log = { msg, type, timestamp: Date.now() };
        room.feed.push(log); 
        // CHANGED: Use shift() to remove from the start (oldest), not pop() (newest)
        if(room.feed.length > 50) room.feed.shift(); 
    };

    // --- MAIN GAME LOOP (UPDATED FOR RANDOM & STATUS) ---
    const nextPlayerLoop = (room, roomId) => {
        if(room.isPaused) return;

        let set = room.playerSets[room.currentSetIndex];
        
        // 1. Filter only available players (NOT Sold or Unsold)
        let availablePlayers = set ? set.players.filter(p => !p.status) : [];

        // 2. If Set Empty, Try Next Set or Finish
        if (!set || availablePlayers.length === 0) {
            if (room.currentSetIndex < room.playerSets.length - 1) {
                room.currentSetIndex++;
                set = room.playerSets[room.currentSetIndex];
                addToFeed(room, `📂 Starting Set: ${set.setName}`, 'INFO');
                // Recalculate available for new set
                availablePlayers = set.players.filter(p => !p.status);
            } else {
                room.auctionStatus = 'IDLE';
                addToFeed(room, `🏁 All Players Auctioned! Waiting to Finish.`, 'INFO');
                broadcastState(roomId);
                return;
            }
        }

        // 3. Pick Random Player
        if (availablePlayers.length > 0) {
            const randomIndex = Math.floor(Math.random() * availablePlayers.length);
            const player = availablePlayers[randomIndex];
            
            room.currentPlayer = player;
            room.currentBid = 0; 
            room.currentBidder = null;
            room.activeBidders = [];
            room.auctionStatus = 'REVEALED'; // Set to REVEALED so bids are accepted
            room.timer = room.config.defaultTimer; 
            
            addToFeed(room, `🃏 Revealed: ${player.name} (${player.type})`, 'INFO');
            broadcastState(roomId);

            startTimer(room, roomId);
        }
    };

    const startTimer = (room, roomId) => {
        if(room.timerInterval) clearInterval(room.timerInterval);
        
        room.timerInterval = setInterval(() => {
            if(room.isPaused || room.auctionStatus !== 'REVEALED') return;

            if(room.timer > 0) {
                room.timer--;
                io.to(roomId).emit(EVENTS.UPDATE, getSafeState(room));
            } else {
                // Timeout Logic
                if (room.activeBidders.length > 1) {
                    const loserName = room.activeBidders.find(name => name !== room.currentBidder);
                    if (loserName) {
                        room.activeBidders = room.activeBidders.filter(n => n !== loserName);
                        addToFeed(room, `⏳ ${loserName} timed out and was removed.`, 'ERROR');
                        room.timer = room.config.defaultTimer; 
                        broadcastState(roomId);
                        return;
                    }
                }
                clearInterval(room.timerInterval);
                resolveRound(room, roomId); // Handles Unsold/Sold finalization
            }
        }, 1000);
    };

    const resolveRound = (room, roomId) => {
        if(!room.currentPlayer) return;

        // Find the actual player object in the set to update status
        const currentSet = room.playerSets[room.currentSetIndex];
        const setPlayer = currentSet ? currentSet.players.find(p => p.id === room.currentPlayer.id) : null;

        if(room.currentBidder) {
            // --- SOLD LOGIC ---
            const player = { ...room.currentPlayer, soldPrice: parseFloat(room.currentBid) };
            const team = room.activeTeams.find(t => t.name === room.currentBidder);
            
            if(team) {
                team.budget = parseFloat((team.budget - player.soldPrice).toFixed(2));
                team.spent = parseFloat((team.spent + player.soldPrice).toFixed(2));
                team.squad.push(player);
                if(player.isForeign) team.foreignCount++;
                addToFeed(room, `🔨 SOLD: ${player.name} to ${team.name} for ${player.soldPrice} Cr`, 'SUCCESS');
                
                // Mark as SOLD
                if(setPlayer) setPlayer.status = 'SOLD';
            }
            room.auctionStatus = 'SOLD_ANIMATION';
        } else {
            // --- UNSOLD LOGIC ---
            room.unsoldPlayers.push(room.currentPlayer);
            addToFeed(room, `❌ UNSOLD: ${room.currentPlayer.name}`, 'ERROR');
            room.auctionStatus = 'SOLD_ANIMATION';
            
            // Mark as UNSOLD
            if(setPlayer) setPlayer.status = 'UNSOLD';
        }

        // NOTE: We do NOT delete the player from the set anymore.
        
        broadcastState(roomId);

        // Auto-loop to next player (can be removed if you want manual control only)
        // Checks if we should continue
        setTimeout(() => {
            if (room.auctionStatus !== 'IDLE' && !room.isPaused) {
                nextPlayerLoop(room, roomId);
            }
        }, 2000);
    };

    // --- HANDLERS ---

    socket.on(EVENTS.JOIN, ({ roomId, userName, isHost, create }) => { 
        socket.join(roomId);
        if (!rooms[roomId]) {
            if (isHost && create) { 
                rooms[roomId] = JSON.parse(JSON.stringify(INITIAL_STATE)); 
                rooms[roomId].roomId = roomId; 
                rooms[roomId].hostId = socket.id; 
                console.log(`🏠 ROOM CREATED: ${roomId}`); 
            } else { 
                socket.emit(EVENTS.ERROR, "Room does not exist."); 
                return; 
            }
        }
        
        const room = rooms[roomId];
        if(isHost && room.connectedUsers.some(u => u.isHost && u.name === userName)) {
             room.hostId = socket.id; 
        }
        const existingTeam = room.activeTeams.find(t => t.ownerName === userName);
        if (existingTeam) existingTeam.ownerId = socket.id;

        const existingUser = room.connectedUsers.find(u => u.name === userName);
        if(existingUser) {
            existingUser.id = socket.id;
            existingUser.isHost = isHost;
        } else {
            room.connectedUsers.push({ id: socket.id, name: userName, isHost, isReady: isHost });
        }
        broadcastState(roomId);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const userIndex = room.connectedUsers.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                const user = room.connectedUsers[userIndex];
                room.connectedUsers.splice(userIndex, 1);
                addToFeed(room, `${user.name} disconnected.`, 'ERROR');
                if (user.id === room.hostId) {
                    if (room.connectedUsers.length > 0) {
                        const newHost = room.connectedUsers[0];
                        room.hostId = newHost.id;
                        newHost.isHost = true;
                        addToFeed(room, `👑 Host migrated to ${newHost.name}`, 'INFO');
                    }
                }
                broadcastState(roomId);
                break;
            }
        }
    });

    socket.on(EVENTS.END_ROOM, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        if(room.timerInterval) clearInterval(room.timerInterval);
        room.currentPage = 'summary';
        addToFeed(room, "⛔ Host ended the room manually.", 'ERROR');
        broadcastState(roomId);
    });

   socket.on(EVENTS.VOTE_FINISH, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;
        const allMet = room.activeTeams.every(t => t.squad.length >= room.config.minPlayers);
        if(!allMet) return socket.emit(EVENTS.ERROR, "All teams must meet minimum player count!");

        const user = room.connectedUsers.find(u => u.id === socket.id);
        const name = user ? user.name : "Unknown";

        if(room.finishVotes.includes(socket.id)) {
            room.finishVotes = room.finishVotes.filter(id => id !== socket.id);
            addToFeed(room, `❌ ${name} cancelled finish vote.`, 'INFO');
        } else {
            room.finishVotes.push(socket.id);
            addToFeed(room, `✅ ${name} voted to Finish (${room.finishVotes.length}/${room.connectedUsers.length}).`, 'SUCCESS');
        }

        if(room.connectedUsers.length > 0 && room.finishVotes.length >= room.connectedUsers.length) {
            if(room.timerInterval) clearInterval(room.timerInterval);
            room.currentPage = 'summary';
            addToFeed(room, `🏁 Consensus Reached! Auction Finished.`, 'SUCCESS');
            broadcastState(roomId);
        } else {
            broadcastState(roomId);
        }
    });

    // --- FAST AUCTION LOGIC ---

    socket.on(EVENTS.VOTE_FAST_AUCTION, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;

        const user = room.connectedUsers.find(u => u.id === socket.id);
        const name = user ? user.name : "Unknown";

        // Toggle Vote
        if(room.fastAuctionVotes.includes(socket.id)) {
            room.fastAuctionVotes = room.fastAuctionVotes.filter(id => id !== socket.id);
            addToFeed(room, `⏳ ${name} cancelled Fast Auction vote.`, 'INFO');
        } else {
            room.fastAuctionVotes.push(socket.id);
            addToFeed(room, `⚡ ${name} voted for Fast Auction (${room.fastAuctionVotes.length}/${room.connectedUsers.length}).`, 'SUCCESS');
        }

        // If everyone votes, move to Shortlist Page
        if(room.connectedUsers.length > 0 && room.fastAuctionVotes.length >= room.connectedUsers.length) {
            if(room.timerInterval) clearInterval(room.timerInterval);
            room.currentPage = 'shortlist'; // New Page!
            room.fastAuctionVotes = []; // Reset votes
            addToFeed(room, `⚡ Fast Auction Initiated! Teams are selecting players.`, 'SUCCESS');
        }
        
        broadcastState(roomId);
    });

    socket.on(EVENTS.SUBMIT_SHORTLIST, ({ roomId, playerIds }) => {
        const room = rooms[roomId]; 
        if(!room) return;

        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        const identifier = team ? team.name : (room.hostId === socket.id ? 'HOST' : null);
        
        if(!identifier) return; // Only teams and host can submit

        // Save this team's list
        room.teamShortlists[identifier] = playerIds;
        addToFeed(room, `📝 ${identifier} submitted their shortlist.`, 'INFO');

        // Check if all active teams have submitted
        const teamsSubmittedCount = Object.keys(room.teamShortlists).filter(k => k !== 'HOST').length;
        
        if (teamsSubmittedCount >= room.activeTeams.length) {
            // ALL TEAMS SUBMITTED -> AGGREGATE THE LIST!
            
            // 1. Combine all IDs and remove duplicates using a Set
            const uniquePlayerIds = new Set();
            Object.values(room.teamShortlists).forEach(list => list.forEach(id => uniquePlayerIds.add(id)));
            
            // 2. Gather all available players (Unsold + Upcoming sets)
            const allAvailablePlayers = [...room.unsoldPlayers];
            room.playerSets.forEach((set, idx) => {
                if (idx >= room.currentSetIndex) {
                     // Only grab players who aren't sold yet
                     allAvailablePlayers.push(...set.players.filter(p => !p.status || p.status === 'UNSOLD'));
                }
            });
            
            // 3. Match IDs to actual Player Objects
            const finalPlayers = [];
            uniquePlayerIds.forEach(id => {
                const playerObj = allAvailablePlayers.find(p => p.id === id);
                // Ensure no duplicates in final array just in case
                if(playerObj && !finalPlayers.some(fp => fp.id === id)) {
                    // Reset status so they can be auctioned again if they were unsold
                    finalPlayers.push({ ...playerObj, status: null });
                }
            });
            
            room.aggregatedShortlist = finalPlayers;
            room.currentPage = 'shortlist_review'; // Move to Host Confirmation Page
            addToFeed(room, `✅ All lists submitted! Host reviewing final ${finalPlayers.length} players.`, 'SUCCESS');
        }
        
        broadcastState(roomId);
    });

    socket.on(EVENTS.CONFIRM_FAST_AUCTION, ({ roomId }) => {
        const room = rooms[roomId]; 
        if(!room || room.hostId !== socket.id) return;

        // The Ultimate Magic Trick: Replace all sets with the Accelerated Set
        room.playerSets = [{
            setName: "Accelerated Set 🔥",
            players: room.aggregatedShortlist
        }];
        
        room.currentSetIndex = 0;
        room.currentPlayer = null;
        room.auctionStatus = 'IDLE';
        room.unsoldPlayers = []; // Clear the old unsold list
        room.teamShortlists = {}; // Reset shortlists
        room.aggregatedShortlist = []; // Clear temp array
        
        room.currentPage = 'auction'; // Send everyone back to the auction!
        
        addToFeed(room, `🚀 Accelerated Auction Starting!`, 'SUCCESS');
        broadcastState(roomId);
    });

    socket.on(EVENTS.CLAIM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId]; if(!room) return;
        const isTaken = room.activeTeams.find(t => t.id === team.id && t.ownerId !== socket.id);
        if(isTaken) { socket.emit(EVENTS.ERROR, "Team already taken!"); return; }
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id);
        const user = room.connectedUsers.find(u => u.id === socket.id);
        const ownerName = user ? user.name : "Unknown";
        room.activeTeams.push({ 
            ...team, 
            ownerId: socket.id, 
            ownerName: ownerName, 
            budget: parseFloat(room.config.budget), 
            spent: 0, 
            squad: [], 
            foreignCount: 0 
        });
        broadcastState(roomId);
    });

    // --- NEW: START TIMER EVENT ---
    socket.on(EVENTS.START_TIMER, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        // Calls the random player loop
        nextPlayerLoop(room, roomId);
    });

    socket.on(EVENTS.START_AUCTION, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        if(room.connectedUsers.some(u => !u.isReady)) {
            return socket.emit(EVENTS.ERROR, "Wait for all users to be READY!");
        }
        room.currentPage = 'auction';
        addToFeed(room, "🚀 Auction Started!", 'INFO');
        broadcastState(roomId);
        setTimeout(() => nextPlayerLoop(room, roomId), 1000);
    });

    socket.on(EVENTS.BID, ({ roomId, amount }) => {
        const room = rooms[roomId];
        if(!room || room.auctionStatus !== 'REVEALED' || room.isPaused) return;
        if(!room.currentPlayer) {
            return socket.emit(EVENTS.ERROR, "No active player to bid on!");
        }
        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        if(!team) return socket.emit(EVENTS.ERROR, "No Team Assigned");

        if (room.activeBidders.length >= 2 && !room.activeBidders.includes(team.name)) return socket.emit(EVENTS.ERROR, "Bid War Locked!");
        if (team.budget < amount) return socket.emit(EVENTS.ERROR, "Insufficient Budget");
        
        if (team.squad.length >= room.config.maxPlayers) {
            return socket.emit(EVENTS.ERROR, `Squad Full! (${room.config.maxPlayers} players)`);
        }
        if (room.currentPlayer.isForeign && team.foreignCount >= room.config.maxForeign) {
            return socket.emit(EVENTS.ERROR, `Foreign Limit Reached! (${room.config.maxForeign} max)`);
        }

        if (room.currentBid === 0) { 
             if (amount < room.currentPlayer.basePrice) return socket.emit(EVENTS.ERROR, `Bid must start at Base Price`); 
        } else { 
             if (amount <= room.currentBid) return socket.emit(EVENTS.ERROR, "Bid must be higher"); 
        }

        room.currentBid = amount; 
        room.currentBidder = team.name;
        if(!room.activeBidders.includes(team.name)) room.activeBidders.push(team.name);
        room.timer = room.activeBidders.length > 1 ? 10 : room.config.defaultTimer;
        addToFeed(room, `${team.name} bid ${amount} Cr`, 'BID'); 
        broadcastState(roomId);
    });

    socket.on(EVENTS.WITHDRAW, ({ roomId }) => {
        const room = rooms[roomId]; if(!room) return;
        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        if(team && room.activeBidders.includes(team.name)) {
            if(room.currentBidder === team.name) return socket.emit(EVENTS.ERROR, "Cannot withdraw while leading!");
            room.activeBidders = room.activeBidders.filter(n => n !== team.name); addToFeed(room, `${team.name} withdrew.`, 'INFO'); room.timer = room.config.defaultTimer; broadcastState(roomId);
        }
    });

    socket.on(EVENTS.MESSAGE, ({ roomId, message }) => {
        const room = rooms[roomId];
        if (!room) return;
        const user = room.connectedUsers.find(u => u.id === socket.id);
        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        const senderName = team ? team.abbr : (user ? user.name : "Unknown");
        room.feed.push({ type: 'CHAT', sender: senderName, msg: message, timestamp: Date.now() });
        if(room.feed.length > 50) room.feed.shift();
        broadcastState(roomId);
    });

    socket.on(EVENTS.NEED_TIME, ({ roomId }) => { const r = rooms[roomId]; if(r) { r.timer += 30; addToFeed(r, `⏱ Time Extended`, 'INFO'); broadcastState(roomId); }});
    socket.on(EVENTS.PAUSE_RESUME, ({ roomId }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.isPaused = !r.isPaused; addToFeed(r, r.isPaused ? "⏸ Paused" : "▶ Resumed", 'INFO'); broadcastState(roomId); if(!r.isPaused && r.auctionStatus === 'IDLE') nextPlayerLoop(r, roomId); }});
    socket.on(EVENTS.CHANGE_TIMER, ({ roomId, seconds }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.config.defaultTimer = parseInt(seconds); addToFeed(r, `⚙️ Timer: ${seconds}s`, 'INFO'); broadcastState(roomId); }});
    
    socket.on(EVENTS.PLAYER_READY, ({ roomId }) => { const r = rooms[roomId]; if(r) { const u = r.connectedUsers.find(x => x.id === socket.id); if(u) { u.isReady = !u.isReady; broadcastState(roomId); }}});
    
    socket.on(EVENTS.ADD_CUSTOM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId]; if(!room) return; 
        const user = room.connectedUsers.find(u => u.id === socket.id);
        const ownerName = user ? user.name : "Unknown";
        room.customTeams.push(team); 
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id); 
        room.activeTeams.push({ ...team, ownerId: socket.id, ownerName, budget: parseFloat(room.config.budget), spent: 0, squad: [], foreignCount: 0 }); 
        broadcastState(roomId); 
    });

    socket.on(EVENTS.START_GAME, ({ roomId }) => { const r = rooms[roomId]; if(r && r.activeTeams.length >= 2) { r.currentPage = 'selection'; broadcastState(roomId); }});
    socket.on(EVENTS.UPLOAD_DATA, ({ roomId, sets }) => { if(rooms[roomId]) { rooms[roomId].playerSets = sets; rooms[roomId].currentPage = 'review'; broadcastState(roomId); } });
    socket.on(EVENTS.ADD_PLAYER, ({ roomId, setIndex, player }) => { const r = rooms[roomId]; if(r) { r.playerSets[setIndex].players.push(player); broadcastState(roomId); }});
    socket.on(EVENTS.DELETE_PLAYER, ({ roomId, setIndex, playerId }) => { const r = rooms[roomId]; if(r) { r.playerSets[setIndex].players = r.playerSets[setIndex].players.filter(p => p.id !== playerId); broadcastState(roomId); }});
    
    socket.on(EVENTS.DELETE_SET, ({ roomId, setIndex }) => {
        const room = rooms[roomId];
        if(!room || !room.playerSets[setIndex]) return;
        if(setIndex === room.currentSetIndex && room.auctionStatus !== 'IDLE') { return socket.emit(EVENTS.ERROR, "Cannot delete the active set while playing!"); }
        const setName = room.playerSets[setIndex].setName;
        room.playerSets.splice(setIndex, 1);
        if(setIndex < room.currentSetIndex) { room.currentSetIndex--; }
        addToFeed(room, `🗑️ Set "${setName}" deleted by Host.`, 'INFO');
        broadcastState(roomId);
    });
    
    socket.on(EVENTS.NAVIGATE, ({ roomId, page }) => { if(rooms[roomId]) { rooms[roomId].currentPage = page; broadcastState(roomId); }});
    socket.on(EVENTS.UPDATE_SETTINGS, ({ roomId, config }) => { const r = rooms[roomId]; if(r) { r.config = config; r.activeTeams.forEach(t => t.budget = parseFloat(config.budget)); broadcastState(roomId); }});

}

module.exports = { handleGameEvents };