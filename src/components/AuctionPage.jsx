import React, { useState, useEffect } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const AuctionPage = () => {
  const { 
    playerSets, activeTeams, config, sellPlayer, markUnsold, 
    setCurrentPage, unsoldPlayers, startUnsoldRound, canFinishAuction,
    currentSetIndex, setCurrentSetIndex, resetGame 
  } = useAuction();

  // STATES
  const [auctionState, setAuctionState] = useState('idle'); // idle, animating, revealed
  const [currentPlayer, setCurrentPlayer] = useState(null);
  
  // Form State
  const [activeTab, setActiveTab] = useState('standings'); 
  const [winningTeam, setWinningTeam] = useState("");
  const [soldPrice, setSoldPrice] = useState("");

  // UI State for Accordions
  const [expandedSetId, setExpandedSetId] = useState(null);
  const [expandedTeamName, setExpandedTeamName] = useState(null); // <--- NEW STATE FOR TEAM ACCORDION

  const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;

  // Reset when set changes
  useEffect(() => {
    setAuctionState('idle');
    setCurrentPlayer(null);
    setExpandedSetId(null);
    // We do NOT reset expandedTeamName here so you can keep a team open while changing sets if needed
  }, [currentSetIndex]);

  // --- ACTIONS ---

  const startReveal = () => {
    if (!currentSet || currentSet.players.length === 0) return alert("Set Empty");
    setAuctionState('animating');
    const randomIndex = Math.floor(Math.random() * currentSet.players.length);
    const selectedPlayer = currentSet.players[randomIndex];

    setTimeout(() => {
      setCurrentPlayer(selectedPlayer);
      setAuctionState('revealed');
      setWinningTeam(""); 
      setSoldPrice("");
    }, 2000);
  };

  const handleSold = () => {
    if (!winningTeam || !soldPrice) return alert("Enter details");
    const team = activeTeams.find(t => t.name === winningTeam);
    const price = parseFloat(soldPrice);

    if (price > team.budget) return alert(`Budget insufficient! Only ${team.budget}Cr left.`);
    if (team.squad.length >= config.maxPlayers) return alert("Squad Full!");
    if (currentPlayer.isForeign && team.foreignCount >= config.maxForeign) return alert("Foreign limit reached!");

    sellPlayer(currentPlayer, winningTeam, price);
    setAuctionState('idle'); setCurrentPlayer(null);
  };

  const handleUnsold = () => {
    markUnsold(currentPlayer);
    setAuctionState('idle'); setCurrentPlayer(null);
  };

  const handleQuit = () => { if (window.confirm("Quit Auction?")) resetGame(); };

  const finishAuction = () => {
      if(canFinishAuction() || window.confirm("Criteria not fully met. Finish anyway?")) {
          setCurrentPage('summary');
      }
  };

  const nextSet = () => {
    if (currentSetIndex < playerSets.length - 1) {
        setCurrentSetIndex(prev => prev + 1);
    } else {
       if(unsoldPlayers.length > 0) {
          if(window.confirm("Sets Finished. Start Unsold Round?")) {
              if(startUnsoldRound()) setCurrentSetIndex(0);
          } else {
              finishAuction();
          }
       } else {
          finishAuction();
       }
    }
  };

  // Toggle Helpers
  const toggleSet = (idx) => {
    if (expandedSetId === idx) setExpandedSetId(null);
    else setExpandedSetId(idx);
  };

  const toggleTeam = (teamName) => {
    if (expandedTeamName === teamName) setExpandedTeamName(null);
    else setExpandedTeamName(teamName);
  };

  // Safety Check
  if (!currentSet) {
      return (
        <div className="container" style={{textAlign:'center', paddingTop:'50px', color: 'white'}}>
           <h1>⚠️ Auction Paused</h1>
           <p>We lost track of the current set.</p>
           <div style={{display:'flex', gap:'20px', justifyContent:'center', marginTop:'20px'}}>
             <button className="primary-btn" onClick={() => setCurrentPage('summary')}>Go to Summary</button>
             <button className="primary-btn" style={{background:'#e94560'}} onClick={resetGame}>Reset Game</button>
           </div>
        </div>
      );
  }

  return (
    <div className="container">
      {/* HEADER WITH ACTIONS */}
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'20px'}}>
        <div style={{textAlign:'left'}}>
          <h1 style={{margin:0, color:'white'}}>🔨 Live Auction</h1>
          <p style={{margin:0, opacity:0.7, color:'white'}}>Set: {currentSet?.setName || "Finished"}</p>
        </div>

        <div style={{display:'flex', gap:'10px'}}>
          {/* FINISH BUTTON - Only visible when criteria met */}
          {canFinishAuction() && (
            <button 
              className="primary-btn"
              onClick={() => {
                if(window.confirm("Are you sure you want to finish the auction now?")) {
                  setCurrentPage('summary');
                }
              }}
              style={{
                background: '#10b981', // Green color
                color: 'white', 
                border: 'none', 
                padding: '8px 15px', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                fontSize: '0.9rem', 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                animation: 'fadeIn 0.5s'
              }}
            >
              🏁 Finish Auction
            </button>
          )}

          {/* QUIT BUTTON */}
          <button 
            onClick={handleQuit}
            style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'bold', animation: 'fadeIn 0.5s',whiteSpace: 'nowrap'}}
          >
            ✖ Quit Game
          </button>
        </div>
      </div>

      <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
        
        {/* LEFT: CONTROLS */}
        <div className="auction-controls">
          <h3>Bidding Desk</h3>
          <div className="control-row">
            <select value={winningTeam} onChange={e => setWinningTeam(e.target.value)} disabled={auctionState !== 'revealed'}>
              <option value="">-- Choose Team --</option>
              {activeTeams.map(t => <option key={t.name} value={t.name}>{t.name} ({t.budget}Cr)</option>)}
            </select>
          </div>
          <div className="control-row">
             <input type="number" placeholder="Price (Cr)" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} disabled={auctionState !== 'revealed'} />
          </div>
          <div className="action-btns">
            <button className="btn-sold" onClick={handleSold} disabled={auctionState !== 'revealed'}>SOLD</button>
            <button className="btn-unsold" onClick={handleUnsold} disabled={auctionState !== 'revealed'}>UNSOLD</button>
          </div>
        </div>

        {/* CENTER: PLAYER CARD / ANIMATION */}
        <div className="player-card-section">
          {/* IDLE VIEW */}
          {auctionState === 'idle' && (
            <div style={{width: '100%', textAlign: 'center'}}>
              {currentSet.players.length > 0 ? (
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'300px'}}>
                   <div className="animation-container">
                      <div style={{fontSize:'80px', opacity:0.3}}>🏏</div>
                   </div>
                   <button className="primary-btn" onClick={startReveal} style={{width:'auto', borderRadius:'50px', padding:'18px 40px', fontSize:'1.2rem', marginTop:'20px', transform:'scale(1.1)'}}>
                     REVEAL PLAYER
                   </button>
                </div>
              ) : (
                <div>
                   <h3>{currentSet.setName} Completed</h3>
                   {currentSetIndex < playerSets.length - 1 ? (
                      <button className="primary-btn" onClick={nextSet}>Next Set →</button>
                   ) : (
                      <div style={{display:'flex', flexDirection:'column', gap:'10px', alignItems:'center'}}>
                        <p>All Sets Done!</p>
                        {unsoldPlayers.length > 0 && <button className="primary-btn" style={{background:'#f59e0b'}} onClick={() => {if(startUnsoldRound()) setCurrentSetIndex(0)}}>Start Unsold Re-Auction</button>}
                        <button className="btn-finish" onClick={finishAuction}>🏁 Finish Auction</button>
                      </div>
                   )}
                </div>
              )}
            </div>
          )}

          {/* ANIMATION VIEW */}
          {auctionState === 'animating' && (
             <div className="animation-container">
               <div className="cricket-emoji">🏏</div>
               <div className="ball-emoji">⚪</div>
             </div>
          )}

          {/* REVEALED VIEW */}
          {auctionState === 'revealed' && currentPlayer && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <div style={{width: '180px', height: '180px', borderRadius: '50%', border: '5px solid #667eea', boxShadow: '0 10px 20px rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: '20px', background: 'white'}}>
                <img src={currentPlayer.img || DEFAULT_AVATAR} alt="p" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              </div>
              <h2 style={{fontSize: '2rem', margin: '10px 0'}}>{currentPlayer.name}</h2>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                   <span className="badge role">{currentPlayer.type}</span>
                   <span className="badge country">{currentPlayer.country}</span>
              </div>
              <h3 style={{color:'#667eea', fontSize:'1.5rem', margin:0}}>Base: {currentPlayer.basePrice} Cr</h3>
            </div>
          )}
        </div>

        {/* RIGHT: TABS */}
        <div className="team-stats-panel">
          <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
            <button onClick={()=>setActiveTab('standings')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='standings'?'#667eea':'#eee', color: activeTab==='standings'?'white':'#333', border:'none', borderRadius:'5px'}}>Teams</button>
            <button onClick={()=>setActiveTab('setList')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='setList'?'#667eea':'#eee', color: activeTab==='setList'?'white':'#333', border:'none', borderRadius:'5px'}}>Set</button>
            <button onClick={()=>setActiveTab('unsoldList')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='unsoldList'?'#667eea':'#eee', color: activeTab==='unsoldList'?'white':'#333', border:'none', borderRadius:'5px'}}>Unsold</button>
          </div>
          <div style={{overflowY:'auto', maxHeight:'500px'}}>
             
             {/* --- TEAM STANDINGS WITH PLAYER LIST EXPANSION --- */}
             {activeTab === 'standings' && activeTeams.map(t => {
               const isOpen = expandedTeamName === t.name;
               return (
                 <div key={t.name} style={{marginBottom:'10px'}}>
                    <div 
                      className="mini-team-card" 
                      style={{borderLeftColor: t.color || '#ccc', cursor:'pointer'}}
                      onClick={() => toggleTeam(t.name)}
                    >
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <strong>{t.abbr} {isOpen ? '▼' : '▶'}</strong>
                        <small>{t.squad.length}/{config.maxPlayers}</small>
                      </div>
                      <div className="progress-bar"><div className="progress-fill" style={{width: `${(t.squad.length/config.maxPlayers)*100}%`, background: t.color}}></div></div>
                      <div style={{display:'flex', justifyContent:'space-between', marginTop:'2px', fontSize:'0.75rem'}}>
                         <span>Rem: {t.budget}Cr</span>
                         <span>Foreign: {t.foreignCount}</span>
                      </div>
                    </div>

                    {/* EXPANDED SQUAD LIST */}
                    {isOpen && (
                       <div style={{background:'#f3f4f6', borderLeft:`4px solid ${t.color}`, marginLeft:'5px', padding:'5px', borderRadius:'0 0 5px 5px'}}>
                         {t.squad.length > 0 ? (
                           <ul style={{listStyle:'none', padding:0, margin:0}}>
                             {t.squad.map((p, i) => (
                               <li key={i} style={{fontSize:'0.8rem', borderBottom:'1px dashed #ddd', padding:'3px 0', display:'flex', justifyContent:'space-between'}}>
                                 <span>{p.name}</span>
                                 <strong>{p.soldPrice}L</strong>
                               </li>
                             ))}
                           </ul>
                         ) : (
                           <small style={{color:'#999', fontStyle:'italic', padding:'5px'}}>No players yet</small>
                         )}
                       </div>
                    )}
                 </div>
               );
             })}

             {/* SETS LIST */}
             {activeTab === 'setList' && (
               <div>
                 <div style={{background:'#f0f9ff', padding:'5px', borderRadius:'5px', marginBottom:'5px'}}>
                   <strong>Current: {currentSet.setName}</strong>
                 </div>
                 <ul style={{listStyle:'none', padding:0, marginBottom:'15px'}}>
                   {currentSet?.players.map(p => <li key={p.id} style={{padding:'5px', borderBottom:'1px solid #eee', fontSize:'0.85rem'}}>{p.name}</li>)}
                 </ul>
                 <div style={{background:'#fdf2f8', padding:'5px', borderRadius:'5px', marginBottom:'5px'}}>
                   <strong>Upcoming Sets</strong>
                 </div>
                 <ul style={{listStyle:'none', padding:0}}>
                   {playerSets.map((s, idx) => {
                     if (idx > currentSetIndex && s.players.length > 0) {
                       const isOpen = expandedSetId === idx;
                       return (
                         <li key={idx} style={{marginBottom:'5px'}}>
                           <div onClick={() => toggleSet(idx)} style={{padding:'6px 8px', border:'1px solid #f9a8d4', background: isOpen ? '#fce7f3' : 'white', color:'#831843', fontSize:'0.85rem', display:'flex', justifyContent:'space-between', borderRadius: '5px', cursor: 'pointer'}}>
                             <span>{isOpen ? '▼' : '▶'} {s.setName}</span>
                             <span style={{background:'#fbcfe8', padding:'0 6px', borderRadius:'10px', fontSize:'0.75rem'}}>{s.players.length}</span>
                           </div>
                           {isOpen && (
                             <ul style={{listStyle:'none', padding:'5px 0 5px 15px', margin:0, background:'#fff0f7', borderLeft:'2px solid #f9a8d4'}}>
                               {s.players.map(p => <li key={p.id} style={{fontSize:'0.8rem', padding:'3px 0', color:'#555'}}>• {p.name}</li>)}
                             </ul>
                           )}
                         </li>
                       );
                     }
                     return null;
                   })}
                 </ul>
               </div>
             )}

             {/* UNSOLD LIST */}
             {activeTab === 'unsoldList' && (
               <ul style={{listStyle:'none', padding:0}}>
                 {unsoldPlayers.map(p => <li key={p.id} style={{padding:'8px', borderBottom:'1px solid #fee2e2', color:'#991b1b', fontSize:'0.9rem', background:'#fff5f5'}}>{p.name} ({p.basePrice}L)</li>)}
               </ul>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuctionPage;