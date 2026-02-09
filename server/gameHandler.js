// server/gameHandler.js

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
    PLAYER_READY: 'PLAYER_READY', 
    START_AUCTION: 'START_AUCTION',
    BID: 'BID',
    WITHDRAW: 'WITHDRAW',
    NEED_TIME: 'NEED_TIME',
    PAUSE_RESUME: 'PAUSE_RESUME',
    CHANGE_TIMER: 'CHANGE_TIMER',
    VOTE_FINISH: 'VOTE_FINISH',
    NAVIGATE: 'NAVIGATE',
    
    // Legacy Events (Now Active for Admin Override)
    SOLD: 'SOLD',
    UNSOLD: 'UNSOLD'
};

const INITIAL_STATE = {
    roomId: null,
    hostId: null,
    config: { budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8, defaultTimer: 45 },
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
    timer: 60,
    auctionStatus: 'IDLE', 
    isPaused: false,
    finishVotes: [] 
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
        room.feed.unshift(log); 
        if(room.feed.length > 50) room.feed.pop(); 
    };

    const nextPlayerLoop = (room, roomId) => {
        if(room.isPaused) return;

        let set = room.playerSets[room.currentSetIndex];
        
        if (!set || set.players.length === 0) {
            if (room.currentSetIndex < room.playerSets.length - 1) {
                room.currentSetIndex++;
                set = room.playerSets[room.currentSetIndex];
                addToFeed(room, `📂 Starting Set: ${set.setName}`, 'INFO');
            } else {
                room.auctionStatus = 'IDLE';
                addToFeed(room, `🏁 All Players Auctioned! Waiting to Finish.`, 'INFO');
                broadcastState(roomId);
                return;
            }
        }

        if (set && set.players.length > 0) {
            const player = set.players[0];
            room.currentPlayer = player;
            room.currentBid = 0; 
            room.currentBidder = null;
            room.activeBidders = [];
            room.auctionStatus = 'REVEALED';
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
                // --- TIMER ENDED LOGIC ---
                
                // Case 1: Bid War (2 Teams) -> Auto Withdraw Loser
                if (room.activeBidders.length > 1) {
                    // The 'currentBidder' is the one who bid last (safe)
                    // The other one in 'activeBidders' is the one who timed out
                    const loserName = room.activeBidders.find(name => name !== room.currentBidder);
                    
                    if (loserName) {
                        room.activeBidders = room.activeBidders.filter(n => n !== loserName);
                        addToFeed(room, `⏳ ${loserName} timed out and was removed.`, 'ERROR');
                        
                        // Reset timer to give the winner a moment (or wait for new challenger)
                        room.timer = room.config.defaultTimer; 
                        broadcastState(roomId);
                        
                        // IMPORTANT: We do NOT stop the timer interval. 
                        // It keeps ticking for the single remaining bidder.
                        return;
                    }
                }

                // Case 2: Single Bidder or No Bids -> Sell/Unsold
                clearInterval(room.timerInterval);
                resolveRound(room, roomId);
            }
        }, 1000);
    };

    const resolveRound = (room, roomId) => {
        if(!room.currentPlayer) return;

        if(room.currentBidder) {
            const player = { ...room.currentPlayer, soldPrice: parseFloat(room.currentBid) };
            const team = room.activeTeams.find(t => t.name === room.currentBidder);
            
            if(team) {
                team.budget = parseFloat((team.budget - player.soldPrice).toFixed(2));
                team.spent = parseFloat((team.spent + player.soldPrice).toFixed(2));
                team.squad.push(player);
                if(player.isForeign) team.foreignCount++;
                addToFeed(room, `🔨 SOLD: ${player.name} to ${team.name} for ${player.soldPrice} Cr`, 'SUCCESS');
            }
            room.auctionStatus = 'SOLD_ANIMATION';
        } else {
            room.unsoldPlayers.push(room.currentPlayer);
            addToFeed(room, `❌ UNSOLD: ${room.currentPlayer.name}`, 'ERROR');
            room.auctionStatus = 'SOLD_ANIMATION';
        }

        room.playerSets.forEach(s => {
            s.players = s.players.filter(p => p.id !== room.currentPlayer.id);
        });

        broadcastState(roomId);

        setTimeout(() => {
            nextPlayerLoop(room, roomId);
        }, 5000);
    };

    // --- HANDLERS ---

    socket.on(EVENTS.JOIN, ({ roomId, userName, isHost }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            if (isHost) { 
                rooms[roomId] = JSON.parse(JSON.stringify(INITIAL_STATE)); 
                rooms[roomId].roomId = roomId; 
                rooms[roomId].hostId = socket.id; 
                console.log(`🏠 ROOM CREATED: ${roomId}`); 
            } else { socket.emit(EVENTS.ERROR, "Room does not exist."); return; }
        }
        const room = rooms[roomId];
        if(isHost) room.hostId = socket.id;
        
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
                if (user.id === room.hostId && room.connectedUsers.length > 0) {
                    const newHost = room.connectedUsers[0];
                    room.hostId = newHost.id;
                    newHost.isHost = true;
                    addToFeed(room, `👑 Host migrated to ${newHost.name}`, 'INFO');
                }
                broadcastState(roomId);
                break;
            }
        }
    });

    // --- ADMIN OVERRIDE HANDLERS ---
    socket.on(EVENTS.SOLD, ({ roomId, teamName, price }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        
        // Force update current state to match override
        room.currentBidder = teamName;
        room.currentBid = price;
        
        if(room.timerInterval) clearInterval(room.timerInterval);
        resolveRound(room, roomId);
    });

    socket.on(EVENTS.UNSOLD, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;

        // Force clear bidder
        room.currentBidder = null;
        
        if(room.timerInterval) clearInterval(room.timerInterval);
        resolveRound(room, roomId);
    });

    // --- GAMEPLAY HANDLERS ---
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

        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        if(!team) return socket.emit(EVENTS.ERROR, "No Team Assigned");

        if (room.activeBidders.length >= 2 && !room.activeBidders.includes(team.name)) {
             return socket.emit(EVENTS.ERROR, "Bid War Locked! Wait for withdrawal.");
        }
        if (team.budget < amount) return socket.emit(EVENTS.ERROR, "Insufficient Budget");

        // Logic for First Bid vs Increment
        if (room.currentBid === 0) {
            // First bid must be >= Base Price
             if (amount < room.currentPlayer.basePrice) return socket.emit(EVENTS.ERROR, `Bid must start at Base Price`);
        } else {
             if (amount <= room.currentBid) return socket.emit(EVENTS.ERROR, "Bid must be higher than current");
        }

        room.currentBid = amount;
        room.currentBidder = team.name;
        
        if(!room.activeBidders.includes(team.name)) {
            room.activeBidders.push(team.name);
        }

        // Timer Rule: 10s if War, else Default
        if(room.activeBidders.length > 1) {
            room.timer = 10;
        } else {
            room.timer = room.config.defaultTimer; 
        }

        addToFeed(room, `${team.name} bid ${amount} Cr`, 'BID');
        broadcastState(roomId);
    });

    socket.on(EVENTS.WITHDRAW, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;
        const team = room.activeTeams.find(t => t.ownerId === socket.id);
        if(team && room.activeBidders.includes(team.name)) {
            if(room.currentBidder === team.name) return socket.emit(EVENTS.ERROR, "Cannot withdraw while leading!");
            
            room.activeBidders = room.activeBidders.filter(n => n !== team.name);
            addToFeed(room, `${team.name} withdrew from bid war.`, 'INFO');
            room.timer = room.config.defaultTimer;
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.NEED_TIME, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;
        room.timer += 30;
        addToFeed(room, `⏱ Time Extended by 30s`, 'INFO');
        broadcastState(roomId);
    });

    socket.on(EVENTS.PAUSE_RESUME, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        room.isPaused = !room.isPaused;
        addToFeed(room, room.isPaused ? "⏸ Auction Paused" : "▶ Auction Resumed", 'INFO');
        broadcastState(roomId);
        if(!room.isPaused && room.auctionStatus === 'IDLE' && room.currentSetIndex < room.playerSets.length) {
             nextPlayerLoop(room, roomId);
        }
    });

    socket.on(EVENTS.CHANGE_TIMER, ({ roomId, seconds }) => {
        const room = rooms[roomId];
        if(room && room.hostId === socket.id) {
            room.config.defaultTimer = parseInt(seconds);
            addToFeed(room, `⚙️ Default Timer set to ${seconds}s`, 'INFO');
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.VOTE_FINISH, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;
        const allMet = room.activeTeams.every(t => t.squad.length >= room.config.minPlayers);
        if(!allMet) return socket.emit(EVENTS.ERROR, "All teams must meet minimum player count!");

        if(!room.finishVotes.includes(socket.id)) {
            room.finishVotes.push(socket.id);
            addToFeed(room, `✅ A user voted to Finish (${room.finishVotes.length}/${room.connectedUsers.length})`, 'INFO');
        }

        if(room.finishVotes.length === room.connectedUsers.length) {
            room.currentPage = 'summary';
            addToFeed(room, `🏁 Auction Finished! Moving to Summary.`, 'SUCCESS');
            broadcastState(roomId);
        } else {
            broadcastState(roomId);
        }
    });

    // ... Standard Handlers (Join, etc) ...
    socket.on(EVENTS.PLAYER_READY, ({ roomId }) => {
        const room = rooms[roomId]; if(room) { 
            const u = room.connectedUsers.find(x => x.id === socket.id); 
            if(u) { u.isReady = !u.isReady; broadcastState(roomId); }
        }
    });
    socket.on(EVENTS.CLAIM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId]; if(!room) return;
        const isTaken = room.activeTeams.find(t => t.id === team.id && t.ownerId !== socket.id);
        if(isTaken) { socket.emit(EVENTS.ERROR, "Team already taken!"); return; }
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id);
        room.activeTeams.push({ ...team, ownerId: socket.id, budget: parseFloat(room.config.budget), spent: 0, squad: [], foreignCount: 0 });
        broadcastState(roomId);
    });
    socket.on(EVENTS.ADD_CUSTOM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId]; if(!room) return; room.customTeams.push(team); room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id); room.activeTeams.push({ ...team, ownerId: socket.id, budget: parseFloat(room.config.budget), spent: 0, squad: [], foreignCount: 0 }); broadcastState(roomId);
    });
    socket.on(EVENTS.START_GAME, ({ roomId }) => {
        const room = rooms[roomId]; if(room && room.activeTeams.length >= 2) { room.currentPage = 'selection'; broadcastState(roomId); }
    });
    socket.on(EVENTS.UPLOAD_DATA, ({ roomId, sets }) => { if(rooms[roomId]) { rooms[roomId].playerSets = sets; rooms[roomId].currentPage = 'review'; broadcastState(roomId); } });
    socket.on(EVENTS.ADD_PLAYER, ({ roomId, setIndex, player }) => { const r = rooms[roomId]; if(r) { r.playerSets[setIndex].players.push(player); broadcastState(roomId); }});
    socket.on(EVENTS.DELETE_PLAYER, ({ roomId, setIndex, playerId }) => { const r = rooms[roomId]; if(r) { r.playerSets[setIndex].players = r.playerSets[setIndex].players.filter(p => p.id !== playerId); broadcastState(roomId); }});
    socket.on(EVENTS.NAVIGATE, ({ roomId, page }) => { if(rooms[roomId]) { rooms[roomId].currentPage = page; broadcastState(roomId); }});
    socket.on(EVENTS.UPDATE_SETTINGS, ({ roomId, config }) => { const r = rooms[roomId]; if(r) { r.config = config; r.activeTeams.forEach(t => t.budget = parseFloat(config.budget)); broadcastState(roomId); }});
}

module.exports = { handleGameEvents };