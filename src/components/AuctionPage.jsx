import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';

const AuctionPage = () => {
  const { 
    playerSets, activeTeams, config, sellPlayer, markUnsold, 
    setCurrentPage, unsoldPlayers, startUnsoldRound, canFinishAuction,
    currentSetIndex, setCurrentSetIndex, resetGame 
  } = useAuction();

  const [auctionState, setAuctionState] = useState('idle'); 
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [activeTab, setActiveTab] = useState('standings'); 
  const [winningTeam, setWinningTeam] = useState("");
  const [soldPrice, setSoldPrice] = useState("");

  const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;

  // --- ACTIONS ---
  const handleQuit = () => {
    if (window.confirm("⚠️ Quit Auction? This will delete all progress and start over.")) {
      resetGame();
    }
  };

  const startReveal = () => {
    if (!currentSet || currentSet.players.length === 0) return alert("Set Empty");
    setAuctionState('animating');
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * currentSet.players.length);
      setCurrentPlayer(currentSet.players[randomIndex]);
      setAuctionState('revealed');
      setWinningTeam(""); setSoldPrice("");
    }, 1500);
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

  const nextSet = () => {
    if (currentSetIndex < playerSets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    } else {
       alert("Sets finished. Check Unsold.");
    }
  };

  const triggerUnsoldRound = () => {
     if(startUnsoldRound()) { setCurrentSetIndex(0); alert("Unsold Round Started!"); } 
     else { alert("No unsold players left!"); }
  };

  const finishAuction = () => {
    if (canFinishAuction()) setCurrentPage('summary');
    else alert(`Teams need min ${config.minPlayers} players.`);
  };

  if (!currentSet && playerSets.length > 0) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      {/* HEADER WITH QUIT BUTTON */}
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'end', marginBottom:'20px'}}>
        <div style={{textAlign:'left'}}>
          <h1 style={{margin:0, color:'white'}}>🔨 Live Auction</h1>
          <p style={{margin:0, opacity:0.7,color:'white'}}>Set: {currentSet?.setName || "Finished"}</p>
        </div>
        <button 
          onClick={handleQuit}
          style={{background:'#fee2e2', color:'#991b1b', border:'none', padding:'8px 15px', borderRadius:'5px', cursor:'pointer', fontSize:'0.9rem', fontWeight:'bold'}}
        >
          ✖ Quit Game
        </button>
      </div>

      <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
        
        {/* LEFT: CONTROLS */}
        <div className="auction-controls">
          <h3>Bidding Desk</h3>
          <div className="control-row">
            <label>Select Team</label>
            <select value={winningTeam} onChange={e => setWinningTeam(e.target.value)} disabled={auctionState !== 'revealed'}>
              <option value="">-- Choose Team --</option>
              {activeTeams.map(t => (
                <option key={t.name} value={t.name}>{t.name} ({t.budget}L)</option>
              ))}
            </select>
          </div>
          <div className="control-row">
             <label>Sold Price (L)</label>
             <input type="number" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} disabled={auctionState !== 'revealed'} />
          </div>
          <div className="action-btns">
            <button className="btn-sold" onClick={handleSold} disabled={auctionState !== 'revealed'}>SOLD</button>
            <button className="btn-unsold" onClick={handleUnsold} disabled={auctionState !== 'revealed'}>UNSOLD</button>
          </div>
        </div>

        {/* CENTER: PLAYER CARD */}
        <div className="player-card-section">
          {auctionState === 'idle' && (
            <div style={{textAlign:'center'}}>
              {currentSet && currentSet.players.length > 0 ? (
                <button className="primary-btn" style={{width:'auto', borderRadius:'30px', padding:'15px 40px'}} onClick={startReveal}>
                  ▶ REVEAL PLAYER
                </button>
              ) : (
                <div>
                   <h3>Set Completed</h3>
                   {currentSetIndex < playerSets.length - 1 ? (
                      <button className="primary-btn" onClick={nextSet}>Next Set →</button>
                   ) : (
                      <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <p>All Sets Done!</p>
                        {unsoldPlayers.length > 0 && <button className="primary-btn" style={{background:'#f59e0b'}} onClick={triggerUnsoldRound}>Start Unsold Re-Auction</button>}
                        <button className="btn-finish" onClick={finishAuction} disabled={!canFinishAuction()}>🏁 Finish Auction</button>
                      </div>
                   )}
                </div>
              )}
            </div>
          )}

          {auctionState === 'animating' && <div className="animation-container"><div className="cricket-emoji">🏏</div><div className="ball-emoji">⚪</div></div>}

          {/* REVEALED PLAYER - CENTERED */}
          {auctionState === 'revealed' && currentPlayer && (
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              <div style={{
                width: '180px', height: '180px', borderRadius: '50%', border: '5px solid #667eea',
                boxShadow: '0 10px 20px rgba(0,0,0,0.2)', overflow: 'hidden', marginBottom: '20px', background: 'white'
              }}>
                <img 
                  src={currentPlayer.img || "https://cdn-icons-png.flaticon.com/512/166/166344.png"} 
                  alt={currentPlayer.name}
                  style={{width:'100%', height:'100%', objectFit:'cover'}}
                />
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
            {activeTab === 'standings' && activeTeams.map(t => (
               <div key={t.name} className="mini-team-card" style={{borderLeftColor: t.color || '#ccc'}}>
                 <div style={{display:'flex', justifyContent:'space-between'}}><strong>{t.abbr}</strong><small>{t.squad.length}/{config.maxPlayers}</small></div>
                 <div className="progress-bar"><div className="progress-fill" style={{width: `${(t.squad.length/config.maxPlayers)*100}%`, background: t.color}}></div></div>
                 <small>Rem: {t.budget}L</small>
               </div>
            ))}
            {activeTab === 'setList' && (
               <ul style={{listStyle:'none', padding:0}}>
                 {currentSet?.players.map(p => <li key={p.id} style={{padding:'8px', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>{p.name} ({p.type})</li>)}
               </ul>
            )}
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
 
// wheel-spin-animation code reference
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
//   const [auctionState, setAuctionState] = useState('idle'); // idle, spinning, revealed
//   const [currentPlayer, setCurrentPlayer] = useState(null);
  
//   // Wheel State
//   const [wheelRotation, setWheelRotation] = useState(0); 

//   // Form State
//   const [activeTab, setActiveTab] = useState('standings'); 
//   const [winningTeam, setWinningTeam] = useState("");
//   const [soldPrice, setSoldPrice] = useState("");

//   const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;

//   // Reset when set changes
//   useEffect(() => {
//     setAuctionState('idle');
//     setCurrentPlayer(null);
//     setWheelRotation(0);
//   }, [currentSetIndex]);

//   // --- LOGIC: ACCURATE SPIN ---
//   const handleSpin = () => {
//     if (auctionState !== 'idle') return;
    
//     const players = currentSet.players;
//     const count = players.length;
    
//     // 1. Pick Random Index
//     const randomIndex = Math.floor(Math.random() * count);
//     const winner = players[randomIndex];

//     // 2. Calculate Math
//     const sliceAngle = 360 / count;
//     const spins = 5; // Minimum full rotations
    
//     // To land safely in the MIDDLE of the slice, we subtract half the slice angle.
//     // We rotate backwards (negative) to bring the slice to 12 o'clock.
//     // Adding (360 * spins) ensures it spins forward visually if we calculate it right, 
//     // but usually CSS transforms are easier if we just subtract from current or go to a huge positive number.
//     // Let's go POSITIVE (Clockwise Spin):
//     // If we want Index 0 (at top) to stay at top: Rotation = 360 * 5.
//     // If we want Index 1 (at right) to go to top: It needs to travel 330 deg (if 12 slices).
//     // Formula: Target = (360 * spins) - (randomIndex * sliceAngle) - (sliceAngle / 2);
    
//     const newRotation = (360 * spins) - (randomIndex * sliceAngle) - (sliceAngle / 2);

//     // Update State
//     setWheelRotation(newRotation); // CSS will animate to this value
//     setAuctionState('spinning');

//     // 3. Reveal after 4 seconds (Transition time)
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

//   const nextSet = () => {
//     if (currentSetIndex < playerSets.length - 1) setCurrentSetIndex(prev => prev + 1);
//     else {
//        if(unsoldPlayers.length > 0 && window.confirm("Sets Finished. Start Unsold Round?")) {
//           if(startUnsoldRound()) setCurrentSetIndex(0);
//        } else if (canFinishAuction()) {
//           setCurrentPage('summary');
//        }
//     }
//   };

//   // --- GRADIENT GENERATOR ---
//   const getWheelGradient = () => {
//     const count = currentSet.players.length;
//     // Distinct colors for slices
//     const colors = ['#f54242', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#34495e'];
//     let gradient = 'conic-gradient(';
//     const slice = 100 / count;
    
//     for(let i=0; i<count; i++) {
//       const c = colors[i % colors.length];
//       gradient += `${c} ${slice * i}% ${slice * (i+1)}%,`;
//     }
//     return gradient.slice(0, -1) + ')';
//   };

//   if (!currentSet) return <div>Loading...</div>;

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
          
//           {/* STATE 1: WHEEL SPINNING */}
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
//                         {/* Render Labels: Positioned relative to center */}
//                         {currentSet.players.length <= 16 && currentSet.players.map((p, i) => {
//                           // Angle to place text: Middle of the slice
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
//                       <button className="btn-finish" onClick={() => setCurrentPage('summary')} disabled={!canFinishAuction()}>Finish Auction</button>
//                    )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* STATE 2: PLAYER REVEALED */}
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

//         {/* RIGHT: STATS */}
//         <div className="team-stats-panel">
//           <div style={{display:'flex', gap:'5px', marginBottom:'15px'}}>
//             <button onClick={()=>setActiveTab('standings')} style={{flex:1, padding:'5px', background: activeTab==='standings'?'#667eea':'#eee', color: activeTab==='standings'?'white':'#333', border:'none', borderRadius:'5px'}}>Teams</button>
//             <button onClick={()=>setActiveTab('setList')} style={{flex:1, padding:'5px', background: activeTab==='setList'?'#667eea':'#eee', color: activeTab==='setList'?'white':'#333', border:'none', borderRadius:'5px'}}>Set</button>
//             <button onClick={()=>setActiveTab('unsoldList')} style={{flex:1, padding:'5px', background: activeTab==='unsoldList'?'#667eea':'#eee', color: activeTab==='unsoldList'?'white':'#333', border:'none', borderRadius:'5px'}}>Unsold</button>
//           </div>
//           <div style={{overflowY:'auto', maxHeight:'500px'}}>
//              {activeTab === 'standings' && activeTeams.map(t => (
//                <div key={t.name} className="mini-team-card" style={{borderLeftColor: t.color}}>
//                  <div style={{display:'flex', justifyContent:'space-between'}}><strong>{t.abbr}</strong><small>{t.squad.length}/{config.maxPlayers}</small></div>
//                  <div className="progress-bar"><div className="progress-fill" style={{width: `${(t.squad.length/config.maxPlayers)*100}%`, background: t.color}}></div></div>
//                  <small>Rem: {t.budget}L</small>
//                </div>
//              ))}
//              {activeTab === 'setList' && (
//                <ul style={{listStyle:'none', padding:0}}>
//                  {currentSet?.players.map(p => <li key={p.id} style={{padding:'8px', borderBottom:'1px solid #eee', fontSize:'0.9rem'}}>{p.name}</li>)}
//                </ul>
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