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
    END_ROOM: 'END_ROOM',
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

    socket.on(EVENTS.JOIN, ({ roomId, userName, isHost, create }) => { // <--- Added 'create' param
        socket.join(roomId);
        
        // CHECK IF ROOM EXISTS
        if (!rooms[roomId]) {
            // ONLY create if the 'create' flag is explicitly true
            if (isHost && create) { 
                rooms[roomId] = JSON.parse(JSON.stringify(INITIAL_STATE)); 
                rooms[roomId].roomId = roomId; 
                rooms[roomId].hostId = socket.id; 
                console.log(`🏠 ROOM CREATED: ${roomId}`); 
            } else { 
                // If trying to join/reconnect to a dead room (even as host), FAIL.
                socket.emit(EVENTS.ERROR, "Room does not exist."); 
                return; 
            }
        }
        
        const room = rooms[roomId];
        
        // Host Reconnect Check
        if(isHost && room.connectedUsers.some(u => u.isHost && u.name === userName)) {
             room.hostId = socket.id; 
        }

        // Reclaim Team if exists
        const existingTeam = room.activeTeams.find(t => t.ownerName === userName);
        if (existingTeam) {
            existingTeam.ownerId = socket.id;
        }

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
                
                // 1. Remove from Connected List (So they don't block "Finish" votes)
                room.connectedUsers.splice(userIndex, 1);
                addToFeed(room, `${user.name} disconnected.`, 'ERROR');

                // 2. Host Migration
                if (user.id === room.hostId) {
                    if (room.connectedUsers.length > 0) {
                        const newHost = room.connectedUsers[0];
                        room.hostId = newHost.id;
                        newHost.isHost = true;
                        addToFeed(room, `👑 Host migrated to ${newHost.name}`, 'INFO');
                    }
                }
                
                // 3. REMOVED: The logic that deleted the team.
                // We keep the team in `activeTeams` so data persists.

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
        
        // 1. Check Min Players
        const allMet = room.activeTeams.every(t => t.squad.length >= room.config.minPlayers);
        if(!allMet) return socket.emit(EVENTS.ERROR, "All teams must meet minimum player count!");

        const user = room.connectedUsers.find(u => u.id === socket.id);
        const name = user ? user.name : "Unknown";

        // 2. Toggle Vote
        if(room.finishVotes.includes(socket.id)) {
            room.finishVotes = room.finishVotes.filter(id => id !== socket.id);
            addToFeed(room, `❌ ${name} cancelled finish vote.`, 'INFO');
        } else {
            room.finishVotes.push(socket.id);
            addToFeed(room, `✅ ${name} voted to Finish (${room.finishVotes.length}/${room.connectedUsers.length}).`, 'SUCCESS');
        }

        // 3. Check Consensus
        // Only finish if EVERY connected user has voted
        if(room.connectedUsers.length > 0 && room.finishVotes.length >= room.connectedUsers.length) {
            if(room.timerInterval) clearInterval(room.timerInterval);
            room.currentPage = 'summary';
            addToFeed(room, `🏁 Consensus Reached! Auction Finished.`, 'SUCCESS');
            broadcastState(roomId);
        } else {
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.CLAIM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId]; if(!room) return;
        const isTaken = room.activeTeams.find(t => t.id === team.id && t.ownerId !== socket.id);
        if(isTaken) { socket.emit(EVENTS.ERROR, "Team already taken!"); return; }
        
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id);
        
        // Find User Name to store with team (For reconnection)
        const user = room.connectedUsers.find(u => u.id === socket.id);
        const ownerName = user ? user.name : "Unknown";

        room.activeTeams.push({ 
            ...team, 
            ownerId: socket.id, 
            ownerName: ownerName, // <--- SAVING NAME FOR RECONNECT
            budget: parseFloat(room.config.budget), 
            spent: 0, 
            squad: [], 
            foreignCount: 0 
        });
        broadcastState(roomId);
    });

    // ... OTHER HANDLERS ...
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

        // --- EXISTING CHECKS ---
        if (room.activeBidders.length >= 2 && !room.activeBidders.includes(team.name)) return socket.emit(EVENTS.ERROR, "Bid War Locked!");
        if (team.budget < amount) return socket.emit(EVENTS.ERROR, "Insufficient Budget");

        // --- NEW: SQUAD LIMIT CHECKS ---
        
        // 1. Check Max Squad Size
        if (team.squad.length >= room.config.maxPlayers) {
            return socket.emit(EVENTS.ERROR, `Squad Full! (${room.config.maxPlayers} players)`);
        }

        // 2. Check Foreign Player Limit
        if (room.currentPlayer.isForeign && team.foreignCount >= room.config.maxForeign) {
            return socket.emit(EVENTS.ERROR, `Foreign Limit Reached! (${room.config.maxForeign} max)`);
        }

        // --- END NEW CHECKS ---

        // Logic for First Bid vs Increment
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
    
    socket.on(EVENTS.NEED_TIME, ({ roomId }) => { const r = rooms[roomId]; if(r) { r.timer += 30; addToFeed(r, `⏱ Time Extended`, 'INFO'); broadcastState(roomId); }});
    socket.on(EVENTS.PAUSE_RESUME, ({ roomId }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.isPaused = !r.isPaused; addToFeed(r, r.isPaused ? "⏸ Paused" : "▶ Resumed", 'INFO'); broadcastState(roomId); if(!r.isPaused && r.auctionStatus === 'IDLE') nextPlayerLoop(r, roomId); }});
    socket.on(EVENTS.CHANGE_TIMER, ({ roomId, seconds }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.config.defaultTimer = parseInt(seconds); addToFeed(r, `⚙️ Timer: ${seconds}s`, 'INFO'); broadcastState(roomId); }});
    socket.on(EVENTS.SOLD, ({ roomId, teamName, price }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.currentBidder=teamName; r.currentBid=price; if(r.timerInterval) clearInterval(r.timerInterval); resolveRound(r, roomId); }});
    socket.on(EVENTS.UNSOLD, ({ roomId }) => { const r = rooms[roomId]; if(r && r.hostId === socket.id) { r.currentBidder=null; if(r.timerInterval) clearInterval(r.timerInterval); resolveRound(r, roomId); }});
    socket.on(EVENTS.PLAYER_READY, ({ roomId }) => { const r = rooms[roomId]; if(r) { const u = r.connectedUsers.find(x => x.id === socket.id); if(u) { u.isReady = !u.isReady; broadcastState(roomId); }}});
    
    // Updated Custom Team to also store OwnerName
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
    socket.on(EVENTS.NAVIGATE, ({ roomId, page }) => { if(rooms[roomId]) { rooms[roomId].currentPage = page; broadcastState(roomId); }});
    socket.on(EVENTS.UPDATE_SETTINGS, ({ roomId, config }) => { const r = rooms[roomId]; if(r) { r.config = config; r.activeTeams.forEach(t => t.budget = parseFloat(config.budget)); broadcastState(roomId); }});
}

module.exports = { handleGameEvents };