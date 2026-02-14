import React, { useState, useEffect, useRef } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const AuctionPage = () => {
  const { 
    isHost, socket,
    activeTeams, playerSets, unsoldPlayers, config, 
    currentAuctionState, feed, 
    startAutoLoop, placeBid, pauseGame, withdrawBid, requestTime, changeTimer,
    currentSetIndex, canFinishAuction,
    sellPlayer, markUnsold,
    voteFinish, finishVotes, endRoom,
    deletePlayerFromSet, deleteSet,
    sendMessage // <--- NEW
  } = useAuction();

  const { 
    currentPlayer, currentBid, currentBidder, 
    timer, status, activeBidders = [], isPaused 
  } = currentAuctionState;

  const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : null;
  const myTeam = activeTeams.find(t => t.ownerId === socket?.id);
  
  // Local State
  const [newTimerVal, setNewTimerVal] = useState(45);
  const [rightTab, setRightTab] = useState('teams'); 
  const [expandedTeamId, setExpandedTeamId] = useState(null); 
  const [expandedSetIndex, setExpandedSetIndex] = useState(currentSetIndex);
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const feedRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; 
  }, [feed]);

  useEffect(() => {
    setExpandedSetIndex(currentSetIndex);
  }, [currentSetIndex]);

  // --- LOGIC ---
  const isMyBid = currentBidder === myTeam?.name;
  const isInWar = activeBidders && activeBidders.includes(myTeam?.name);
  const isLockedOut = activeBidders.length >= 2 && !isInWar;

  let nextBid;
  if (currentBid === 0) {
      nextBid = currentPlayer ? parseFloat(currentPlayer.basePrice) : 0;
  } else {
      let increment = currentBid < 10 ? 0.20 : 0.25;
      nextBid = parseFloat((currentBid + increment).toFixed(2));
  }

  const handleSendChat = (e) => {
      e.preventDefault();
      if(!chatInput.trim()) return;
      sendMessage(chatInput);
      setChatInput("");
  };

  const getTeamStats = (team) => {
      const bats = team.squad.filter(p => p.type === 'Batsman' || p.type === 'Wicket Keeper').length;
      const bowls = team.squad.filter(p => p.type === 'Bowler' || p.type === 'All-Rounder').length;
      const percentUsed = ((config.budget - team.budget) / config.budget) * 100;
      return { bats, bowls, percentUsed };
  };

  const toggleTeamView = (teamId) => {
      if (expandedTeamId === teamId) setExpandedTeamId(null);
      else setExpandedTeamId(teamId);
  };

  const toggleSetView = (idx) => {
      if (expandedSetIndex === idx) setExpandedSetIndex(null);
      else setExpandedSetIndex(idx);
  };

  if (!currentSet) return <div className="container" style={{color:'white', textAlign:'center', marginTop:'50px'}}><h2>Loading Set...</h2></div>;

  return (
    <div className="container">
      {/* HEADER */}
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
        <div>
          <h1 style={{margin:0, color:'white'}}>🔨 Live Auction</h1>
          <p style={{margin:0, opacity:0.7, color:'white'}}>Set: {currentSet.setName} ({currentSet.players.length} remaining)</p>
        </div>
        
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            
            {/* VOTE FINISH BUTTON */}
            <button 
                className="btn-finish" 
                onClick={voteFinish}
                disabled={!canFinishAuction()}
                style={{
                    background: finishVotes.includes(socket?.id) ? '#22c55e' : (canFinishAuction() ? '#2563eb' : '#9ca3af'),
                    opacity: canFinishAuction() ? 1 : 0.6,
                    cursor: canFinishAuction() ? 'pointer' : 'not-allowed',
                    border: finishVotes.includes(socket?.id) ? '2px solid white' : 'none',
                    minWidth: '100px', fontSize:'0.8rem', padding:'10px'
                }}
            >
                {finishVotes.includes(socket?.id) ? `✅ Voted` : `🏁 Finish`}
            </button>

            {/* HOST CONTROLS */}
            {isHost && (
                <>
                   {/* 1. COMPACT ADMIN ACTIONS (Sell/Unsold) */}
                   <div style={{display:'flex', flexDirection:'column', gap:'3px'}}>
                       <button 
                           onClick={() => sellPlayer(currentPlayer, currentBidder, currentBid)} 
                           disabled={!currentBidder}
                           style={{
                               background: currentBidder ? '#22c55e' : '#9ca3af', 
                               color:'white', border:'none', padding:'4px 8px', borderRadius:'4px', 
                               fontSize:'0.7rem', cursor: currentBidder ? 'pointer' : 'not-allowed',
                               fontWeight:'bold', letterSpacing:'1px'
                           }}
                           title="Force Sell to Current Bidder"
                       >
                           ⚡ SELL
                       </button>
                       <button 
                           onClick={() => markUnsold(currentPlayer)} 
                           style={{
                               background:'#ef4444', color:'white', border:'none', padding:'4px 8px', 
                               borderRadius:'4px', fontSize:'0.7rem', cursor:'pointer',
                               fontWeight:'bold', letterSpacing:'1px'
                           }}
                           title="Force Mark Unsold"
                       >
                           ✕ UNSOLD
                       </button>
                   </div>

                   {/* 2. TIMER SETTING */}
                   <div style={{background:'rgba(255,255,255,0.2)', padding:'5px', borderRadius:'5px', display:'flex', gap:'5px', alignItems:'center'}}>
                      <input 
                        type="number" 
                        value={newTimerVal} 
                        onChange={(e) => setNewTimerVal(e.target.value)} 
                        style={{width:'35px', padding:'2px', borderRadius:'3px', border:'none', textAlign:'center', fontSize:'0.9rem'}} 
                      />
                      <button onClick={() => changeTimer(newTimerVal)} style={{cursor:'pointer', background:'white', border:'none', borderRadius:'3px', padding:'2px 6px', fontSize:'0.8rem'}}>Set</button>
                   </div>
                   
                   {/* 3. PAUSE (Icon) */}
                   <button 
                      onClick={pauseGame} 
                      style={{
                          background: isPaused ? '#f59e0b' : '#3b82f6', 
                          width:'40px', height:'40px', borderRadius:'50%', 
                          border:'2px solid white', cursor:'pointer', 
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'1.2rem', color:'white', boxShadow:'0 2px 5px rgba(0,0,0,0.2)'
                      }} 
                      title={isPaused ? "Resume Game" : "Pause Game"}
                   >
                      {isPaused ? "▶" : "⏸"}
                   </button>
                   
                   {/* 4. END ROOM (Icon) */}
                   <button 
                      onClick={() => { if(window.confirm("DANGER: End Room?")) endRoom(); }} 
                      style={{
                          background: '#ef4444', color:'white', border:'2px solid white', 
                          width:'40px', height:'40px', borderRadius:'50%', 
                          cursor:'pointer', fontWeight:'bold', fontSize:'1.2rem',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          boxShadow:'0 2px 5px rgba(0,0,0,0.2)'
                      }} 
                      title="Force Close Room"
                   >
                      ⛔
                   </button>
                </>
            )}
        </div>
      </div>

      <div className="auction-layout" style={{gridTemplateColumns: '1.2fr 1.8fr 1fr', gap:'20px'}}>
        
        {/* --- LEFT PANEL: CHAT & CONTROLS --- */}
        <div className="auction-controls" style={{display:'flex', flexDirection:'column', height:'600px', background:'#f8f9fa', borderRadius:'10px', overflow:'hidden', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
           
           {/* 1. TOP BAR: Team Identity & Actions */}
           <div style={{padding:'15px', background:'white', borderBottom:'1px solid #e5e7eb'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                    <strong style={{fontSize:'1.1rem', color:'#1e3a8a'}}>
                        {myTeam ? myTeam.abbr : (isHost ? "HOST" : "Spectator")}
                    </strong>
                    {myTeam && <span style={{fontSize:'0.8rem', background:'#dbeafe', color:'#1e40af', padding:'2px 8px', borderRadius:'10px'}}>Owner</span>}
                </div>
                
                {/* Action Buttons */}
                {myTeam && (
                    <div style={{display:'flex', gap:'5px'}}>
                         <button 
                            onClick={requestTime} 
                            disabled={status !== 'REVEALED' || isPaused} 
                            style={{flex:1, background:'#3b82f6', color:'white', border:'none', padding:'8px', borderRadius:'5px', cursor:'pointer', fontSize:'0.8rem', opacity: status !== 'REVEALED' ? 0.5 : 1}}
                         >
                            ⏱ Need Time
                         </button>
                         {isInWar && !isMyBid && (
                             <button 
                                onClick={withdrawBid} 
                                style={{flex:1, background:'#ef4444', color:'white', border:'none', padding:'8px', borderRadius:'5px', cursor:'pointer', fontSize:'0.8rem'}}
                             >
                                🏃 Withdraw
                             </button>
                         )}
                    </div>
                )}
           </div>

           {/* 2. CHAT AREA (Scrollable) */}
           <div ref={feedRef} style={{flex:1, overflowY:'auto', padding:'10px', display:'flex', flexDirection:'column', gap:'8px', background:'#f3f4f6'}}>
              {feed.length === 0 && <div style={{textAlign:'center', color:'#9ca3af', marginTop:'20px', fontSize:'0.9rem'}}>Chat is empty...</div>}
              
              {feed.map((item, i) => {
                  const isChat = item.type === 'CHAT';
                  const isMe = item.sender === (myTeam ? myTeam.abbr : (isHost ? "HOST" : "Spectator")); // Simple check
                  
                  if (!isChat) {
                      // SYSTEM MESSAGES (Bids, Sales, Errors)
                      return (
                          <div key={i} style={{textAlign:'center', margin:'5px 0'}}>
                              <span style={{
                                  background: item.type === 'BID' ? '#dbeafe' : (item.type === 'SUCCESS' ? '#dcfce7' : '#fee2e2'), 
                                  color: item.type === 'BID' ? '#1e40af' : (item.type === 'SUCCESS' ? '#166534' : '#991b1b'),
                                  padding:'4px 12px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold', display:'inline-block'
                              }}>
                                  {item.msg}
                              </span>
                          </div>
                      );
                  } else {
                      // USER CHAT BUBBLES
                      return (
                          <div key={i} style={{alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth:'85%'}}>
                              {!isMe && <div style={{fontSize:'0.7rem', color:'#6b7280', marginLeft:'5px', marginBottom:'2px'}}>{item.sender}</div>}
                              <div style={{
                                  background: isMe ? '#2563eb' : 'white',
                                  color: isMe ? 'white' : '#1f2937',
                                  padding:'8px 12px', borderRadius:'12px',
                                  borderBottomRightRadius: isMe ? '2px' : '12px',
                                  borderBottomLeftRadius: isMe ? '12px' : '2px',
                                  boxShadow:'0 1px 2px rgba(0,0,0,0.1)', fontSize:'0.9rem'
                              }}>
                                  {item.msg}
                              </div>
                          </div>
                      );
                  }
              })}
           </div>

           {/* 3. CHAT INPUT */}
           <form onSubmit={handleSendChat} style={{padding:'10px', background:'white', borderTop:'1px solid #e5e7eb', display:'flex', gap:'5px'}}>
               <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..." 
                  style={{flex:1, padding:'8px 12px', borderRadius:'20px', border:'1px solid #d1d5db', outline:'none'}}
               />
               <button type="submit" style={{background:'#2563eb', color:'white', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  ➤
               </button>
           </form>
        </div>

        {/* CENTER PANEL */}
        <div className="player-card-section" style={{position:'relative'}}>
          {isPaused && (
              <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.7)', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'15px'}}>
                  <h1 style={{color:'white', fontSize:'4rem', margin:0}}>PAUSED</h1>
              </div>
          )}

          {status === 'IDLE' ? (
             <div style={{textAlign:'center', marginTop:'50px'}}>
                <div style={{fontSize:'80px', opacity:0.3, marginBottom:'20px'}}>🏏</div>
                {isHost ? (
                    <button className="primary-btn" onClick={startAutoLoop} style={{padding:'20px 40px', fontSize:'1.5rem', borderRadius:'50px', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>START SET</button>
                ) : <h3 style={{color:'white'}}>Waiting for Host to start set...</h3>}
             </div>
          ) : (
             <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                 {status === 'SOLD_ANIMATION' ? (
                     <div className="fade-in" style={{textAlign:'center', marginTop:'50px'}}>
                         <h1 style={{fontSize:'5rem', color: currentBidder ? '#22c55e' : '#ef4444', margin:0, textShadow:'0 5px 15px rgba(0,0,0,0.3)'}}>{currentBidder ? "SOLD" : "UNSOLD"}</h1>
                         {currentBidder && <h3 style={{color:'white', fontSize:'2rem'}}>to {currentBidder} for {currentBid} Cr</h3>}
                         <p style={{color:'#ccc'}}>Next player in 5s...</p>
                     </div>
                 ) : (
                     <>
                        <div style={{position:'absolute', top:'10px', right:'10px', background: timer <= 10 ? '#ef4444' : '#333', color:'white', width:'70px', height:'70px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'2rem', boxShadow:'0 5px 15px rgba(0,0,0,0.3)', border:'4px solid white', zIndex:5}}>{timer}</div>
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

                        {myTeam && (
                            isLockedOut ? (
                                <button disabled style={{background:'#6b7280', color:'white', border:'none', padding:'20px 60px', borderRadius:'50px', fontSize:'1.5rem', cursor:'not-allowed'}}>🔒 LOCKED OUT</button>
                            ) : (
                                <button onClick={() => placeBid(nextBid)} disabled={isMyBid} style={{background: isMyBid ? '#22c55e' : '#2563eb', color:'white', border:'none', padding:'20px 60px', borderRadius:'50px', fontSize:'2rem', fontWeight:'bold', cursor: isMyBid ? 'default' : 'pointer', transform: isMyBid ? 'none' : 'scale(1.05)', boxShadow:'0 10px 30px rgba(0,0,0,0.3)', transition: 'all 0.1s'}}>
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

        {/* --- RIGHT PANEL --- */}
        <div className="team-stats-panel" style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          
          <div style={{borderBottom:'1px solid #ddd', paddingBottom:'10px'}}>
              <h4 style={{margin:'0 0 10px 0'}}>⚔️ Active Battle</h4>
              {activeBidders.length === 0 && <small style={{color:'#999', fontStyle:'italic'}}>No active bid war</small>}
              {activeBidders.map(teamName => (
                  <div key={teamName} style={{padding:'8px', background:'#fee2e2', color:'#991b1b', marginBottom:'8px', borderRadius:'6px', border:'1px solid #fca5a5', fontWeight:'bold', display:'flex', alignItems:'center', gap:'10px'}}>
                      <div className="pulsate" style={{width:'8px', height:'8px', background:'red', borderRadius:'50%'}}></div>
                      {teamName}
                  </div>
              ))}
          </div>

          <div style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
              {['teams', 'set', 'unsold'].map(tab => (
                  <button key={tab} onClick={() => setRightTab(tab)} style={{flex:1, padding:'8px', cursor:'pointer', border:'none', borderRadius:'5px', background: rightTab === tab ? '#2563eb' : '#e5e7eb', color: rightTab === tab ? 'white' : '#666', fontWeight:'bold', textTransform:'capitalize'}}>
                      {tab}
                  </button>
              ))}
          </div>

          <div style={{flex:1, overflowY:'auto', maxHeight:'500px'}}>
             
             {/* 1. TEAMS VIEW */}
             {rightTab === 'teams' && (
                 <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                     {activeTeams
                        .sort((a,b) => b.budget - a.budget)
                        .map(t => {
                             const stats = getTeamStats(t);
                             const isExpanded = expandedTeamId === t.id;
                             return (
                                 <div key={t.id} style={{background:'white', borderRadius:'8px', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
                                     <div onClick={() => toggleTeamView(t.id)} style={{padding:'10px', cursor:'pointer', borderLeft: `5px solid ${t.color}`, background: isExpanded ? '#f8fafc' : 'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <div>
                                            <strong style={{fontSize:'1rem', display:'block'}}>{t.abbr}</strong>
                                            <small style={{color:'#666'}}>{t.squad.length}/{config.maxPlayers} Players</small>
                                        </div>
                                        <div style={{textAlign:'right'}}>
                                            <div style={{fontWeight:'bold', color: t.budget < 10 ? 'red' : '#166534'}}>{t.budget} Cr</div>
                                            <small style={{fontSize:'0.7rem', color:'#3b82f6'}}>{isExpanded ? "Hide" : "View"}</small>
                                        </div>
                                     </div>
                                     {isExpanded && (
                                         <div style={{borderTop:'1px solid #eee', background:'#f8f9fa', padding:'10px'}}>
                                             <div style={{marginBottom:'5px', fontSize:'0.75rem', color:'#666'}}>Foreign: {t.foreignCount}/{config.maxForeign}</div>
                                             {t.squad.length === 0 ? <small style={{fontStyle:'italic', color:'#999'}}>No players yet</small> : (
                                                 <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                                     {t.squad.map(p => (
                                                         <div key={p.id} style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', borderBottom:'1px solid #e5e7eb', paddingBottom:'2px'}}>
                                                             <span>{p.name}</span>
                                                             <span style={{fontWeight:'bold', color:'#333'}}>{p.soldPrice}</span>
                                                         </div>
                                                     ))}
                                                 </div>
                                             )}
                                         </div>
                                     )}
                                 </div>
                             );
                     })}
                 </div>
             )}

             {/* 2. SET VIEW */}
             {rightTab === 'set' && (
                 <div>
                     {/* Current Set */}
                     <div style={{marginBottom:'5px', background:'white', borderRadius:'8px', overflow:'hidden', border:'2px solid #2563eb'}}>
                         <div 
                             onClick={() => toggleSetView(currentSetIndex)}
                             style={{padding:'10px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background: expandedSetIndex === currentSetIndex ? '#f0f9ff' : 'white'}}
                         >
                             <span style={{color:'#1e3a8a', fontWeight:'bold', fontSize:'0.9rem'}}>▶ Current: {currentSet.setName}</span>
                             <span style={{background:'#dbeafe', color:'#1e40af', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>{currentSet.players.length}</span>
                         </div>
                         
                         {expandedSetIndex === currentSetIndex && (
                             <ul style={{listStyle:'none', padding:0, margin:0, background:'#fff', borderTop:'1px solid #eee'}}>
                                 {currentSet.players.map(p => (
                                     <li key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px', borderBottom:'1px solid #eee', background: currentPlayer?.id === p.id ? '#eff6ff' : 'white'}}>
                                         <span style={{fontSize:'0.9rem', color: currentPlayer?.id === p.id ? '#1e40af' : '#333'}}>
                                             {p.name} {currentPlayer?.id === p.id && " (Live)"}
                                         </span>
                                         {isHost && <button onClick={() => { if(window.confirm(`Remove ${p.name}?`)) deletePlayerFromSet(currentSetIndex, p.id) }} style={{background:'#fee2e2', color:'red', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer'}}>✕</button>}
                                     </li>
                                 ))}
                                 {currentSet.players.length === 0 && <li style={{color:'#999', padding:'10px', fontSize:'0.8rem'}}>Set Completed</li>}
                             </ul>
                         )}
                     </div>

                     {/* Upcoming Sets */}
                     {playerSets.map((s, idx) => {
                         if(idx <= currentSetIndex) return null; 
                         const isExpanded = expandedSetIndex === idx;
                         return (
                             <div key={idx} style={{marginBottom:'5px', background:'white', borderRadius:'8px', overflow:'hidden', border:'1px solid #eee'}}>
                                 <div 
                                    onClick={() => toggleSetView(idx)}
                                    style={{padding:'10px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', background: isExpanded ? '#f8f9fa' : 'white'}}
                                 >
                                     <span style={{color:'#666', fontWeight:'bold', fontSize:'0.9rem'}}>{s.setName}</span>
                                     <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                         <span style={{background:'#eee', padding:'2px 6px', borderRadius:'10px', fontSize:'0.7rem'}}>{s.players.length}</span>
                                         {isHost && (
                                             <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    if(window.confirm(`Delete entire set "${s.setName}"?`)) deleteSet(idx);
                                                }}
                                                style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem'}} title="Delete Set"
                                             >
                                                 🗑️
                                             </button>
                                         )}
                                     </div>
                                 </div>
                                 
                                 {isExpanded && (
                                     <ul style={{listStyle:'none', padding:0, margin:0, background:'#fafafa', borderTop:'1px solid #eee'}}>
                                         {s.players.map(p => (
                                             <li key={p.id} style={{padding:'8px 10px', borderBottom:'1px solid #eee', fontSize:'0.85rem', color:'#555', display:'flex', justifyContent:'space-between'}}>
                                                 {p.name}
                                                 {isHost && <button onClick={() => { if(window.confirm(`Remove ${p.name}?`)) deletePlayerFromSet(idx, p.id) }} style={{background:'#fee2e2', color:'red', border:'none', borderRadius:'50%', width:'20px', height:'20px', cursor:'pointer'}}>✕</button>}
                                             </li>
                                         ))}
                                     </ul>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             )}

             {/* 3. UNSOLD VIEW */}
             {rightTab === 'unsold' && (
                 <div>
                     {unsoldPlayers.length === 0 ? <p style={{textAlign:'center', color:'#999', marginTop:'20px'}}>No unsold players yet.</p> : (
                         <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                             {unsoldPlayers.map(p => (
                                 <div key={p.id} style={{padding:'10px', background:'#fee2e2', borderRadius:'5px', borderLeft:'4px solid #ef4444'}}>
                                     <div style={{fontWeight:'bold', color:'#991b1b'}}>{p.name}</div>
                                     <div style={{fontSize:'0.8rem', color:'#7f1d1d'}}>{p.type} | Base: {p.basePrice} Cr</div>
                                 </div>
                             ))}
                         </div>
                     )}
                 </div>
             )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuctionPage;