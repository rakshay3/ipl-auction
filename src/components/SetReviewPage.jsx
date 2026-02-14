import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const SetReviewPage = () => {
  const { 
    playerSets, isHost, socket, connectedUsers, 
    addPlayerToSet, deletePlayerFromSet, startAuction, toggleReady,
    currentSetIndex, setCurrentSetIndex 
  } = useAuction(); 

  const [isStarting, setIsStarting] = useState(false);

  // Local State for Manual Add
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerType, setNewPlayerType] = useState("Batsman");
  const [newPlayerPrice, setNewPlayerPrice] = useState(50);
  const [newPlayerImg, setNewPlayerImg] = useState("");
  const [isForeign, setIsForeign] = useState(false);

  const currentSet = playerSets && playerSets[currentSetIndex] ? playerSets[currentSetIndex] : { players: [] };
  
  // Status Checks
  const myUser = connectedUsers.find(u => u.id === socket?.id);
  const isMeReady = myUser?.isReady || false;
  
  const bidders = connectedUsers.filter(u => !u.isHost);
  const allReady = bidders.length > 0 && bidders.every(u => u.isReady);

  const handleStartAuction = () => {
    if (!allReady) return alert("Wait for all bidders to be ready!");
    setIsStarting(true);
    setCurrentSetIndex(0);
    startAuction();
  };

  if (isStarting) return <div className="transition-overlay"><div className="pulsate">🏏</div><h2>Starting Auction...</h2></div>;

  if(!playerSets || playerSets.length === 0) {
      return (
          <div className="container" style={{textAlign:'center', marginTop:'50px', color:'white'}}>
              <h2>Waiting for Data...</h2>
          </div>
      )
  }

  return (
    <div className="container">
      
      {/* --- READY DASHBOARD --- */}
      <div style={{
          background: isHost ? '#fff' : (isMeReady ? '#dcfce7' : '#fee2e2'),
          padding: '15px', 
          borderRadius: '10px', 
          marginBottom: '20px',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
          {isHost ? (
             <div style={{display:'flex', gap:'20px', alignItems:'center', width:'100%'}}>
                <strong style={{color:'#333'}}>📢 Lobby Status:</strong>
                <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                   {bidders.map(u => (
                     <span key={u.id} style={{
                         padding:'5px 10px', 
                         borderRadius:'20px', 
                         fontSize:'0.85rem',
                         background: u.isReady ? '#22c55e' : '#e5e7eb',
                         color: u.isReady ? 'white' : '#666'
                     }}>
                        {u.name} {u.isReady ? '✓' : '⏳'}
                     </span>
                   ))}
                </div>
                {bidders.length === 0 && <span style={{color:'#999'}}>No bidders connected</span>}
             </div>
          ) : (
             <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                 <div>
                    <h3 style={{margin:0, color: isMeReady ? '#166534' : '#991b1b'}}>
                        {isMeReady ? "✅ You are Ready!" : "⚠️ Please Confirm Readiness"}
                    </h3>
                    <p style={{margin:0, fontSize:'0.9rem', color:'#666'}}>
                        {isMeReady ? "Waiting for host to start..." : "Review the list below and click Ready."}
                    </p>
                 </div>
                 <button 
                    onClick={toggleReady}
                    style={{
                        padding: '12px 30px', 
                        borderRadius: '30px', 
                        border: 'none', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        fontSize: '1rem',
                        background: isMeReady ? '#bbf7d0' : '#ef4444',
                        color: isMeReady ? '#166534' : 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                 >
                    {isMeReady ? "UNDO READY" : "I AM READY"}
                 </button>
             </div>
          )}
      </div>

      <div className="pool-container">
        <div className="pool-card" style={{gridColumn: 'span 3'}}>
          <div className="nav-header">
            <button className="nav-btn" disabled={currentSetIndex === 0} onClick={() => setCurrentSetIndex(p => p - 1)}>← Prev Set</button>
            <h2 style={{ color: '#667eea' }}>{currentSet.setName || "Set"} ({currentSet.players.length})</h2>
            <button className="nav-btn" disabled={currentSetIndex === playerSets.length - 1} onClick={() => setCurrentSetIndex(p => p + 1)}>Next Set →</button>
          </div>

          <div style={{display: 'flex', gap: '20px', height: '100%'}}>
            {/* LEFT: LIST */}
            <div style={{flex: 2, overflowY: 'auto', maxHeight: '500px', border: '1px solid #eee', borderRadius: '10px'}}>
              <ul className="pool-list">
                {currentSet.players.map(p => (
                  <li key={p.id} className="pool-item" style={{display:'flex', alignItems:'center'}}>
                    <img src={p.img || DEFAULT_AVATAR} alt="avatar" style={{width:'30px', height:'30px', borderRadius:'50%', marginRight:'10px', objectFit:'cover'}} />
                    <div style={{flex:1}}>
                      <strong>{p.name}</strong> <small>({p.type} | {p.basePrice} Cr)</small>
                      {p.isForeign && <span style={{fontSize:'0.8rem', marginLeft:'5px'}}>✈️</span>}
                    </div>
                    {isHost && (
                        <button onClick={() => deletePlayerFromSet(currentSetIndex, p.id)} style={{background:'#fee2e2', color:'red', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Delete</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* RIGHT: MANUAL ADD (HOST ONLY) */}
            {isHost && (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>
                  <div style={{background: '#f9fafb', padding: '20px', borderRadius: '10px', border:'1px solid #eee'}}>
                    <h4 style={{marginTop:0}}>Add Single Player</h4>
                    <input type="text" placeholder="Name" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}/>
                    <select value={newPlayerType} onChange={e => setNewPlayerType(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}>
                      <option>Batsman</option><option>Bowler</option><option>All-Rounder</option><option>Wicket Keeper</option>
                    </select>
                    <input type="text" placeholder="Image URL" value={newPlayerImg} onChange={e => setNewPlayerImg(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}/>
                    <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px'}}>
                      <input type="checkbox" checked={isForeign} onChange={e => setIsForeign(e.target.checked)} style={{width:'auto'}} /> Foreign Player?
                    </label>
                    <input type="number" placeholder="Base Price" value={newPlayerPrice} onChange={e => setNewPlayerPrice(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
                    <button className="primary-btn" onClick={() => {
                        if (!newPlayerName) return alert("Enter name");
                        addPlayerToSet(currentSetIndex, {
                          id: Date.now(), name: newPlayerName, type: newPlayerType, 
                          country: isForeign ? "Foreign" : "India", isForeign: isForeign, 
                          basePrice: parseFloat(newPlayerPrice), img: newPlayerImg || ""
                        });
                        setNewPlayerName("");
                    }}>+ Add Player</button>
                  </div>
                </div>
            )}
          </div>
          
          <div style={{marginTop: '20px', textAlign:'right'}}>
            {isHost && (
                <button 
                    className="primary-btn" 
                    onClick={handleStartAuction}
                    disabled={!allReady}
                    style={{
                        opacity: allReady ? 1 : 0.5, 
                        cursor: allReady ? 'pointer' : 'not-allowed',
                        background: allReady ? '#2563eb' : '#9ca3af'
                    }}
                >
                    {allReady ? "START AUCTION →" : `WAITING FOR PLAYERS (${bidders.filter(u=>u.isReady).length}/${bidders.length})`}
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetReviewPage;