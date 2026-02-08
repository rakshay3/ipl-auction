import React, { createContext, useState, useContext, useEffect } from 'react';
import { io } from 'socket.io-client';

const AuctionContext = createContext();

const SOCKET_URL = 'http://localhost:4000'; 

export const AuctionProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // STATE
  const [roomId, setRoomId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
  // Game Data
  const [config, setConfig] = useState({ budget: 100, minPlayers: 15, maxPlayers: 25, maxForeign: 8 });
  const [activeTeams, setActiveTeams] = useState([]);
  const [customTeams, setCustomTeams] = useState([]); 
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [playerSets, setPlayerSets] = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  
  // Auction Status
  const [currentAuctionState, setCurrentAuctionState] = useState({
    currentPlayer: null,
    currentBid: 0,
    currentBidder: null,
    timer: 60,
    status: 'IDLE'
  });

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🟢 Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => setIsConnected(false));

    // MAIN LISTENER
    newSocket.on('STATE_UPDATE', (serverState) => {
      // console.log("📥 Update:", serverState);
      
      if(serverState.config) setConfig(serverState.config);
      if(serverState.activeTeams) setActiveTeams(serverState.activeTeams);
      if(serverState.customTeams) setCustomTeams(serverState.customTeams); // <--- SYNC
      if(serverState.connectedUsers) setConnectedUsers(serverState.connectedUsers);
      if(serverState.playerSets) setPlayerSets(serverState.playerSets);
      if(serverState.unsoldPlayers) setUnsoldPlayers(serverState.unsoldPlayers);
      if(serverState.currentPage) setCurrentPage(serverState.currentPage);
      
      setCurrentAuctionState({
        currentPlayer: serverState.currentPlayer,
        currentBid: serverState.currentBid,
        currentBidder: serverState.currentBidder,
        timer: serverState.timer,
        status: serverState.auctionStatus
      });
    });

    newSocket.on('ERROR_MSG', (msg) => alert(`⚠️ ${msg}`));

    return () => newSocket.close();
  }, []);

  // --- ACTIONS ---

  const joinGame = (code, name, host = false) => {
    if (!socket) return;
    setRoomId(code);
    setIsHost(host);
    socket.emit('JOIN_ROOM', { roomId: code, userName: name, isHost: host });
  };

  const updateSettings = (newConfig) => {
    if(!socket) return;
    socket.emit('UPDATE_SETTINGS', { roomId, config: newConfig });
  };

  const claimTeam = (team) => {
    if(!socket) return;
    socket.emit('CLAIM_TEAM', { roomId, team });
  };

  const addCustomTeam = (team) => {
    if(!socket) return;
    socket.emit('ADD_CUSTOM_TEAM', { roomId, team });
  };

  const startGame = () => {
    if(!socket) return;
    socket.emit('START_GAME', { roomId });
  };

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

  const startReveal = (player) => socket.emit('START_TIMER', { roomId, player });
  const sellPlayer = (player, teamName, soldPrice) => socket.emit('SOLD', { roomId, teamName, price: soldPrice });
  const markUnsold = (player) => socket.emit('UNSOLD', { roomId });
  const navigateTo = (page) => socket.emit('NAVIGATE', { roomId, page });
  const toggleReady = () => {
    if(!socket) return;
    socket.emit('PLAYER_READY', { roomId });
    };
  const startAuction = () => {
    if(!socket) return;
    socket.emit('START_AUCTION', { roomId });
  };

  const addPlayerToSet = (setIndex, player) => {
    if(!socket) return;
    socket.emit('ADD_PLAYER', { roomId, setIndex, player });
  };

  const deletePlayerFromSet = (setIndex, playerId) => {
    if(!socket) return;
    socket.emit('DELETE_PLAYER', { roomId, setIndex, playerId });
  };
  // Mocks
  const placeBid = (amount) => socket.emit('BID', { roomId, teamName: "MY_TEAM", amount }); 
  const resetGame = () => window.location.reload(); 
  const hasSavedGame = () => false; 
  const deleteSet = () => {};
  const canFinishAuction = () => activeTeams.every(team => team.squad && team.squad.length >= config.minPlayers);
  const startUnsoldRound = () => {};

  return (
    <AuctionContext.Provider value={{
      socket, isConnected, roomId, isHost, connectedUsers,
      config, activeTeams, customTeams, playerSets, unsoldPlayers, // Added customTeams
      currentPage, currentSetIndex, setCurrentSetIndex,
      currentAuctionState,
      
      joinGame, updateSettings, claimTeam, addCustomTeam, startGame,
      importPlayersBulk, sellPlayer, markUnsold, startReveal, placeBid,toggleReady,
      resetGame, hasSavedGame, setCurrentPage: navigateTo,startAuction,addPlayerToSet,
      canFinishAuction, startUnsoldRound, deletePlayerFromSet, deleteSet
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);