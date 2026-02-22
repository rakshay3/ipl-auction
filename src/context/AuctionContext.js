import React, { createContext, useState, useContext, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuctionContext = createContext();

const SOCKET_URL = 'http://localhost:4000';
const SESSION_KEY = 'ipl_auction_session_v2';

export const AuctionProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // STATE
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
  // Game Data
  const [config, setConfig] = useState({ budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8, defaultTimer: 60 });
  const [activeTeams, setActiveTeams] = useState([]);
  const [customTeams, setCustomTeams] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [playerSets, setPlayerSets] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [feed, setFeed] = useState([]);
  const [finishVotes, setFinishVotes] = useState([]);
  
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  const [currentAuctionState, setCurrentAuctionState] = useState({
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    timer: 60,
    status: 'IDLE',
    activeBidders: [],
    isPaused: false
  });

  const [fastAuctionVotes, setFastAuctionVotes] = useState([]);
  const [aggregatedShortlist, setAggregatedShortlist] = useState([]);
  const [teamShortlists, setTeamShortlists] = useState({});

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🟢 Connected:', newSocket.id);
      setIsConnected(true);
      
      // AUTO-RECONNECT LOGIC
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const { roomId, userName, isHost } = JSON.parse(savedSession);
        console.log(`🔄 Attempting auto-reconnect for ${userName}`);
        
        // IMPORTANT: We do NOT send 'create: true' here. 
        // If the server restarted, this MUST fail so we can clear storage.
        newSocket.emit('JOIN_ROOM', { roomId, userName, isHost, create: false });
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // MAIN LISTENER
    newSocket.on('STATE_UPDATE', (serverState) => {
      // Confirm Room Join
      if (serverState.roomId) {
          setRoomId(serverState.roomId);
          
          // Identify self to verify Host status
          const me = serverState.connectedUsers.find(u => u.id === newSocket.id);
          if (me) {
              setIsHost(me.isHost);
              // Save validated session
              localStorage.setItem(SESSION_KEY, JSON.stringify({ 
                  roomId: serverState.roomId, 
                  userName: me.name, 
                  isHost: me.isHost 
              }));
          }
      }

      if(serverState.config) setConfig(serverState.config);
      if(serverState.activeTeams) setActiveTeams(serverState.activeTeams);
      if(serverState.customTeams) setCustomTeams(serverState.customTeams);
      if(serverState.connectedUsers) setConnectedUsers(serverState.connectedUsers);
      if(serverState.playerSets) setPlayerSets(serverState.playerSets);
      if(serverState.unsoldPlayers) setUnsoldPlayers(serverState.unsoldPlayers);
      if(serverState.feed) setFeed(serverState.feed);
      if(serverState.finishVotes) setFinishVotes(serverState.finishVotes);
      if(serverState.currentPage) setCurrentPage(serverState.currentPage);
      if(serverState.currentSetIndex !== undefined) setCurrentSetIndex(serverState.currentSetIndex);
      if(serverState.fastAuctionVotes) setFastAuctionVotes(serverState.fastAuctionVotes);
      if(serverState.aggregatedShortlist) setAggregatedShortlist(serverState.aggregatedShortlist);
      if(serverState.teamShortlists) setTeamShortlists(serverState.teamShortlists);
      
      setCurrentAuctionState({
        currentPlayer: serverState.currentPlayer,
        currentBid: serverState.currentBid,
        currentBidder: serverState.currentBidder,
        timer: serverState.timer,
        status: serverState.auctionStatus,
        activeBidders: serverState.activeBidders || [],
        isPaused: serverState.isPaused || false
      });
    });

    // ERROR HANDLING & SESSION WIPING
    newSocket.on('ERROR_MSG', (msg) => {
      alert(`⚠️ Error: ${msg}`);
      // Handle Invalid Room (Server Restarted or Wrong Code)
      if (msg === "Room does not exist.") {
        console.warn("❌ Session Invalid: Room not found. Clearing storage.");
        localStorage.removeItem(SESSION_KEY); // Wipe storage
        setRoomId(null);
        setCurrentPage('landing');
        window.history.replaceState({}, document.title, "/"); // Clear URL params
      } else {
        alert(`⚠️ ${msg}`);
      }
    });

    return () => newSocket.close();
  }, []);

  // --- ACTIONS ---

  const joinGame = (code, name, host = false) => {
    if (!socket) return;
    // STARTING NEW GAME: We send 'create: true' ONLY if we are the host starting fresh
    const isCreating = host; 
    socket.emit('JOIN_ROOM', { roomId: code, userName: name, isHost: host, create: isCreating });
  };

  const leaveGame = () => {
      console.log("🚪 Leaving Game...");
      localStorage.removeItem(SESSION_KEY); // 1. Clear Storage
      setRoomId(null); // 2. Clear State
      if(socket) socket.disconnect(); // 3. Kill Socket
      window.location.href = "/"; // 4. Hard Refresh
  };

  // ... (Keep all other actions exactly the same) ...
  const updateSettings = (newConfig) => socket?.emit('UPDATE_SETTINGS', { roomId, config: newConfig });
  const claimTeam = (team) => socket?.emit('CLAIM_TEAM', { roomId, team });
  const addCustomTeam = (team) => socket?.emit('ADD_CUSTOM_TEAM', { roomId, team });
  const startGame = () => socket?.emit('START_GAME', { roomId });
  const importPlayersBulk = (entries) => {
    const updatedSets = [];
    entries.forEach(entry => {
      const { targetSetName, player } = entry;
      let setIndex = updatedSets.findIndex(s => s.setName.toLowerCase() === targetSetName.toLowerCase());
      if (setIndex !== -1) updatedSets[setIndex].players.push(player);
      else updatedSets.push({ setName: targetSetName, players: [player] });
    });
    socket.emit('UPLOAD_DATA', { roomId, sets: updatedSets });
  };
  const toggleReady = () => socket?.emit('PLAYER_READY', { roomId });
  const startAuction = () => socket?.emit('START_AUCTION', { roomId });
  const addPlayerToSet = (setIndex, player) => socket?.emit('ADD_PLAYER', { roomId, setIndex, player });
  const deletePlayerFromSet = (setIndex, playerId) => socket?.emit('DELETE_PLAYER', { roomId, setIndex, playerId });
  const startAutoLoop = () => socket?.emit('START_TIMER', { roomId });
  const pauseGame = () => socket?.emit('PAUSE_RESUME', { roomId });
  const placeBid = (amount) => socket?.emit('BID', { roomId, amount });
  const withdrawBid = () => socket?.emit('WITHDRAW', { roomId });
  const requestTime = () => socket?.emit('NEED_TIME', { roomId });
  const changeTimer = (seconds) => socket?.emit('CHANGE_TIMER', { roomId, seconds });
  const voteFinish = () => socket?.emit('VOTE_FINISH', { roomId });
  const endRoom = () => socket?.emit('END_ROOM', { roomId }); 
  const startReveal = (player) => {}; 
  const resetGame = () => window.location.reload(); 
  const navigateTo = (page) => socket?.emit('NAVIGATE', { roomId, page });
  const canFinishAuction = () => activeTeams.every(team => team.squad && team.squad.length >= config.minPlayers);
  const deleteSet = (setIndex) => socket?.emit('DELETE_SET', { roomId, setIndex });
  const sendMessage = (message) => socket?.emit('MESSAGE', { roomId, message });
  const voteFastAuction = () => socket?.emit('VOTE_FAST_AUCTION', { roomId });
  const submitShortlist = (playerIds) => socket?.emit('SUBMIT_SHORTLIST', { roomId, playerIds });
  const confirmFastAuction = () => socket?.emit('CONFIRM_FAST_AUCTION', { roomId });
  return (
    <AuctionContext.Provider value={{
      socket, isConnected, roomId, isHost,
      config, activeTeams, customTeams, connectedUsers, 
      playerSets, unsoldPlayers, feed, finishVotes,
      currentPage, currentSetIndex, setCurrentSetIndex,
      currentAuctionState,
      
      joinGame, leaveGame,
      updateSettings, claimTeam, addCustomTeam, startGame,
      importPlayersBulk, toggleReady, startAuction,
      addPlayerToSet, deletePlayerFromSet,deleteSet,
      
      startAutoLoop, pauseGame, placeBid, withdrawBid, requestTime, changeTimer,
      voteFinish, endRoom,
      
      startReveal,
      resetGame, setCurrentPage: navigateTo, canFinishAuction, sendMessage,
      fastAuctionVotes, aggregatedShortlist, teamShortlists,
      voteFastAuction, submitShortlist, confirmFastAuction
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);