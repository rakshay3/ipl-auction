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

    if (price > team.budget) return alert(`Budget insufficient! Only ${team.budget}L left.`);
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
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'20px'}}>
        <div><h1 style={{margin:0}}>🔨 Live Auction</h1><p style={{margin:0}}>Set: {currentSet.setName}</p></div>
        <button onClick={handleQuit} style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:'5px 10px', borderRadius:'5px'}}>Quit</button>
      </div>

      <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
        
        {/* LEFT: CONTROLS */}
        <div className="auction-controls">
          <h3>Bidding Desk</h3>
          <div className="control-row">
            <select value={winningTeam} onChange={e => setWinningTeam(e.target.value)} disabled={auctionState !== 'revealed'}>
              <option value="">-- Choose Team --</option>
              {activeTeams.map(t => <option key={t.name} value={t.name}>{t.name} ({t.budget}L)</option>)}
            </select>
          </div>
          <div className="control-row">
             <input type="number" placeholder="Price (L)" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} disabled={auctionState !== 'revealed'} />
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
              <h3 style={{color:'#667eea', fontSize:'1.5rem', margin:0}}>Base: {currentPlayer.basePrice} L</h3>
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
                         <span>Rem: {t.budget}L</span>
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


//spin to reveal
// import React, { useState, useEffect } from 'react';
// import { useAuction } from '../context/AuctionContext';
// import { DEFAULT_AVATAR } from '../data/initialPlayers';

// const AuctionPage = () => {
//   const { 
//     playerSets, activeTeams, config, sellPlayer, markUnsold, 
//     setCurrentPage, unsoldPlayers, startUnsoldRound, canFinishAuction,
//     currentSetIndex, setCurrentSetIndex, resetGame 
//   } = useAuction();

//   // STATES
//   const [auctionState, setAuctionState] = useState('idle'); 
//   const [currentPlayer, setCurrentPlayer] = useState(null);
  
//   // Wheel State
//   const [wheelRotation, setWheelRotation] = useState(0); 

//   // Form State
//   const [activeTab, setActiveTab] = useState('standings'); 
//   const [winningTeam, setWinningTeam] = useState("");
//   const [soldPrice, setSoldPrice] = useState("");

//   // UI State for Accordion
//   const [expandedSetId, setExpandedSetId] = useState(null);

//   const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;

//   // Reset when set changes
//   useEffect(() => {
//     setAuctionState('idle');
//     setCurrentPlayer(null);
//     setWheelRotation(0);
//     setExpandedSetId(null); // Collapse dropdowns when moving to next set
//   }, [currentSetIndex]);

//   // --- LOGIC: ACCURATE SPIN ---
//   const handleSpin = () => {
//     if (auctionState !== 'idle') return;
    
//     const players = currentSet.players;
//     const count = players.length;
    
//     const randomIndex = Math.floor(Math.random() * count);
//     const winner = players[randomIndex];

//     const sliceAngle = 360 / count;
//     const spins = 5; 
//     const newRotation = (360 * spins) - (randomIndex * sliceAngle) - (sliceAngle / 2);

//     setWheelRotation(newRotation);
//     setAuctionState('spinning');

//     setTimeout(() => {
//       setCurrentPlayer(winner);
//       setAuctionState('revealed');
//       setWinningTeam(""); 
//       setSoldPrice("");
//     }, 4000);
//   };

//   // --- ACTIONS ---
//   const handleSold = () => {
//     if (!winningTeam || !soldPrice) return alert("Enter details");
//     const team = activeTeams.find(t => t.name === winningTeam);
//     const price = parseFloat(soldPrice);

//     if (price > team.budget) return alert(`Budget insufficient! Only ${team.budget}L left.`);
//     if (team.squad.length >= config.maxPlayers) return alert("Squad Full!");
//     if (currentPlayer.isForeign && team.foreignCount >= config.maxForeign) return alert("Foreign limit reached!");

