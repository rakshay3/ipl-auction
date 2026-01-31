import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const SetReviewPage = () => {
  const { 
    playerSets, setCurrentPage, addPlayerToSet, deletePlayerFromSet, 
    currentSetIndex, setCurrentSetIndex 
  } = useAuction(); // Removed importPlayersBulk from destructuring as it's not used here anymore

  const [isStarting, setIsStarting] = useState(false);

  // Local State for Manual Add
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerType, setNewPlayerType] = useState("Batsman");
  const [newPlayerPrice, setNewPlayerPrice] = useState(50);
  const [newPlayerImg, setNewPlayerImg] = useState("");
  const [isForeign, setIsForeign] = useState(false);

  const currentSet = playerSets[currentSetIndex] || { players: [] };

  const handleAddPlayer = () => {
    if (!newPlayerName) return alert("Enter name");
    const newPlayer = {
      id: Date.now(),
      name: newPlayerName,
      type: newPlayerType,
      country: isForeign ? "Foreign" : "India",
      isForeign: isForeign,
      basePrice: parseFloat(newPlayerPrice),
      img: newPlayerImg || ""
    };
    addPlayerToSet(currentSetIndex, newPlayer);
    setNewPlayerName(""); setNewPlayerImg("");
  };

  const handleStartAuction = () => {
    setIsStarting(true);
    setCurrentSetIndex(0);
    setTimeout(() => setCurrentPage('auction'), 2500);
  };

  if (isStarting) {
    return <div className="transition-overlay"><div className="pulsate">🏏</div><h2>Starting Auction...</h2></div>;
  }

  // Handle case where NO data is loaded (user navigated here manually without selecting data)
  if(!currentSet.setName && playerSets.length <= 1) {
      return (
          <div className="container" style={{textAlign:'center', marginTop:'50px', color:'white'}}>
              <h2>No Players Loaded</h2>
              <button className="primary-btn" onClick={() => setCurrentPage('selection')}>Go to Selection Page</button>
          </div>
      )
  }

  return (
    <div className="container">
      <div className="pool-container">
        <div className="pool-card" style={{gridColumn: 'span 3'}}>
          <div className="nav-header">
            <button className="nav-btn" disabled={currentSetIndex === 0} onClick={() => setCurrentSetIndex(p => p - 1)}>← Prev Set</button>
            <h2 style={{ color: '#667eea' }}>{currentSet.setName} ({currentSet.players.length})</h2>
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
                    <button onClick={() => deletePlayerFromSet(currentSetIndex, p.id)} style={{background:'#fee2e2', color:'red', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>

            {/* RIGHT: MANUAL ADD ONLY */}
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={{background: '#f9fafb', padding: '20px', borderRadius: '10px', border:'1px solid #eee'}}>
                <h4 style={{marginTop:0}}>Add Single Player</h4>
                <input type="text" placeholder="Name" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}/>
                <select value={newPlayerType} onChange={e => setNewPlayerType(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}>
                  <option>Batsman</option><option>Bowler</option><option>All-Rounder</option><option>Wicket Keeper</option>
                </select>
                <input type="text" placeholder="Image URL (Optional)" value={newPlayerImg} onChange={e => setNewPlayerImg(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}}/>
                <label style={{display:'flex', alignItems:'center', gap:'5px', marginBottom:'10px'}}>
                  <input type="checkbox" checked={isForeign} onChange={e => setIsForeign(e.target.checked)} style={{width:'auto'}} /> Foreign Player?
                </label>
                <input type="number" placeholder="Base Price" value={newPlayerPrice} onChange={e => setNewPlayerPrice(e.target.value)} style={{width:'100%', marginBottom:'10px', padding:'8px'}} />
                <button className="primary-btn" onClick={handleAddPlayer}>+ Add Player</button>
              </div>
            </div>
          </div>
          
          <div style={{marginTop: '20px', textAlign:'right'}}>
            <button className="primary-btn" onClick={handleStartAuction}>START AUCTION →</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetReviewPage;