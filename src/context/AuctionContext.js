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
        // Attempt to join
        newSocket.emit('JOIN_ROOM', { roomId, userName, isHost });
      }
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // MAIN LISTENER
    newSocket.on('STATE_UPDATE', (serverState) => {
      // 1. CONFIRM ROOM JOIN (This fixes the bug)
      if (serverState.roomId) {
          setRoomId(serverState.roomId);
          // Only save session if join was successful
          const currentUser = serverState.connectedUsers.find(u => u.id === newSocket.id);
          if(currentUser) {
              localStorage.setItem(SESSION_KEY, JSON.stringify({ 
                  roomId: serverState.roomId, 
                  userName: currentUser.name, 
                  isHost: currentUser.isHost 
              }));
              setIsHost(currentUser.isHost);
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

    // ERROR HANDLING
    newSocket.on('ERROR_MSG', (msg) => {
      alert(`⚠️ ${msg}`);
      
      // If Room Invalid -> Clear Everything
      if (msg === "Room does not exist.") {
        localStorage.removeItem(SESSION_KEY);
        setRoomId(null); // Go back to Landing
        setCurrentPage('landing');
        window.history.replaceState({}, document.title, "/");
      }
    });

    return () => newSocket.close();
  }, []);

  // --- ACTIONS ---

  const joinGame = (code, name, host = false) => {
    if (!socket) return;
    
    // CHANGE: We DO NOT setRoomId here. We wait for server response.
    // setRoomId(code); <--- REMOVED
    // setIsHost(host); <--- REMOVED
    
    socket.emit('JOIN_ROOM', { roomId: code, userName: name, isHost: host });
  };

  const leaveGame = () => {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "/"; 
  };

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

  const sellPlayer = (player, teamName, soldPrice) => socket?.emit('SOLD', { roomId, teamName, price: soldPrice });
  const markUnsold = (player) => socket?.emit('UNSOLD', { roomId });
  const startReveal = (player) => {}; 

  const resetGame = () => window.location.reload(); 
  const navigateTo = (page) => socket?.emit('NAVIGATE', { roomId, page });
  
  const canFinishAuction = () => activeTeams.every(team => team.squad && team.squad.length >= config.minPlayers);

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
      addPlayerToSet, deletePlayerFromSet,
      
      startAutoLoop, pauseGame, placeBid, withdrawBid, requestTime, changeTimer,
      voteFinish, endRoom,
      
      sellPlayer, markUnsold, startReveal,
      resetGame, setCurrentPage: navigateTo, canFinishAuction
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);