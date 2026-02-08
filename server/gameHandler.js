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
    // Review Phase Events
    ADD_PLAYER: 'ADD_PLAYER',       
    DELETE_PLAYER: 'DELETE_PLAYER',
    
    // Ready Logic
    PLAYER_READY: 'PLAYER_READY',  
    START_AUCTION: 'START_AUCTION', 
     
    NAVIGATE: 'NAVIGATE',
    START_TIMER: 'START_TIMER',
    BID: 'BID',
    SOLD: 'SOLD',
    UNSOLD: 'UNSOLD'
};

const INITIAL_STATE = {
    roomId: null,
    hostId: null,
    config: { budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8 },
    activeTeams: [],
    customTeams: [], // <--- NEW: Sync custom teams across clients
    connectedUsers: [],
    playerSets: [],
    unsoldPlayers: [],
    currentPage: 'landing', 
    
    // Auction Data
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    timer: 60,
    auctionStatus: 'IDLE'
};

function handleGameEvents(io, socket, rooms) {

    const broadcastState = (roomId) => {
        if(rooms[roomId]) {
            // console.log(`📡 Broadcasting State to ${roomId}`);
            io.to(roomId).emit(EVENTS.UPDATE, rooms[roomId]);
        }
    };

    // 1. JOIN
    socket.on(EVENTS.JOIN, ({ roomId, userName, isHost }) => {
        console.log(`👤 User ${userName} joining ${roomId}`);
        socket.join(roomId);

        if (!rooms[roomId]) {
            if (isHost) {
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
        
        // Update Host ID if they reconnect (Optional: Simple logic for now)
        if(isHost) room.hostId = socket.id;

        // Add to connected users
        if(!room.connectedUsers.find(u => u.id === socket.id)) {
            room.connectedUsers.push({ id: socket.id, name: userName, isHost, isReady: isHost });
        }

        broadcastState(roomId);
    });
    //Toggle Ready State (For Host to see when players are ready)
    socket.on(EVENTS.PLAYER_READY, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;

        const user = room.connectedUsers.find(u => u.id === socket.id);
        if(user) {
            user.isReady = !user.isReady; // Toggle
            broadcastState(roomId);
        }
    });

    // 2. SETTINGS
    socket.on(EVENTS.UPDATE_SETTINGS, ({ roomId, config }) => {
        const room = rooms[roomId];
        if(!room) return;
        
        // console.log(`⚙️ Settings Update:`, config);
        room.config = config;
        
        // Update budgets for existing teams to match new setting
        room.activeTeams.forEach(t => {
            t.budget = parseFloat(config.budget);
        });
        
        broadcastState(roomId);
    });

    // 3. CLAIM TEAM
    socket.on(EVENTS.CLAIM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId];
        if(!room) {
            console.error(`❌ Claim Team Failed: Room ${roomId} not found`);
            return;
        }

        console.log(`🖐 Team Claimed: ${team.name} by ${socket.id}`);

        // Check if taken by SOMEONE ELSE
        const isTaken = room.activeTeams.find(t => t.id === team.id && t.ownerId !== socket.id);
        if(isTaken) {
            socket.emit(EVENTS.ERROR, "Team already taken!");
            return;
        }

        // Remove previous team owned by this socket (Switching teams)
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id);

        // Add New Team
        room.activeTeams.push({
            ...team,
            ownerId: socket.id,
            budget: parseFloat(room.config.budget),
            spent: 0,
            squad: [],
            foreignCount: 0
        });

        broadcastState(roomId);
    });

    // 4. ADD CUSTOM TEAM (NEW)
    socket.on(EVENTS.ADD_CUSTOM_TEAM, ({ roomId, team }) => {
        const room = rooms[roomId];
        if(!room) return;

        console.log(`🎨 New Custom Team: ${team.name}`);
        room.customTeams.push(team);
        
        // Auto-claim it for the creator
        // (We reuse the claim logic but need to do it manually here to avoid double broadcast)
        room.activeTeams = room.activeTeams.filter(t => t.ownerId !== socket.id);
        room.activeTeams.push({
            ...team,
            ownerId: socket.id,
            budget: parseFloat(room.config.budget),
            spent: 0,
            squad: [],
            foreignCount: 0
        });

        broadcastState(roomId);
    });

    // 5. START GAME
    socket.on(EVENTS.START_GAME, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room) return;

        if(room.activeTeams.length < 2) {
             socket.emit(EVENTS.ERROR, "Need at least 2 teams to start!");
             return;
        }
        
        console.log(`🚀 Game Started in ${roomId}`);
        room.currentPage = 'selection';
        broadcastState(roomId);
    });