//     sellPlayer(currentPlayer, winningTeam, price);
//     setAuctionState('idle'); setCurrentPlayer(null); setWheelRotation(0);
//   };

//   const handleUnsold = () => {
//     markUnsold(currentPlayer);
//     setAuctionState('idle'); setCurrentPlayer(null); setWheelRotation(0);
//   };

//   const handleQuit = () => { if (window.confirm("Quit Auction?")) resetGame(); };

//   const finishAuction = () => {
//       if(canFinishAuction() || window.confirm("Criteria not fully met. Finish anyway?")) {
//           setCurrentPage('summary');
//       }
//   };

//   const nextSet = () => {
//     if (currentSetIndex < playerSets.length - 1) {
//         setCurrentSetIndex(prev => prev + 1);
//     } else {
//        if(unsoldPlayers.length > 0) {
//           if(window.confirm("Sets Finished. Start Unsold Round?")) {
//               if(startUnsoldRound()) setCurrentSetIndex(0);
//           } else {
//               finishAuction();
//           }
//        } else {
//           finishAuction();
//        }
//     }
//   };

//   const getWheelGradient = () => {
//     const count = currentSet.players.length;
//     const colors = ['#f54242', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];
//     let gradient = 'conic-gradient(';
//     const slice = 100 / count;
//     for(let i=0; i<count; i++) {
//       const c = colors[i % colors.length];
//       gradient += `${c} ${slice * i}% ${slice * (i+1)}%,`;
//     }
//     return gradient.slice(0, -1) + ')';
//   };

//   const toggleSet = (idx) => {
//     if (expandedSetId === idx) setExpandedSetId(null);
//     else setExpandedSetId(idx);
//   };

//   // Safety Check
//   if (!currentSet) {
//       return (
//         <div className="container" style={{textAlign:'center', paddingTop:'50px', color: 'white'}}>
//            <h1>⚠️ Auction Paused</h1>
//            <p>We lost track of the current set.</p>
//            <div style={{display:'flex', gap:'20px', justifyContent:'center', marginTop:'20px'}}>
//              <button className="primary-btn" onClick={() => setCurrentPage('summary')}>Go to Summary</button>
//              <button className="primary-btn" style={{background:'#e94560'}} onClick={resetGame}>Reset Game</button>
//            </div>
//         </div>
//       );
//   }

//   return (
//     <div className="container">
//       <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'20px'}}>
//         <div><h1 style={{margin:0}}>🔨 Live Auction</h1><p style={{margin:0}}>Set: {currentSet.setName}</p></div>
//         <button onClick={handleQuit} style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:'5px 10px', borderRadius:'5px'}}>Quit</button>
//       </div>

//       <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
        
//         {/* LEFT: CONTROLS */}
//         <div className="auction-controls">
//           <h3>Bidding Desk</h3>
//           <div className="control-row">
//             <label>Select Team</label>
//             <select value={winningTeam} onChange={e => setWinningTeam(e.target.value)} disabled={auctionState !== 'revealed'}>
//               <option value="">-- Choose Team --</option>
//               {activeTeams.map(t => <option key={t.name} value={t.name}>{t.name} ({t.budget}L)</option>)}
//             </select>
//           </div>
//           <div className="control-row">
//              <input type="number" placeholder="Price (L)" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} disabled={auctionState !== 'revealed'} />
//           </div>
//           <div className="action-btns">
//             <button className="btn-sold" onClick={handleSold} disabled={auctionState !== 'revealed'}>SOLD</button>
//             <button className="btn-unsold" onClick={handleUnsold} disabled={auctionState !== 'revealed'}>UNSOLD</button>
//           </div>
//         </div>

