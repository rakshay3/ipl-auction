import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { IPL_TEAMS } from '../data/initialPlayers';

const LandingPage = () => {
  const { 
    joinGame, roomId, isHost, 
    activeTeams, customTeams, config, // Get customTeams from Context now
    updateSettings, claimTeam, addCustomTeam, startGame, socket
  } = useAuction();
  
  // LOGIN STATE
  const [mode, setMode] = useState('join'); 
  const [joinName, setJoinName] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");

  // LOBBY STATE
  // No local 'customTeams' state anymore!
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#000000");

  // Merge IPL Teams with Server Custom Teams
  const allAvailableTeams = [...IPL_TEAMS, ...(customTeams || [])];

  // --- ACTIONS ---

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    joinGame(code, "Host", true);
  };

  const handleJoinRoom = () => {
    if(!joinName || !roomCodeInput) return alert("Enter Name and Code");
    joinGame(roomCodeInput.toUpperCase(), joinName, false);
  };

  const handleTeamClick = (team) => {
    // Check if taken by someone else
    const owner = activeTeams.find(t => t.id === team.id);
    if (owner && owner.ownerId !== socket.id) return; // Taken by other
    
    claimTeam(team);
  };

  const handleCreateCustomTeam = () => {
    if (newTeamName) {
      const newTeam = {
        id: `custom-${Date.now()}`,
        name: newTeamName,
        abbr: newTeamName.substring(0,3).toUpperCase(),
        color: newTeamColor
      };
      
      // Send to Server (It will add to list AND auto-claim it)
      addCustomTeam(newTeam);
      
      setNewTeamName("");
    }
  };

  // --- VIEW 1: LOGIN (No Room ID) ---
  if (!roomId) {
    return (
      <div className="container landing-page">
        <div className="header"><h1>🏏 IPL Auction Multiplayer</h1></div>
        
        <div style={{display:'flex', justifyContent:'center', gap:'20px', marginBottom:'30px'}}>
          <button className={mode==='join'?'primary-btn':'btn-unsold'} onClick={()=>setMode('join')}>Join Room</button>
          <button className={mode==='host'?'primary-btn':'btn-unsold'} onClick={()=>setMode('host')}>Host Auction</button>
        </div>

        {mode === 'join' && (
           <div style={{maxWidth:'400px', margin:'0 auto', background:'white', padding:'30px', borderRadius:'15px', textAlign:'center'}}>
              <h2 style={{color:'#333'}}>Join Lobby</h2>
              <input type="text" placeholder="Room Code" value={roomCodeInput} onChange={e=>setRoomCodeInput(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'10px', fontSize:'1.2rem', textTransform:'uppercase', textAlign:'center'}} />
              <input type="text" placeholder="Your Name" value={joinName} onChange={e=>setJoinName(e.target.value)} style={{width:'100%', padding:'10px', marginBottom:'20px'}} />
              <button className="primary-btn" style={{width:'100%'}} onClick={handleJoinRoom}>Enter Lobby</button>
           </div>
        )}

        {mode === 'host' && (
           <div style={{textAlign:'center'}}>
              <p style={{color:'white'}}>Create a room and invite friends to pick teams.</p>
              <button className="primary-btn" style={{fontSize:'1.2rem', padding:'15px 40px'}} onClick={handleCreateRoom}>
                🚀 Create Room
              </button>
           </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: LIVE LOBBY (Room ID Exists) ---
  
  // Safe check for socket.id to prevent crash if socket briefly null
  const mySocketId = socket ? socket.id : null;

  return (
    <div className="container landing-page">
      {/* LOBBY HEADER */}
      <div style={{background:'#dbeafe', padding:'20px', borderRadius:'15px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
         <div>
            <h2 style={{color:'#1e3a8a', margin:0}}>Lobby: {roomId}</h2>
            <p style={{color:'#60a5fa', margin:0}}>Share code with bidders</p>
         </div>
         <div style={{textAlign:'right'}}>
            <h3 style={{color:'#1e40af', margin:0}}>{activeTeams.length} Teams Joined</h3>
            {isHost && (
                <button 
                  className="primary-btn" 
                  style={{marginTop:'10px', opacity: activeTeams.length < 2 ? 0.5 : 1}} 
                  disabled={activeTeams.length < 2}
                  onClick={startGame}
                >
                  Start Game →
                </button>
            )}
            {!isHost && <div style={{color:'#2563eb', fontWeight:'bold', marginTop:'5px'}}>Waiting for Host...</div>}
         </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px'}}>
        
        {/* LEFT: TEAM SELECTION */}
        <div className="setup-section">
            <h3 className="section-title">Choose Your Team</h3>
            <div className="teams-grid">
              {allAvailableTeams.map(team => {
                // Check status
                const owner = activeTeams.find(t => t.id === team.id);
                const isTaken = owner && owner.ownerId !== mySocketId;
                const isMine = owner && owner.ownerId === mySocketId;

                return (
                  <button 
                    key={team.id}
                    className="team-btn"
                    disabled={isTaken} 
                    style={{ 
                      borderColor: isMine ? '#22c55e' : (isTaken ? '#ccc' : team.color),
                      background: isMine ? '#22c55e' : (isTaken ? '#eee' : 'white'),
                      color: isMine ? 'white' : (isTaken ? '#999' : '#333'),
                      opacity: isTaken ? 0.6 : 1,
                      transform: isMine ? 'scale(1.05)' : 'scale(1)',
                      position: 'relative'
                    }}
                    onClick={() => handleTeamClick(team)}
                  >
                    <strong>{team.abbr}</strong>
                    <span>{team.name}</span>
                    {isTaken && <div style={{fontSize:'0.7rem', marginTop:'5px'}}>Taken</div>}
                    {isMine && <div style={{fontSize:'0.7rem', marginTop:'5px'}}>✅ YOURS</div>}
                  </button>
                );
              })}
            </div>

            {/* ADD CUSTOM TEAM */}
            <div className="custom-team-input" style={{marginTop:'20px'}}>
              <input type="text" placeholder="Create Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
              <input type="color" value={newTeamColor} onChange={e => setNewTeamColor(e.target.value)} style={{ width: '50px', padding: '0', border: 'none' }} />
              <button onClick={handleCreateCustomTeam}>+ Create & Join</button>
            </div>
        </div>

        {/* RIGHT: SETTINGS (Host Only) & STATUS */}
        <div>
          {isHost ? (
            <div className="setup-section">
              <h3 className="section-title">Game Rules</h3>
              <div className="setup-grid" style={{gridTemplateColumns:'1fr'}}>
                <div className="form-group">
                    <label>Budget (Cr)</label>
                    <input type="number" value={config.budget} 
                        onChange={e => updateSettings({...config, budget: e.target.value})} 
                    />
                </div>
                <div className="form-group"><label>Min Players</label><input type="number" value={config.minPlayers} onChange={e => updateSettings({...config, minPlayers: e.target.value})} /></div>
                <div className="form-group"><label>Max Players</label><input type="number" value={config.maxPlayers} onChange={e => updateSettings({...config, maxPlayers: e.target.value})} /></div>
                <div className="form-group"><label>Max Foreign</label><input type="number" value={config.maxForeign} onChange={e => updateSettings({...config, maxForeign: e.target.value})} /></div>
              </div>
            </div>
          ) : (
            <div className="setup-section">
               <h3 className="section-title">Rules</h3>
               <ul style={{listStyle:'none', padding:0}}>
                  <li style={{marginBottom:'10px'}}>💰 Budget: <strong>{config.budget} Cr</strong></li>
                  <li style={{marginBottom:'10px'}}>👥 Min Players: <strong>{config.minPlayers}</strong></li>
                  <li style={{marginBottom:'10px'}}>🌍 Max Foreign: <strong>{config.maxForeign}</strong></li>
               </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;