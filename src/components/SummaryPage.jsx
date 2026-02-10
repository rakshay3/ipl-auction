import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const SummaryPage = () => {
  const { 
    activeTeams, unsoldPlayers, config, isHost, 
    socket, resetGame, leaveGame // We might need a "Leave Room" function later
  } = useAuction();

  const [selectedTeam, setSelectedTeam] = useState(null);
  const [viewMode, setViewMode] = useState('teams'); // 'teams' | 'unsold'

  // --- STATS CALCULATION ---
  const sortedTeams = [...activeTeams].sort((a, b) => b.budget - a.budget);

  const getTeamStats = (team) => {
    const squad = team.squad || [];
    const batsmen = squad.filter(p => p.type === 'Batsman' || p.type === 'Wicket Keeper').length;
    const bowlers = squad.filter(p => p.type === 'Bowler' || p.type === 'All-Rounder').length;
    return { batsmen, bowlers, total: squad.length };
  };

  const handleLeave = () => {
    // Force a reload to clear socket and state
    window.location.reload();
  };

  return (
    <div className="container" style={{paddingBottom:'50px'}}>
      
      {/* HEADER */}
      <div className="header" style={{textAlign:'center', marginBottom:'40px'}}>
        <h1 style={{color:'white', margin:'0 0 10px 0'}}>🏆 Auction Summary</h1>
        <p style={{color:'#a5f3fc', margin:0}}>
           {activeTeams.length} Teams | {activeTeams.reduce((acc, t) => acc + t.squad.length, 0)} Players Sold | {unsoldPlayers.length} Unsold
        </p>
      </div>

      {/* TABS */}
      <div style={{display:'flex', justifyContent:'center', gap:'20px', marginBottom:'30px'}}>
          <button 
             className={`primary-btn ${viewMode === 'teams' ? '' : 'btn-unsold'}`} 
             style={{background: viewMode === 'teams' ? '#2563eb' : '#334155'}}
             onClick={() => { setViewMode('teams'); setSelectedTeam(null); }}
          >
             Team Standings
          </button>
          <button 
             className={`primary-btn ${viewMode === 'unsold' ? '' : 'btn-unsold'}`}
             style={{background: viewMode === 'unsold' ? '#ef4444' : '#334155'}}
             onClick={() => setViewMode('unsold')}
          >
             Unsold Players ({unsoldPlayers.length})
          </button>
      </div>

      {/* --- VIEW 1: TEAM STANDINGS --- */}
      {viewMode === 'teams' && !selectedTeam && (
          <div className="teams-grid" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'}}>
            {sortedTeams.map(team => {
              const stats = getTeamStats(team);
              const budgetPercent = (team.budget / config.budget) * 100;
              
              return (
                <div key={team.id} className="pool-card" style={{padding:'0', overflow:'hidden', cursor:'pointer', transition:'transform 0.2s'}}
                     onClick={() => setSelectedTeam(team)}
                     onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                     onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {/* Header with Team Color */}
                    <div style={{background: team.color, padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h2 style={{margin:0, color:'white', textShadow:'0 2px 4px rgba(0,0,0,0.5)'}}>{team.name}</h2>
                        <span style={{background:'white', color: team.color, padding:'2px 8px', borderRadius:'10px', fontWeight:'bold', fontSize:'0.8rem'}}>
                            {team.abbr}
                        </span>
                    </div>

                    {/* Body */}
                    <div style={{padding:'20px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
                            <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#333'}}>{team.squad.length}</div>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Players</div>
                            </div>
                            <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#333'}}>{team.foreignCount}</div>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Foreign</div>
                            </div>
                            <div style={{textAlign:'center'}}>
                                <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#22c55e'}}>{team.budget}</div>
                                <div style={{fontSize:'0.8rem', color:'#666'}}>Cr Left</div>
                            </div>
                        </div>

                        {/* Budget Bar */}
                        <div style={{width:'100%', height:'8px', background:'#eee', borderRadius:'4px', overflow:'hidden', marginBottom:'10px'}}>
                             <div style={{width: `${budgetPercent}%`, height:'100%', background: team.color}}></div>
                        </div>
                        <small style={{color:'#999'}}>Total Budget: {config.budget} Cr</small>
                        
                        <div style={{marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'10px', display:'flex', gap:'10px'}}>
                             <span className="badge" style={{background:'#dbeafe', color:'#1e40af'}}>Bat: {stats.batsmen}</span>
                             <span className="badge" style={{background:'#fce7f3', color:'#be185d'}}>Bowl: {stats.bowlers}</span>
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
      )}

      {/* --- VIEW 2: SQUAD DETAILS --- */}
      {selectedTeam && (
          <div className="fade-in">
              <button 
                onClick={() => setSelectedTeam(null)} 
                style={{background:'transparent', color:'white', border:'1px solid white', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', marginBottom:'20px'}}
              >
                  ← Back to Teams
              </button>
              
              <div className="pool-card">
                  <div style={{borderBottom:`4px solid ${selectedTeam.color}`, paddingBottom:'10px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'end'}}>
                      <h2 style={{margin:0, color:'#333'}}>{selectedTeam.name} Squad</h2>
                      <h3 style={{margin:0, color: selectedTeam.color}}>Remaining: {selectedTeam.budget} Cr</h3>
                  </div>

                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                      <thead>
                          <tr style={{background:'#f8f9fa', textAlign:'left'}}>
                              <th style={{padding:'10px'}}>Player</th>
                              <th style={{padding:'10px'}}>Role</th>
                              <th style={{padding:'10px'}}>Country</th>
                              <th style={{padding:'10px'}}>Sold Price</th>
                          </tr>
                      </thead>
                      <tbody>
                          {selectedTeam.squad.map(p => (
                              <tr key={p.id} style={{borderBottom:'1px solid #eee'}}>
                                  <td style={{padding:'10px', display:'flex', alignItems:'center', gap:'10px'}}>
                                      <img src={p.img || DEFAULT_AVATAR} alt="" style={{width:'30px', height:'30px', borderRadius:'50%', objectFit:'cover'}} />
                                      {p.name}
                                  </td>
                                  <td style={{padding:'10px'}}>{p.type}</td>
                                  <td style={{padding:'10px'}}>{p.country} {p.isForeign ? '✈️' : ''}</td>
                                  <td style={{padding:'10px', fontWeight:'bold', color:'#166534'}}>{p.soldPrice} Cr</td>
                              </tr>
                          ))}
                          {selectedTeam.squad.length === 0 && (
                              <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#999'}}>No players bought yet.</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- VIEW 3: UNSOLD PLAYERS --- */}
      {viewMode === 'unsold' && (
          <div className="pool-card">
              <h2 style={{color:'#ef4444', borderBottom:'2px solid #ef4444', paddingBottom:'10px'}}>Unsold Players</h2>
              <ul className="pool-list">
                  {unsoldPlayers.map(p => (
                      <li key={p.id} className="pool-item" style={{opacity:0.7}}>
                          <img src={p.img || DEFAULT_AVATAR} alt="" style={{width:'40px', height:'40px', borderRadius:'50%', marginRight:'15px'}} />
                          <div>
                              <strong>{p.name}</strong>
                              <div style={{fontSize:'0.8rem'}}>{p.type} | Base: {p.basePrice} Cr</div>
                          </div>
                      </li>
                  ))}
                  {unsoldPlayers.length === 0 && <p style={{padding:'20px', textAlign:'center'}}>No unsold players.</p>}
              </ul>
          </div>
      )}

      {/* FOOTER ACTIONS */}
      <div style={{textAlign:'center', marginTop:'50px', borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:'20px'}}>
          <button className="primary-btn" onClick={() => window.print()} style={{marginRight:'20px', background:'#4b5563'}}>
             🖨️ Print Summary
          </button>
          
          <button 
            className="primary-btn" 
            style={{background:'#dc2626'}}
            onClick={() => {
                if(window.confirm("Are you sure you want to exit?")) {
                    leaveGame();
                }
            }}
          >
             🚪 Exit Game
          </button>
      </div>

    </div>
  );
};

export default SummaryPage;