//         {/* CENTER: WHEEL & PLAYER CARD */}
//         <div className="player-card-section">
//           {(auctionState === 'idle' || auctionState === 'spinning') && (
//             <div style={{width: '100%', textAlign: 'center'}}>
//               {currentSet.players.length > 0 ? (
//                 <>
//                    <div className="wheel-container">
//                      <div className="wheel-arrow"></div>
//                      <div className="wheel" style={{
//                        background: getWheelGradient(),
//                        transform: `rotate(${wheelRotation}deg)`
//                      }}>
//                         {currentSet.players.length <= 16 && currentSet.players.map((p, i) => {
//                           const angle = (360/currentSet.players.length) * i + (360/currentSet.players.length/2);
//                           return (
//                             <div key={p.id} className="wheel-label" style={{transform: `rotate(${angle}deg)`}}>
//                               <span>{p.name.split(' ')[1] || p.name}</span>
//                             </div>
//                           )
//                         })}
//                      </div>
//                      <div className="wheel-center"></div>
//                    </div>
                   
//                    <button 
//                      className="primary-btn" 
//                      onClick={handleSpin} 
//                      disabled={auctionState === 'spinning'}
//                      style={{width:'auto', borderRadius:'30px', padding:'15px 40px', fontSize:'1.2rem', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}
//                    >
//                      {auctionState === 'spinning' ? 'Spinning...' : '🎰 SPIN TO REVEAL'}
//                    </button>
//                 </>
//               ) : (
//                 <div>
//                    <h3>{currentSet.setName} Completed</h3>
//                    {currentSetIndex < playerSets.length - 1 ? (
//                       <button className="primary-btn" onClick={nextSet}>Next Set →</button>
//                    ) : (
//                       <div style={{display:'flex', flexDirection:'column', gap:'10px', alignItems:'center'}}>
//                         <p>All Sets Done!</p>
//                         {unsoldPlayers.length > 0 && <button className="primary-btn" style={{background:'#f59e0b'}} onClick={() => {if(startUnsoldRound()) setCurrentSetIndex(0)}}>Start Unsold Re-Auction</button>}
//                         <button className="btn-finish" onClick={finishAuction}>🏁 Finish Auction</button>
//                       </div>
//                    )}
//                 </div>
//               )}
//             </div>
//           )}

//           {auctionState === 'revealed' && currentPlayer && (
//             <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
//               <div style={{
//                 width: '180px', height: '180px', borderRadius: '50%', border: '5px solid #667eea',
//                 boxShadow: '0 10px 20px rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: '20px', background: 'white'
//               }}>
//                 <img src={currentPlayer.img || DEFAULT_AVATAR} alt="p" style={{width:'100%', height:'100%', objectFit:'cover'}} />
//               </div>
//               <h2 style={{fontSize: '2rem', margin: '10px 0'}}>{currentPlayer.name}</h2>
//               <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
//                    <span className="badge role">{currentPlayer.type}</span>
//                    <span className="badge country">{currentPlayer.country}</span>
//               </div>
//               <h3 style={{color:'#667eea', fontSize:'1.5rem', margin:0}}>Base: {currentPlayer.basePrice} L</h3>
//             </div>
//           )}
//         </div>

//         {/* RIGHT: TABS */}
//         <div className="team-stats-panel">
//           <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
//             <button onClick={()=>setActiveTab('standings')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='standings'?'#667eea':'#eee', color: activeTab==='standings'?'white':'#333', border:'none', borderRadius:'5px'}}>Teams</button>
//             <button onClick={()=>setActiveTab('setList')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='setList'?'#667eea':'#eee', color: activeTab==='setList'?'white':'#333', border:'none', borderRadius:'5px'}}>Set</button>
//             <button onClick={()=>setActiveTab('unsoldList')} style={{flex:1, padding:'5px', fontSize:'0.8rem', background: activeTab==='unsoldList'?'#667eea':'#eee', color: activeTab==='unsoldList'?'white':'#333', border:'none', borderRadius:'5px'}}>Unsold</button>
//           </div>
//           <div style={{overflowY:'auto', maxHeight:'500px'}}>
//              {activeTab === 'standings' && activeTeams.map(t => (
//                <div key={t.name} className="mini-team-card" style={{borderLeftColor: t.color || '#ccc'}}>
//                  <div style={{display:'flex', justifyContent:'space-between'}}><strong>{t.abbr}</strong><small>{t.squad.length}/{config.maxPlayers}</small></div>
//                  <div className="progress-bar"><div className="progress-fill" style={{width: `${(t.squad.length/config.maxPlayers)*100}%`, background: t.color}}></div></div>
//                  <small>Rem: {t.budget}L</small>
//                </div>
//              ))}

