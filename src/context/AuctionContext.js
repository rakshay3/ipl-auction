// both user-csv and user manual player additions


// import React, { createContext, useState, useContext, useEffect } from 'react';
// import { initialPlayerSets } from '../data/initialPlayers';

// const AuctionContext = createContext();

// export const AuctionProvider = ({ children }) => {
//   // --- LOAD STATE FROM LOCAL STORAGE OR DEFAULT ---
//   const loadState = (key, fallback) => {
//     const saved = localStorage.getItem(key);
//     return saved ? JSON.parse(saved) : fallback;
//   };

//   const [config, setConfig] = useState(() => loadState('ipl_config', {
//     budget: 10000, minPlayers: 15, maxPlayers: 25, maxForeign: 8
//   }));

//   const [activeTeams, setActiveTeams] = useState(() => loadState('ipl_activeTeams', []));
//   const [playerSets, setPlayerSets] = useState(() => loadState('ipl_playerSets', initialPlayerSets));
//   const [unsoldPlayers, setUnsoldPlayers] = useState(() => loadState('ipl_unsoldPlayers', []));
//   const [currentPage, setCurrentPage] = useState(() => loadState('ipl_currentPage', 'landing'));
  
//   // Track current set index
//   const [currentSetIndex, setCurrentSetIndex] = useState(() => loadState('ipl_setIndex', 0));

//   // --- AUTO-SAVE EFFECT ---
//   useEffect(() => {
//     localStorage.setItem('ipl_config', JSON.stringify(config));
//     localStorage.setItem('ipl_activeTeams', JSON.stringify(activeTeams));
//     localStorage.setItem('ipl_playerSets', JSON.stringify(playerSets));
//     localStorage.setItem('ipl_unsoldPlayers', JSON.stringify(unsoldPlayers));
//     localStorage.setItem('ipl_currentPage', JSON.stringify(currentPage));
//     localStorage.setItem('ipl_setIndex', JSON.stringify(currentSetIndex));
//   }, [config, activeTeams, playerSets, unsoldPlayers, currentPage, currentSetIndex]);

//   // --- ACTIONS ---

//   // Check if a saved game exists
//   const hasSavedGame = () => {
//     return localStorage.getItem('ipl_activeTeams') !== null && 
//            JSON.parse(localStorage.getItem('ipl_activeTeams')).length > 0;
//   };

//   // Reset Game
//   const resetGame = () => {
//     localStorage.clear();
//     // Force reload to clear all states cleanly
//     window.location.reload();
//   };

//   const initializeGame = (teamsData, customConfig) => {
//     setConfig(customConfig);
//     const teamsObj = teamsData.map(t => ({
//       ...t,
//       budget: parseFloat(customConfig.budget),
//       spent: 0,
//       squad: [],
//       foreignCount: 0
//     }));
//     setActiveTeams(teamsObj);
//     setCurrentPage('review');
//   };

//   const addPlayerToSet = (setIndex, newPlayer) => {
//     const updatedSets = [...playerSets];
//     updatedSets[setIndex].players.push(newPlayer);
//     setPlayerSets(updatedSets);
//   };

//   const deletePlayerFromSet = (setIndex, playerId) => {
//     const updatedSets = [...playerSets];
//     updatedSets[setIndex].players = updatedSets[setIndex].players.filter(p => p.id !== playerId);
//     setPlayerSets(updatedSets);
//   };

//   const sellPlayer = (player, teamName, soldPrice) => {
//     const updatedTeams = activeTeams.map(team => {
//       if (team.name === teamName) {
//         return {
//           ...team,
//           budget: team.budget - parseFloat(soldPrice),
//           spent: team.spent + parseFloat(soldPrice),
//           squad: [...team.squad, { ...player, soldPrice: parseFloat(soldPrice) }],
//           foreignCount: player.isForeign ? team.foreignCount + 1 : team.foreignCount
//         };
//       }
//       return team;
//     });
//     setActiveTeams(updatedTeams);
//     removePlayerFromSet(player.id);
//   };

//   const markUnsold = (player) => {
//     setUnsoldPlayers([...unsoldPlayers, player]);
//     removePlayerFromSet(player.id);
//   };

//   const removePlayerFromSet = (playerId) => {
//     const updatedSets = playerSets.map(set => ({
//       ...set,
//       players: set.players.filter(p => p.id !== playerId)
//     })).filter(set => set.players.length > 0);
//     setPlayerSets(updatedSets);
//   };

//   const startUnsoldRound = () => {
//     if (unsoldPlayers.length === 0) return false;
//     const unsoldSet = { setName: "Re-Auction: Unsold Players", players: [...unsoldPlayers] };
//     setPlayerSets([unsoldSet]);
//     setUnsoldPlayers([]);
//     return true;
//   };

//   const canFinishAuction = () => {
//     if (activeTeams.length === 0) return false;
//     return activeTeams.every(team => team.squad.length >= config.minPlayers);
//   };
// const importPlayersBulk = (importedPlayers) => {
//   // 1. Create a copy of current sets
//   const updatedSets = [...playerSets];

//   importedPlayers.forEach(entry => {
//     const { targetSetName, player } = entry;

//     // 2. Find the set that matches the CSV "Set Name"
//     let setIndex = updatedSets.findIndex(s => 
//       s.setName.toLowerCase().trim() === targetSetName.toLowerCase().trim()
//     );