// 6. MODIFY PLAYER SETS (Host Only)
    socket.on(EVENTS.ADD_PLAYER, ({ roomId, setIndex, player }) => {
        const room = rooms[roomId];
        if(!room || !room.playerSets[setIndex]) return;
        
        room.playerSets[setIndex].players.push(player);
        broadcastState(roomId);
    });

    socket.on(EVENTS.DELETE_PLAYER, ({ roomId, setIndex, playerId }) => {
        const room = rooms[roomId];
        if(!room || !room.playerSets[setIndex]) return;
        
        room.playerSets[setIndex].players = room.playerSets[setIndex].players.filter(p => p.id !== playerId);
        broadcastState(roomId);
    });

    // 7. START AUCTION (Moves from Review -> Auction)
    socket.on(EVENTS.START_AUCTION, ({ roomId }) => {
        const room = rooms[roomId];
        if(!room || room.hostId !== socket.id) return;
        // CHECK: Are all users ready?
        const unreadyUsers = room.connectedUsers.filter(u => !u.isReady);
        if(unreadyUsers.length > 0) {
            socket.emit(EVENTS.ERROR, `Wait! ${unreadyUsers.length} users are not ready.`);
            return;
        }
        console.log(`🔨 Auction Started in ${roomId}`);
        room.currentPage = 'auction';
        broadcastState(roomId);
    });

    // --- GAMEPLAY HANDLERS ---
    
    socket.on(EVENTS.UPLOAD_DATA, ({ roomId, sets }) => {
        if(rooms[roomId]) {
            console.log(`📂 Data Uploaded for Room ${roomId}`);
            rooms[roomId].playerSets = sets;
            rooms[roomId].currentPage = 'review';
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.NAVIGATE, ({ roomId, page }) => {
        if(rooms[roomId]) {
            rooms[roomId].currentPage = page;
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.START_TIMER, ({ roomId, player }) => {
        const room = rooms[roomId];
        if(!room) return;
        room.currentPlayer = player;
        room.currentBid = player.basePrice;
        room.currentBidder = null;
        room.auctionStatus = 'REVEALED';
        room.timer = 60;
        broadcastState(roomId);
    });

    socket.on(EVENTS.BID, ({ roomId, teamName, amount }) => {
        const room = rooms[roomId];
        if(room && amount > room.currentBid) {
            room.currentBid = amount;
            room.currentBidder = teamName;
            room.timer = 60; 
            broadcastState(roomId);
        }
    });

    socket.on(EVENTS.SOLD, ({ roomId, teamName, price }) => {
        const room = rooms[roomId];
        if(!room || !room.currentPlayer) return;
        
        const player = { ...room.currentPlayer, soldPrice: parseFloat(price) };
        const team = room.activeTeams.find(t => t.name === teamName);
        if(team) {
            team.budget -= player.soldPrice;
            team.spent += player.soldPrice;
            team.squad.push(player);
            if(player.isForeign) team.foreignCount++;
        }
        
        room.playerSets.forEach(s => {
            s.players = s.players.filter(p => p.id !== player.id);
        });
        room.playerSets = room.playerSets.filter(s => s.players.length > 0);

        room.currentPlayer = null;
        room.auctionStatus = 'IDLE';
        broadcastState(roomId);
    });

    socket.on(EVENTS.UNSOLD, ({ roomId }) => {
        const room = rooms[roomId];
        if(room && room.currentPlayer) {
            room.unsoldPlayers.push(room.currentPlayer);
            room.playerSets.forEach(s => {
                s.players = s.players.filter(p => p.id !== room.currentPlayer.id);
            });
            room.currentPlayer = null;
            room.auctionStatus = 'IDLE';
            broadcastState(roomId);
        }
    });
}

module.exports = { handleGameEvents };