//              {/* --- UPCOMING SETS DROPDOWN LOGIC --- */}
//              {activeTab === 'setList' && (
//                <div>
//                  <div style={{background:'#f0f9ff', padding:'5px', borderRadius:'5px', marginBottom:'5px'}}>
//                    <strong>Current: {currentSet.setName}</strong>
//                  </div>
//                  <ul style={{listStyle:'none', padding:0, marginBottom:'15px'}}>
//                    {currentSet?.players.map(p => <li key={p.id} style={{padding:'5px', borderBottom:'1px solid #eee', fontSize:'0.85rem'}}>{p.name}</li>)}
//                  </ul>

//                  <div style={{background:'#fdf2f8', padding:'5px', borderRadius:'5px', marginBottom:'5px'}}>
//                    <strong>Upcoming Sets</strong>
//                  </div>
//                  <ul style={{listStyle:'none', padding:0}}>
//                    {playerSets.map((s, idx) => {
//                      // Only show future sets that HAVE players
//                      if (idx > currentSetIndex && s.players.length > 0) {
//                        const isOpen = expandedSetId === idx;
//                        return (
//                          <li key={idx} style={{marginBottom:'5px'}}>
//                            <div 
//                              onClick={() => toggleSet(idx)}
//                              style={{
//                                padding:'6px 8px', 
//                                border:'1px solid #f9a8d4', 
//                                background: isOpen ? '#fce7f3' : 'white',
//                                color:'#831843', 
//                                fontSize:'0.85rem', 
//                                display:'flex', 
//                                justifyContent:'space-between',
//                                borderRadius: '5px',
//                                cursor: 'pointer',
//                                transition: 'background 0.2s'
//                              }}
//                            >
//                              <span>{isOpen ? '▼' : '▶'} {s.setName}</span>
//                              <span style={{background:'#fbcfe8', padding:'0 6px', borderRadius:'10px', fontSize:'0.75rem'}}>{s.players.length}</span>
//                            </div>
                           
//                            {/* DROPDOWN CONTENT */}
//                            {isOpen && (
//                              <ul style={{
//                                listStyle:'none', 
//                                padding:'5px 0 5px 15px', 
//                                margin:0, 
//                                background:'#fff0f7',
//                                borderLeft:'2px solid #f9a8d4'
//                              }}>
//                                {s.players.map(p => (
//                                  <li key={p.id} style={{fontSize:'0.8rem', padding:'3px 0', color:'#555'}}>• {p.name}</li>
//                                ))}
//                              </ul>
//                            )}
//                          </li>
//                        );
//                      }
//                      return null;
//                    })}
//                    {currentSetIndex === playerSets.length - 1 && <li style={{color:'#999', fontSize:'0.8rem', padding:'5px'}}>No more sets</li>}
//                  </ul>
//                </div>
//              )}

//              {activeTab === 'unsoldList' && (
//                <ul style={{listStyle:'none', padding:0}}>
//                  {unsoldPlayers.map(p => <li key={p.id} style={{padding:'8px', borderBottom:'1px solid #fee2e2', color:'#991b1b', fontSize:'0.9rem', background:'#fff5f5'}}>{p.name} ({p.basePrice}L)</li>)}
//                </ul>
//              )}
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default AuctionPage;

// flip-card-animation code reference
// import React, { useState, useEffect } from 'react';
// import { useAuction } from '../context/AuctionContext';
// import { DEFAULT_AVATAR } from '../data/initialPlayers';

