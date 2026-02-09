import React, { useState, useEffect, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const AuctionPage = () => {
  const { 
    isHost, socket,
    activeTeams, playerSets, config, 
    currentAuctionState, feed, 
    startAutoLoop, placeBid, pauseGame, withdrawBid, requestTime, changeTimer,
    currentSetIndex, setCurrentPage, canFinishAuction,
    sellPlayer, markUnsold // Legacy helpers for manual override if needed
  } = useAuction();

  // Destructure State
  const { 
    currentPlayer, currentBid, currentBidder, 
    timer, status, activeBidders = [], isPaused 
  } = currentAuctionState;

  const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;
  const myTeam = activeTeams.find(t => t.ownerId === socket?.id);
  
  // Local State
  const [newTimerVal, setNewTimerVal] = useState(45);
  const feedRef = useRef(null);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0; 
    }
  }, [feed]);

  // --- LOGIC ---
  const isMyBid = currentBidder === myTeam?.name;
  const isInWar = activeBidders && activeBidders.includes(myTeam?.name);
  const isLockedOut = activeBidders.length >= 2 && !isInWar;

  // --- NEXT BID CALCULATION (FIXED) ---
  let nextBid;
  if (currentBid === 0) {
      // First bid must be Base Price
      nextBid = currentPlayer ? parseFloat(currentPlayer.basePrice) : 0;
  } else {
      // Increment Logic
      let increment = currentBid < 10 ? 0.20 : 0.25;
      nextBid = parseFloat((currentBid + increment).toFixed(2));
  }

  // --- RENDER ---

  if (!currentSet) return <div className="container" style={{color:'white', textAlign:'center', marginTop:'50px'}}><h2>Loading Set...</h2></div>;

  return (
    <div className="container">
      {/* HEADER */}
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div>
          <h1 style={{margin:0, color:'white'}}>🔨 Live Auction</h1>
          <p style={{margin:0, opacity:0.7, color:'white'}}>Set: {currentSet.setName} ({currentSet.players.length} remaining)</p>
        </div>
        
        {/* HOST CONTROLS TOP (Global Game State) */}
        <div>
            {isHost && (
                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                   {/* Timer Control */}
                   <div style={{background:'rgba(255,255,255,0.2)', padding:'5px 10px', borderRadius:'5px', display:'flex', gap:'5px', alignItems:'center'}}>
                      <span style={{color:'white', fontSize:'0.8rem'}}>Timer:</span>
                      <input 
                        type="number" 
                        value={newTimerVal} 
                        onChange={(e) => setNewTimerVal(e.target.value)}
                        style={{width:'50px', padding:'5px', borderRadius:'3px', border:'none'}} 
                      />
                      <button onClick={() => changeTimer(newTimerVal)} style={{cursor:'pointer', background:'white', border:'none', borderRadius:'3px', padding:'5px'}}>Set</button>
                   </div>

                   <button className="primary-btn" onClick={pauseGame} style={{background: isPaused ? '#22c55e' : '#f59e0b', minWidth:'100px'}}>
                      {isPaused ? "▶ RESUME" : "⏸ PAUSE"}
                   </button>
                   
                   <button 
                      className="btn-finish" 
                      onClick={() => setCurrentPage('summary')}
                      disabled={!canFinishAuction()}
                      style={{opacity: canFinishAuction() ? 1 : 0.5, cursor: canFinishAuction() ? 'pointer' : 'not-allowed'}}
                   >
                      🏁 Finish
                   </button>
                </div>
            )}
        </div>
      </div>

      <div className="auction-layout" style={{gridTemplateColumns: '1fr 2fr 1fr', gap:'20px'}}>
        
        {/* LEFT: STATUS & CONTROLS */}
        <div className="auction-controls" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
           
           {/* MY TEAM STATUS (Visible to Host AND Bidders) */}
           <div style={{textAlign:'center', padding:'20px', background:'#f8f9fa', borderRadius:'10px'}}>
                <h4>{myTeam ? myTeam.abbr : "Observer Mode"}</h4>
                {myTeam ? (
                    <>
                        <p style={{fontSize:'1.2rem', fontWeight:'bold', color:'#2563eb'}}>Budget: {myTeam.budget} Cr</p>
                        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                            <button 
                                onClick={requestTime}
                                disabled={status !== 'REVEALED' || isPaused}
                                style={{background:'#3b82f6', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer', opacity: status !== 'REVEALED' ? 0.5 : 1}}
                            >
                                ⏱ NEED TIME (+30s)
                            </button>
                            
                            {isInWar && !isMyBid && (
                                <button 
                                    onClick={withdrawBid}
                                    style={{background:'#ef4444', color:'white', border:'none', padding:'12px', borderRadius:'5px', cursor:'pointer'}}
                                >
                                    🏃 WITHDRAW
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <p style={{color:'#666'}}>You have no team. You can watch.</p>
                )}
           </div>

           {/* HOST MANUAL CONTROLS (Only if needed) */}
           {isHost && (
               <div style={{padding:'15px', background:'#fee2e2', borderRadius:'10px'}}>
                   <h5 style={{margin:'0 0 10px 0', color:'#991b1b'}}>⚠️ Admin Override</h5>
                   <div style={{display:'flex', gap:'5px'}}>
                       <button onClick={() => sellPlayer(currentPlayer, currentBidder, currentBid)} disabled={!currentBidder} style={{flex:1, cursor:'pointer', padding:'5px'}}>Force Sell</button>
                       <button onClick={() => markUnsold(currentPlayer)} style={{flex:1, cursor:'pointer', padding:'5px'}}>Force Unsold</button>
                   </div>
               </div>
           )}

           {/* LIVE FEED */}
           <div style={{background:'rgba(0,0,0,0.4)', borderRadius:'10px', padding:'10px', flex:1, display:'flex', flexDirection:'column'}}>
              <h4 style={{color:'white', margin:'0 0 10px 0'}}>📢 Live Feed</h4>
              <div ref={feedRef} style={{flex:1, overflowY:'auto', maxHeight:'300px', display:'flex', flexDirection:'column', gap:'5px'}}>
                  {feed.map((log, i) => (
                      <div key={i} style={{
                          background: log.type === 'BID' ? '#dbeafe' : (log.type === 'SUCCESS' ? '#dcfce7' : (log.type === 'ERROR' ? '#fee2e2' : 'white')),
                          padding:'8px', borderRadius:'5px', fontSize:'0.85rem', color:'#333'
                      }}>
                          <span style={{opacity:0.6, fontSize:'0.7rem', marginRight:'5px'}}>
                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                          </span>
                          {log.msg}
                      </div>
                  ))}
              </div>
           </div>
        </div>

        {/* CENTER: PLAYER CARD */}
        <div className="player-card-section" style={{position:'relative'}}>
          
          {/* PAUSED OVERLAY */}
          {isPaused && (
              <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'15px'}}>
                  <h1 style={{color:'white', fontSize:'4rem', margin:0}}>PAUSED</h1>
              </div>
          )}

          {status === 'IDLE' ? (
             <div style={{textAlign:'center', marginTop:'50px'}}>
                <div style={{fontSize:'80px', opacity:0.3, marginBottom:'20px'}}>🏏</div>
                {isHost ? (
                    <button className="primary-btn" onClick={startAutoLoop} style={{padding:'20px 40px', fontSize:'1.5rem', borderRadius:'50px', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
                        START SET
                    </button>
                ) : <h3 style={{color:'white'}}>Waiting for Host to start set...</h3>}
             </div>
          ) : (
             <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                 
                 {/* SOLD ANIMATION */}
                 {status === 'SOLD_ANIMATION' ? (
                     <div className="fade-in" style={{textAlign:'center', marginTop:'50px'}}>
                         <h1 style={{fontSize:'5rem', color: currentBidder ? '#22c55e' : '#ef4444', margin:0, textShadow:'0 5px 15px rgba(0,0,0,0.3)'}}>
                             {currentBidder ? "SOLD" : "UNSOLD"}
                         </h1>
                         {currentBidder && <h3 style={{color:'white', fontSize:'2rem'}}>to {currentBidder} for {currentBid} Cr</h3>}
                         <p style={{color:'#ccc'}}>Next player in 5s...</p>
                     </div>
                 ) : (
                     // LIVE CARD
                     <>
                        <div style={{
                            position:'absolute', top:'10px', right:'10px', 
                            background: timer <= 10 ? '#ef4444' : '#333', color:'white', 
                            width:'70px', height:'70px', borderRadius:'50%', 
                            display:'flex', alignItems:'center', justifyContent:'center', 
                            fontWeight:'bold', fontSize:'2rem', boxShadow:'0 5px 15px rgba(0,0,0,0.3)',
                            border:'4px solid white', zIndex:5
                        }}>
                            {timer}
                        </div>

                        <div style={{width: '220px', height: '220px', borderRadius: '50%', border: '8px solid #667eea', overflow: 'hidden', marginBottom: '20px', background: 'white', boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}}>
                            <img src={currentPlayer?.img || DEFAULT_AVATAR} alt="p" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                        </div>
                        
                        <h2 style={{fontSize:'2.5rem', margin:'0 0 10px 0'}}>{currentPlayer?.name}</h2>
                        <div style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                             <span className="badge role" style={{fontSize:'1rem', padding:'5px 15px'}}>{currentPlayer?.type}</span>
                             <span className="badge country" style={{fontSize:'1rem', padding:'5px 15px'}}>{currentPlayer?.country}</span>
                        </div>
                        
                        <div style={{background: currentBidder ? '#dbeafe' : '#f3f4f6', padding:'20px 50px', borderRadius:'15px', textAlign:'center', marginBottom:'30px', boxShadow:'inset 0 2px 5px rgba(0,0,0,0.05)'}}>
                            <small style={{color:'#666', textTransform:'uppercase', letterSpacing:'1px'}}>Current Bid</small>
                            <div style={{fontSize:'4rem', fontWeight:'900', color:'#1e3a8a', lineHeight:1}}>{currentBid} <span style={{fontSize:'1.5rem'}}>Cr</span></div>
                            <div style={{color:'#2563eb', fontWeight:'bold', fontSize:'1.2rem', marginTop:'5px'}}>{currentBidder || "No Bids Yet"}</div>
                        </div>

                        {/* BID BUTTON - VISIBLE TO EVERYONE WITH A TEAM (Host Included) */}
                        {myTeam && (
                            isLockedOut ? (
                                <button disabled style={{background:'#6b7280', color:'white', border:'none', padding:'20px 60px', borderRadius:'50px', fontSize:'1.5rem', cursor:'not-allowed'}}>
                                    🔒 LOCKED OUT
                                </button>
                            ) : (
                                <button 
                                    onClick={() => placeBid(nextBid)}
                                    disabled={isMyBid}
                                    style={{
                                        background: isMyBid ? '#22c55e' : '#2563eb', 
                                        color:'white', border:'none', 
                                        padding:'20px 60px', borderRadius:'50px', 
                                        fontSize:'2rem', fontWeight:'bold', cursor: isMyBid ? 'default' : 'pointer',
                                        transform: isMyBid ? 'none' : 'scale(1.05)', 
                                        boxShadow:'0 10px 30px rgba(0,0,0,0.3)',
                                        transition: 'all 0.1s'
                                    }}
                                >
                                    {isMyBid ? "✅ YOU LEAD" : `BID ${nextBid} Cr`}
                                </button>
                            )
                        )}
                        {!myTeam && <div style={{color:'#aaa'}}>Observer Only</div>}
                     </>
                 )}
             </div>
          )}
        </div>

        {/* RIGHT: LEADERBOARD */}
        <div className="team-stats-panel">
          <h4 style={{borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>Active Battle</h4>
          {activeBidders.length === 0 && <small style={{color:'#999', fontStyle:'italic'}}>No active bid war</small>}
          {activeBidders.map(teamName => (
              <div key={teamName} style={{padding:'8px', background:'#fee2e2', color:'#991b1b', marginBottom:'8px', borderRadius:'6px', border:'1px solid #fca5a5', fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px'}}>
                  <div className="pulsate" style={{width:'8px', height:'8px', background:'red', borderRadius:'50%'}}></div>
                  {teamName}
              </div>
          ))}
          
          <h4 style={{marginTop:'20px', borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>Standings</h4>
          <div style={{overflowY:'auto', maxHeight:'400px', display:'flex', flexDirection:'column', gap:'8px'}}>
             {activeTeams.map(t => (
                 <div key={t.name} style={{
                     padding:'10px', borderRadius:'8px', background:'white',
                     borderLeft: `5px solid ${t.color}`,
                     opacity: activeBidders.length === 2 && !activeBidders.includes(t.name) ? 0.4 : 1,
                     transition: 'opacity 0.2s',
                     boxShadow: currentBidder === t.name ? '0 0 0 2px #2563eb' : 'none'
                 }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <strong style={{fontSize:'1.1rem'}}>{t.abbr}</strong>
                        <span style={{background:'#eee', padding:'2px 8px', borderRadius:'10px', fontSize:'0.8rem'}}>{t.squad.length} / {config.maxPlayers}</span>
                    </div>
                    <div style={{fontSize:'0.9rem', color:'#666', marginTop:'2px'}}>Budget: <strong>{t.budget} Cr</strong></div>
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;