//     // 3. If set exists, add player. If not, create a new Set.
//     if (setIndex !== -1) {
//       updatedSets[setIndex].players.push(player);
//     } else {
//       // Create new set dynamically
//       updatedSets.push({
//         setName: targetSetName,
//         players: [player]
//       });
//     }
//   });

//   // 4. Update State ONCE
//   setPlayerSets(updatedSets);
//   alert(`Imported ${importedPlayers.length} players successfully!`);
// };
//   return (
//     <AuctionContext.Provider value={{
//       config, setConfig,
//       activeTeams, setActiveTeams,
//       playerSets, setPlayerSets,
//       unsoldPlayers,
//       currentPage, setCurrentPage,
//       currentSetIndex, setCurrentSetIndex, // Now exposed
//       initializeGame, 
//       addPlayerToSet, deletePlayerFromSet,
//       sellPlayer, markUnsold,
//       startUnsoldRound, canFinishAuction,
//       resetGame, hasSavedGame, 
//       importPlayersBulk // New Utils
//     }}>
//       {children}
//     </AuctionContext.Provider>
//   );
// };

// export const useAuction = () => useContext(AuctionContext);


//loaded csv and user manual additions
import React, { createContext, useState, useContext, useEffect } from 'react';
import { initialPlayerSets } from '../data/initialPlayers'; // Keep this as a fallback structure

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
  
  // NOTE: We initialize with empty or saved. We will populate from CSV if empty.
  const [playerSets, setPlayerSets] = useState(() => loadState('ipl_playerSets', initialPlayerSets));
  
  const [unsoldPlayers, setUnsoldPlayers] = useState(() => loadState('ipl_unsoldPlayers', []));
  const [currentPage, setCurrentPage] = useState(() => loadState('ipl_currentPage', 'landing'));
  const [currentSetIndex, setCurrentSetIndex] = useState(() => loadState('ipl_setIndex', 0));

  // --- AUTO-LOAD CSV DATA ON START ---
  useEffect(() => {
    // Only load from CSV if we don't have saved data and playerSets is basically empty
    const hasData = playerSets.some(s => s.players.length > 0);
    
    if (!hasData) {
      console.log("Loading players from CSV...");
      fetch('/data/players.csv')
        .then(response => response.text())
        .then(csvText => {
          parseAndLoadCSV(csvText);
        })
        .catch(err => console.error("Failed to load CSV:", err));
    }
  }, []); // Run once on mount

  // Helper to parse the CSV text
  const parseAndLoadCSV = (csvText) => {
    const lines = csvText.split('\n');
    const newSets = [];

    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 4) {
        const name = parts[0]?.trim();
        const setName = parts[1]?.trim(); // Column 2 = Set Name
        const role = parts[2]?.trim();
        const country = parts[3]?.trim();
        const price = parseFloat(parts[4]?.trim()) || 20;
        const img = parts[5]?.trim() || "";

        if (!name || name.toLowerCase() === "name") return; // Skip header

        // Find if Set exists in our new list
        let setIndex = newSets.findIndex(s => s.setName.toLowerCase() === setName.toLowerCase());
        
        const newPlayer = {
          id: Date.now() + Math.random(),
          name, type: role, country,
          isForeign: country.toLowerCase() !== 'india',
          basePrice: price, img
        };

        if (setIndex !== -1) {
          newSets[setIndex].players.push(newPlayer);
        } else {
          newSets.push({ setName: setName, players: [newPlayer] });
        }
      }
    });

    if (newSets.length > 0) {
      setPlayerSets(newSets);
    }
  };

  // --- AUTO-SAVE EFFECT ---
  useEffect(() => {
    localStorage.setItem('ipl_config', JSON.stringify(config));
    localStorage.setItem('ipl_activeTeams', JSON.stringify(activeTeams));
    localStorage.setItem('ipl_playerSets', JSON.stringify(playerSets));
    localStorage.setItem('ipl_unsoldPlayers', JSON.stringify(unsoldPlayers));
    localStorage.setItem('ipl_currentPage', JSON.stringify(currentPage));
    localStorage.setItem('ipl_setIndex', JSON.stringify(currentSetIndex));
  }, [config, activeTeams, playerSets, unsoldPlayers, currentPage, currentSetIndex]);

  // --- ACTIONS (Same as before) ---
  const resetGame = () => {
    localStorage.clear();
    window.location.reload();
  };

  const hasSavedGame = () => {
    return localStorage.getItem('ipl_activeTeams') !== null && 
           JSON.parse(localStorage.getItem('ipl_activeTeams')).length > 0;
  };

  const initializeGame = (teamsData, customConfig) => {
    setConfig(customConfig);
    const teamsObj = teamsData.map(t => ({
      ...t, budget: parseFloat(customConfig.budget), spent: 0, squad: [], foreignCount: 0
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
      currentSetIndex, setCurrentSetIndex,
      initializeGame, 
      addPlayerToSet, deletePlayerFromSet,
      sellPlayer, markUnsold,
      startUnsoldRound, canFinishAuction,
      resetGame, hasSavedGame
    }}>
      {children}
    </AuctionContext.Provider>
  );
};

export const useAuction = () => useContext(AuctionContext);