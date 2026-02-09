import React, { createContext, useState, useContext, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuctionContext = createContext();

const SOCKET_URL = 'http://localhost:4000'; 

export const AuctionProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // --- GLOBAL ROOM STATE ---
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [config, setConfig] = useState({ budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8, defaultTimer: 60 });
  
  // Lists
  const [activeTeams, setActiveTeams] = useState([]);
  const [customTeams, setCustomTeams] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [playerSets, setPlayerSets] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [feed, setFeed] = useState([]); // <--- NEW: Chat/Event Log
  const [finishVotes, setFinishVotes] = useState([]); // <--- NEW: Finish Consensus
  
  // Navigation
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  // --- LIVE AUCTION STATE ---
  const [currentAuctionState, setCurrentAuctionState] = useState({
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    timer: 60,
    status: 'IDLE',
    activeBidders: [], // Default to empty array to prevent crash
    isPaused: false
  });

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🟢 Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // --- MAIN EVENT LISTENER ---
    newSocket.on('STATE_UPDATE', (serverState) => {
      
      // 1. Global Data
      if(serverState.config) setConfig(serverState.config);
      if(serverState.activeTeams) setActiveTeams(serverState.activeTeams);
      if(serverState.customTeams) setCustomTeams(serverState.customTeams);
      if(serverState.connectedUsers) setConnectedUsers(serverState.connectedUsers);
      if(serverState.playerSets) setPlayerSets(serverState.playerSets);
      if(serverState.unsoldPlayers) setUnsoldPlayers(serverState.unsoldPlayers);
      
      // 2. New Features
      if(serverState.feed) setFeed(serverState.feed);
      if(serverState.finishVotes) setFinishVotes(serverState.finishVotes);

      // 3. Navigation
      if(serverState.currentPage) setCurrentPage(serverState.currentPage);
      if(serverState.currentSetIndex !== undefined) setCurrentSetIndex(serverState.currentSetIndex);
      
      // 4. Live Auction Data (Grouped)
      setCurrentAuctionState({
        currentPlayer: serverState.currentPlayer,
        currentBid: serverState.currentBid,
        currentBidder: serverState.currentBidder,
        timer: serverState.timer,
        status: serverState.auctionStatus,
        activeBidders: serverState.activeBidders || [], // Safety Fallback
        isPaused: serverState.isPaused || false
      });
    });

    newSocket.on('ERROR_MSG', (msg) => alert(`⚠️ ${msg}`));

    return () => newSocket.close();
  }, []);

  // --- ACTIONS ---

  // Setup & Lobby
  const joinGame = (code, name, host = false) => {
    if (!socket) return;
    setRoomId(code);
    setIsHost(host);
    socket.emit('JOIN_ROOM', { roomId: code, userName: name, isHost: host });
  };

  const updateSettings = (newConfig) => socket?.emit('UPDATE_SETTINGS', { roomId, config: newConfig });
  const claimTeam = (team) => socket?.emit('CLAIM_TEAM', { roomId, team });
  const addCustomTeam = (team) => socket?.emit('ADD_CUSTOM_TEAM', { roomId, team });
  const startGame = () => socket?.emit('START_GAME', { roomId });
  
  // Data Loading
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

  // Review Phase
  const toggleReady = () => socket?.emit('PLAYER_READY', { roomId });
  const startAuction = () => socket?.emit('START_AUCTION', { roomId });
  const addPlayerToSet = (setIndex, player) => socket?.emit('ADD_PLAYER', { roomId, setIndex, player });
  const deletePlayerFromSet = (setIndex, playerId) => socket?.emit('DELETE_PLAYER', { roomId, setIndex, playerId });

  // Live Auction Controls
  const startAutoLoop = () => socket?.emit('START_TIMER', { roomId }); // Now triggers the auto-loop
  const pauseGame = () => socket?.emit('PAUSE_RESUME', { roomId });
  const placeBid = (amount) => socket?.emit('BID', { roomId, amount });
  const withdrawBid = () => socket?.emit('WITHDRAW', { roomId });
  const requestTime = () => socket?.emit('NEED_TIME', { roomId });
  const changeTimer = (seconds) => socket?.emit('CHANGE_TIMER', { roomId, seconds });

  // Finish Logic
  const voteFinish = () => socket?.emit('VOTE_FINISH', { roomId });

  // Host Overrides / Helpers
  const sellPlayer = (player, teamName, soldPrice) => {if(!socket) return; socket.emit('SOLD', { roomId, teamName, price: soldPrice });}; // Deprecated in V2 Auto-Loop, but kept for legacy props
  const markUnsold = (player) => {if(!socket) return; socket.emit('UNSOLD', { roomId });}; // Deprecated
  const startReveal = (player) => {}; // Deprecated

  const resetGame = () => window.location.reload(); 
  const navigateTo = (page) => socket?.emit('NAVIGATE', { roomId, page });
  
  // Derived State Helpers
  const canFinishAuction = () => activeTeams.every(team => team.squad && team.squad.length >= config.minPlayers);
// Finish Logic
  const endRoom = () => socket?.emit('END_ROOM', { roomId });
  return (
    <AuctionContext.Provider value={{
      // Data
      socket, isConnected, roomId, isHost,
      config, activeTeams, customTeams, connectedUsers, 
      playerSets, unsoldPlayers, feed, finishVotes,
      currentPage, currentSetIndex, setCurrentSetIndex,
      currentAuctionState,
      
      // Actions
      joinGame, updateSettings, claimTeam, addCustomTeam, startGame,
      importPlayersBulk, toggleReady, startAuction,
      addPlayerToSet, deletePlayerFromSet,endRoom,
      
      startAutoLoop, pauseGame, placeBid, withdrawBid, requestTime, changeTimer,
      voteFinish,
      
      // Legacy / Utils
      sellPlayer, markUnsold, startReveal,
      resetGame, setCurrentPage: navigateTo, canFinishAuction
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);