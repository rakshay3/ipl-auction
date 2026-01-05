import React, { createContext, useState, useContext, useEffect } from 'react';
import { initialPlayerSets } from '../data/initialPlayers';

const AuctionContext = createContext();

export const AuctionProvider = ({ children }) => {
  // --- LOAD STATE FROM LOCAL STORAGE OR DEFAULT ---
  const loadState = (key, fallback) => {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  };

  const [config, setConfig] = useState(() => loadState('ipl_config', {
    budget: 10000, minPlayers: 15, maxPlayers: 25, maxForeign: 8
  }));

  const [activeTeams, setActiveTeams] = useState(() => loadState('ipl_activeTeams', []));
  const [playerSets, setPlayerSets] = useState(() => loadState('ipl_playerSets', initialPlayerSets));
  const [unsoldPlayers, setUnsoldPlayers] = useState(() => loadState('ipl_unsoldPlayers', []));
  const [currentPage, setCurrentPage] = useState(() => loadState('ipl_currentPage', 'landing'));
  
  // Track current set index
  const [currentSetIndex, setCurrentSetIndex] = useState(() => loadState('ipl_setIndex', 0));

  // --- AUTO-SAVE EFFECT ---
  useEffect(() => {
    localStorage.setItem('ipl_config', JSON.stringify(config));
    localStorage.setItem('ipl_activeTeams', JSON.stringify(activeTeams));
    localStorage.setItem('ipl_playerSets', JSON.stringify(playerSets));
    localStorage.setItem('ipl_unsoldPlayers', JSON.stringify(unsoldPlayers));
    localStorage.setItem('ipl_currentPage', JSON.stringify(currentPage));
    localStorage.setItem('ipl_setIndex', JSON.stringify(currentSetIndex));
  }, [config, activeTeams, playerSets, unsoldPlayers, currentPage, currentSetIndex]);

  // --- ACTIONS ---

  // Check if a saved game exists
  const hasSavedGame = () => {
    return localStorage.getItem('ipl_activeTeams') !== null && 
           JSON.parse(localStorage.getItem('ipl_activeTeams')).length > 0;
  };

  // Reset Game
  const resetGame = () => {
    localStorage.clear();
    // Force reload to clear all states cleanly
    window.location.reload();
  };

  const initializeGame = (teamsData, customConfig) => {
    setConfig(customConfig);
    const teamsObj = teamsData.map(t => ({
      ...t,
      budget: parseFloat(customConfig.budget),
      spent: 0,
      squad: [],
      foreignCount: 0
    }));
    setActiveTeams(teamsObj);
    setCurrentPage('review');
  };

  const addPlayerToSet = (setIndex, newPlayer) => {
    const updatedSets = [...playerSets];
    updatedSets[setIndex].players.push(newPlayer);
    setPlayerSets(updatedSets);
  };

  const deletePlayerFromSet = (setIndex, playerId) => {
    const updatedSets = [...playerSets];
    updatedSets[setIndex].players = updatedSets[setIndex].players.filter(p => p.id !== playerId);
    setPlayerSets(updatedSets);
  };

  const sellPlayer = (player, teamName, soldPrice) => {
    const updatedTeams = activeTeams.map(team => {
      if (team.name === teamName) {
        return {
          ...team,
          budget: team.budget - parseFloat(soldPrice),
          spent: team.spent + parseFloat(soldPrice),
          squad: [...team.squad, { ...player, soldPrice: parseFloat(soldPrice) }],
          foreignCount: player.isForeign ? team.foreignCount + 1 : team.foreignCount
        };
      }
      return team;
    });
    setActiveTeams(updatedTeams);
    removePlayerFromSet(player.id);
  };

  const markUnsold = (player) => {
    setUnsoldPlayers([...unsoldPlayers, player]);
    removePlayerFromSet(player.id);
  };

  const removePlayerFromSet = (playerId) => {
    const updatedSets = playerSets.map(set => ({
      ...set,
      players: set.players.filter(p => p.id !== playerId)
    })).filter(set => set.players.length > 0);
    setPlayerSets(updatedSets);
  };

  const startUnsoldRound = () => {
    if (unsoldPlayers.length === 0) return false;
    const unsoldSet = { setName: "Re-Auction: Unsold Players", players: [...unsoldPlayers] };
    setPlayerSets([unsoldSet]);
    setUnsoldPlayers([]);
    return true;
  };

  const canFinishAuction = () => {
    if (activeTeams.length === 0) return false;
    return activeTeams.every(team => team.squad.length >= config.minPlayers);
  };

  return (
    <AuctionContext.Provider value={{
      config, setConfig,
      activeTeams, setActiveTeams,
      playerSets, setPlayerSets,
      unsoldPlayers,
      currentPage, setCurrentPage,
      currentSetIndex, setCurrentSetIndex, // Now exposed
      initializeGame, 
      addPlayerToSet, deletePlayerFromSet,
      sellPlayer, markUnsold,
      startUnsoldRound, canFinishAuction,
      resetGame, hasSavedGame // New Utils
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);