// const AuctionPage = () => {
//   const { 
//     playerSets, activeTeams, config, sellPlayer, markUnsold, 
//     setCurrentPage, unsoldPlayers, startUnsoldRound, canFinishAuction,
//     currentSetIndex, setCurrentSetIndex, resetGame 
//   } = useAuction();

//   // STATES
//   const [auctionState, setAuctionState] = useState('idle'); // idle, zooming, revealed
//   const [currentPlayer, setCurrentPlayer] = useState(null);
  
//   // New State: To track which cards in the grid are already clicked/flipped
//   const [revealedCardIds, setRevealedCardIds] = useState([]); 

//   const [activeTab, setActiveTab] = useState('standings'); 
//   const [winningTeam, setWinningTeam] = useState("");
//   const [soldPrice, setSoldPrice] = useState("");

//   const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;

//   // Reset revealed cards when set changes
//   useEffect(() => {
//     setRevealedCardIds([]);
//     setAuctionState('idle');
//     setCurrentPlayer(null);
//   }, [currentSetIndex]);

//   // --- ACTIONS ---

//   // 1. User Clicks a Card
//   const handleCardClick = (player) => {
//     if (auctionState !== 'idle') return; // Prevent double clicks
    
//     // Mark this card as revealed visually
//     setRevealedCardIds([...revealedCardIds, player.id]);
//     setCurrentPlayer(player);
//     setAuctionState('zooming'); // Start the zoom animation

//     // Wait for animation, then show the big player card
//     setTimeout(() => {
//       setAuctionState('revealed');
//       setWinningTeam("");
//       setSoldPrice("");
//     }, 800);
//   };

//   const handleSold = () => {
//     if (!winningTeam || !soldPrice) return alert("Enter details");
//     const team = activeTeams.find(t => t.name === winningTeam);
//     const price = parseFloat(soldPrice);
    
//     // Validations (Keep your existing validations here)
//     if (price > team.budget) return alert(`Budget insufficient! Only ${team.budget}L left.`);
//     if (team.squad.length >= config.maxPlayers) return alert("Squad Full!");
//     if (currentPlayer.isForeign && team.foreignCount >= config.maxForeign) return alert("Foreign limit reached!");

//     sellPlayer(currentPlayer, winningTeam, price);
//     setAuctionState('idle'); 
//     setCurrentPlayer(null);
//   };

//   const handleUnsold = () => {
//     markUnsold(currentPlayer);
//     setAuctionState('idle'); 
//     setCurrentPlayer(null);
//   };

//   const handleQuit = () => { if (window.confirm("Quit?")) resetGame(); };

//   // Next Set Logic
//   const nextSet = () => {
//     if (currentSetIndex < playerSets.length - 1) {
//       setCurrentSetIndex(prev => prev + 1);
//     } else {
//        // Logic for unsold round or finish
//        if(unsoldPlayers.length > 0) {
//          if(window.confirm("Sets Finished. Start Unsold Round?")) {
//            if(startUnsoldRound()) setCurrentSetIndex(0);
//          }
//        } else {
//          if(canFinishAuction()) setCurrentPage('summary');
//        }
//     }
//   };

//   if (!currentSet) return <div>Loading...</div>;

//   // Filter out players who are already sold/unsold from the visual grid
//   // We only want to show cards for players "Available" in the current set
//   // However, your logic removes them from the set array entirely when sold.
//   // So 'currentSet.players' actually shrinks. 
//   // This is perfect! The grid will automatically shrink.

//   return (
//     <div className="container">
//       {/* Header (Same as before) */}
//       <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'20px'}}>
//         <div><h1 style={{margin:0}}>🔨 Live Auction</h1><p style={{margin:0}}>Set: {currentSet.setName}</p></div>
//         <button onClick={handleQuit} style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:'5px 10px', borderRadius:'5px'}}>Quit</button>
//       </div>

//       <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
        
//         {/* LEFT: CONTROLS (Same as before) */}
//         <div className="auction-controls">
//           <h3>Bidding Desk</h3>
//           <div className="control-row">
//             <label>Select Team</label>
//             <select value={winningTeam} onChange={e => setWinningTeam(e.target.value)} disabled={auctionState !== 'revealed'}>
//               <option value="">-- Choose Team --</option>
//               {activeTeams.map(t => <option key={t.name} value={t.name}>{t.name} ({t.budget}L)</option>)}
//             </select>
//           </div>
//           <div className="control-row">
//              <label>Sold Price (L)</label>
//              <input type="number" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} disabled={auctionState !== 'revealed'} />
//           </div>
//           <div className="action-btns">
//             <button className="btn-sold" onClick={handleSold} disabled={auctionState !== 'revealed'}>SOLD</button>
//             <button className="btn-unsold" onClick={handleUnsold} disabled={auctionState !== 'revealed'}>UNSOLD</button>
//           </div>
//         </div>

//         {/* CENTER: CARD GRID OR REVEALED PLAYER */}
//         <div className="player-card-section">
          
//           {/* VIEW 1: THE CARD GRID */}
//           {auctionState === 'idle' && (
//             <div style={{width: '100%', textAlign: 'center'}}>
              
//               {currentSet.players.length > 0 ? (
//                 <>
//                   <h3>Pick a Card to Reveal</h3>
//                   <div className="card-grid">
//                     {currentSet.players.map((player) => (
//                       <div 
//                         key={player.id} 
//                         className={`mystery-card ${revealedCardIds.includes(player.id) ? 'zooming' : ''}`}
//                         onClick={() => handleCardClick(player)}
//                       >
//                         <div className="card-face card-front">
//                           <div className="card-logo">?</div>
//                         </div>
//                         <div className="card-face card-back">
//                           <img src={player.img || DEFAULT_AVATAR} alt="player" />
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </>
//               ) : (
//                 // Set Finished View
//                 <div>
//                    <h3>{currentSet.setName} Completed</h3>
//                    {currentSetIndex < playerSets.length - 1 ? (
//                       <button className="primary-btn" onClick={nextSet}>Next Set →</button>
//                    ) : (
//                       <button className="btn-finish" onClick={() => setCurrentPage('summary')} disabled={!canFinishAuction()}>Finish Auction</button>
//                    )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* VIEW 2: ZOOMING ANIMATION (Ghost view if needed, mainly handled by CSS class) */}
//           {auctionState === 'zooming' && (
//              <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%'}}>
//                <h2 className="pulsate" style={{color:'#667eea'}}>Revealing...</h2>
//              </div>
//           )}

//           {/* VIEW 3: BIG PLAYER CARD (Same as before) */}
//           {auctionState === 'revealed' && currentPlayer && (
//             <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
//               <div style={{
//                 width: '180px', height: '180px', borderRadius: '50%', border: '5px solid #667eea',
//                 boxShadow: '0 10px 20px rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: '20px', background: 'white'
//               }}>
//                 <img 
//                   src={currentPlayer.img || DEFAULT_AVATAR} 
//                   alt={currentPlayer.name}
//                   style={{width:'100%', height:'100%', objectFit:'cover'}}
//                 />
//               </div>
//               <h2 style={{fontSize: '2rem', margin: '10px 0'}}>{currentPlayer.name}</h2>
//               <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
//                    <span className="badge role">{currentPlayer.type}</span>
//                    <span className="badge country">{currentPlayer.country}</span>
//               </div>
//               <h3 style={{color:'#667eea', fontSize:'1.5rem', margin:0}}>Base: {currentPlayer.basePrice} L</h3>
//             </div>
//           )}
//         </div>

//         {/* RIGHT: STATS (Same as before) */}
//         <div className="team-stats-panel">
//           {/* ... Keep your existing Right Panel Code ... */}
//           <div style={{padding:'10px', textAlign:'center', color:'#666'}}>
//              Stats Panel
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// };

// export default AuctionPage;