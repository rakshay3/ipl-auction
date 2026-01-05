import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { IPL_TEAMS } from '../data/initialPlayers';

const LandingPage = () => {
  const { initializeGame, hasSavedGame, resetGame, setCurrentPage } = useAuction();
  
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [customTeams, setCustomTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#000000");
  const [saveExists, setSaveExists] = useState(false);

  const [settings, setSettings] = useState({
    budget: 10000, minPlayers: 15, maxPlayers: 25, maxForeign: 8
  });

  useEffect(() => {
    setSaveExists(hasSavedGame());
  }, [hasSavedGame]);

  const allAvailableTeams = [...IPL_TEAMS, ...customTeams];

  const toggleTeam = (team) => {
    const exists = selectedTeams.find(t => t.id === team.id);
    if (exists) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const addCustomTeam = () => {
    if (newTeamName) {
      const newTeam = {
        id: `custom-${Date.now()}`,
        name: newTeamName,
        abbr: newTeamName.substring(0,3).toUpperCase(),
        color: newTeamColor
      };
      setCustomTeams([...customTeams, newTeam]);
      setSelectedTeams([...selectedTeams, newTeam]);
      setNewTeamName("");
    }
  };

  const handleStartNew = () => {
    if (saveExists) {
      const confirm = window.confirm("⚠️ Starting a new game will delete your current progress. Are you sure?");
      if (!confirm) return;
      resetGame(); // This will reload the page
      return;
    }
    
    if (selectedTeams.length < 2) return alert("Select at least 2 teams!");
    initializeGame(selectedTeams, settings);
  };

  const handleContinue = () => {
    // Current page is automatically loaded from context
    // We just need to trigger a re-render or let the Router handle it
    const savedPage = JSON.parse(localStorage.getItem('ipl_currentPage'));
    if(savedPage) setCurrentPage(savedPage);
  };

  return (
    <div className="container landing-page">
      <div className="header">
        <h1>🏏 IPL Auction Game v1.2</h1>
        <p>Configure your auction parameters</p>
      </div>

      {saveExists && (
        <div style={{background:'#dbeafe', padding:'20px', borderRadius:'10px', marginBottom:'20px', border:'1px solid #93c5fd', textAlign:'center'}}>
          <h3 style={{color:'#1e40af', marginTop:0}}>Game in Progress Found!</h3>
          <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
            <button className="primary-btn" onClick={handleContinue} style={{background:'#2563eb'}}>▶ Continue Game</button>
            <button className="primary-btn" onClick={handleStartNew} style={{background:'#ef4444'}}>🗑 Start New (Delete Save)</button>
          </div>
        </div>
      )}

      {/* Disable inputs if we are just viewing the landing page but not starting a new one immediately */}
      <div className={saveExists ? "opacity-50 pointer-events-none" : ""}> 
        <div className="setup-section">
          <h3 className="section-title">Step 1: Select Teams</h3>
          <div className="teams-grid">
            {allAvailableTeams.map(team => {
              const isSelected = selectedTeams.some(t => t.id === team.id);
              return (
                <button 
                  key={team.id}
                  className="team-btn"
                  style={{ 
                    borderColor: isSelected ? team.color : '#eee',
                    background: isSelected ? team.color : 'white',
                    color: isSelected ? 'white' : '#333'
                  }}
                  onClick={() => toggleTeam(team)}
                >
                  <strong>{team.abbr}</strong>
                  <span>{team.name}</span>
                </button>
              );
            })}
          </div>
          
          <div className="custom-team-input">
            <input type="text" placeholder="New Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <input type="color" value={newTeamColor} onChange={e => setNewTeamColor(e.target.value)} style={{ width: '50px', padding: '0', border: 'none' }} />
            <button onClick={addCustomTeam} style={{ padding: '0 20px', cursor: 'pointer' }}>+ Add</button>
          </div>
        </div>

        <div className="setup-section">
          <h3 className="section-title">Step 2: Rules</h3>
          <div className="setup-grid">
            <div className="form-group"><label>Budget (Lakhs)</label><input type="number" value={settings.budget} onChange={e => setSettings({...settings, budget: e.target.value})} /></div>
            <div className="form-group"><label>Min Players</label><input type="number" value={settings.minPlayers} onChange={e => setSettings({...settings, minPlayers: e.target.value})} /></div>
            <div className="form-group"><label>Max Players</label><input type="number" value={settings.maxPlayers} onChange={e => setSettings({...settings, maxPlayers: e.target.value})} /></div>
            <div className="form-group"><label>Max Foreign</label><input type="number" value={settings.maxForeign} onChange={e => setSettings({...settings, maxForeign: e.target.value})} /></div>
          </div>
        </div>

        {!saveExists && (
          <button className="primary-btn" onClick={handleStartNew}>
            Proceed to Player Pool →
          </button>
        )}
      </div>
    </div>
  );
};

export default LandingPage;