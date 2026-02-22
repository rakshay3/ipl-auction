import React, { useState, useMemo } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers';

const ShortlistPage = () => {
  const { 
    isHost, socket, activeTeams, 
    playerSets, unsoldPlayers, currentSetIndex,
    submitShortlist, confirmFastAuction, 
    teamShortlists, aggregatedShortlist, currentPage 
  } = useAuction();

  const [selectedIds, setSelectedIds] = useState([]);
  
  const myTeam = activeTeams.find(t => t.ownerId === socket?.id);
  const identifier = myTeam ? myTeam.name : (isHost ? 'HOST' : null);
  const hasSubmitted = identifier && teamShortlists[identifier];

  // 1. Combine all available players for selection
  const availablePlayers = useMemo(() => {
    const list = [...unsoldPlayers];
    playerSets.forEach((set, idx) => {
      if (idx >= currentSetIndex) {
         list.push(...set.players.filter(p => !p.status || p.status === 'UNSOLD'));
      }
    });
    // Remove duplicates just in case
    return Array.from(new Map(list.map(p => [p.id, p])).values());
  }, [unsoldPlayers, playerSets, currentSetIndex]);

  // Handle Checkbox
  const togglePlayer = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = () => {
    if (window.confirm(`Submit ${selectedIds.length} players? You cannot change this later.`)) {
      submitShortlist(selectedIds);
    }
  };

  // --- REVIEW PHASE (Host confirms the final list) ---
  if (currentPage === 'shortlist_review') {
      return (
          <div className="container" style={{maxWidth:'800px', marginTop:'50px'}}>
              <div style={{textAlign:'center', background:'white', padding:'30px', borderRadius:'15px', boxShadow:'0 10px 30px rgba(0,0,0,0.1)'}}>
                  <div style={{fontSize:'4rem', marginBottom:'10px'}}>🔥</div>
                  <h1 style={{color:'#ef4444', margin:'0 0 10px 0'}}>Accelerated List Ready!</h1>
                  <p style={{fontSize:'1.2rem', color:'#666'}}>
                      The room has collectively shortlisted <strong>{aggregatedShortlist.length}</strong> players.
                  </p>
                  
                  <div style={{maxHeight:'300px', overflowY:'auto', margin:'20px 0', border:'1px solid #eee', borderRadius:'8px', textAlign:'left'}}>
                      {aggregatedShortlist.map((p, i) => (
                          <div key={p.id} style={{padding:'10px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', background: i%2===0 ? 'white' : '#f9fafb'}}>
                              <span><strong>{i+1}. {p.name}</strong> ({p.type})</span>
                              <span style={{color:'#2563eb', fontWeight:'bold'}}>{p.basePrice} Cr</span>
                          </div>
                      ))}
                  </div>

                  {isHost ? (
                      <button onClick={confirmFastAuction} className="primary-btn" style={{background:'#ef4444', padding:'15px 40px', fontSize:'1.2rem'}}>
                          START ACCELERATED AUCTION 🚀
                      </button>
                  ) : (
                      <h3 style={{color:'#f59e0b'}}>Waiting for Host to start the auction...</h3>
                  )}
              </div>
          </div>
      );
  }

  // --- SELECTION PHASE (Teams pick players) ---
  return (
    <div className="container" style={{padding:'20px'}}>
      <div className="header" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'20px'}}>
          <div>
              <h1 style={{color:'white', margin:0}}>⚡ Select Your Shortlist</h1>
              <p style={{color:'#ccc', margin:0}}>Pick the players you want to nominate for the Accelerated Auction.</p>
          </div>
          <div style={{background:'white', padding:'15px 25px', borderRadius:'10px', textAlign:'center', boxShadow:'0 5px 15px rgba(0,0,0,0.2)'}}>
              <div style={{fontSize:'2rem', fontWeight:'900', color:'#2563eb', lineHeight:1}}>{selectedIds.length}</div>
              <small style={{color:'#666', fontWeight:'bold', textTransform:'uppercase'}}>Selected</small>
          </div>
      </div>

      <div style={{background:'white', borderRadius:'15px', overflow:'hidden', display:'flex', flexDirection:'column', height:'70vh'}}>
          
          {hasSubmitted && (
              <div style={{background:'#dcfce7', color:'#166534', padding:'15px', textAlign:'center', fontWeight:'bold', borderBottom:'1px solid #bbf7d0'}}>
                  ✅ Your list has been submitted! Waiting for other teams...
              </div>
          )}

          <div style={{flex:1, overflowY:'auto', padding:'20px'}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'15px'}}>
                  {availablePlayers.map(p => {
                      const isSelected = selectedIds.includes(p.id);
                      return (
                          <div 
                              key={p.id} 
                              onClick={() => !hasSubmitted && togglePlayer(p.id)}
                              style={{
                                  border: isSelected ? '2px solid #2563eb' : '1px solid #ddd',
                                  background: isSelected ? '#eff6ff' : 'white',
                                  borderRadius:'10px', padding:'10px', cursor: hasSubmitted ? 'not-allowed' : 'pointer',
                                  display:'flex', alignItems:'center', gap:'15px', opacity: hasSubmitted && !isSelected ? 0.5 : 1,
                                  transition:'all 0.2s'
                              }}
                          >
                              {/* Custom Checkbox */}
                              <div style={{width:'20px', height:'20px', borderRadius:'4px', border:'2px solid #2563eb', background: isSelected ? '#2563eb' : 'white', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                  {isSelected && <span style={{color:'white', fontSize:'14px'}}>✓</span>}
                              </div>
                              <img src={p.img || DEFAULT_AVATAR} alt="" style={{width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover'}} />
                              <div>
                                  <div style={{fontWeight:'bold', color:'#333', fontSize:'0.9rem'}}>{p.name}</div>
                                  <div style={{fontSize:'0.75rem', color:'#666'}}>{p.type} | {p.basePrice} Cr</div>
                              </div>
                          </div>
                      );
                  })}
                  {availablePlayers.length === 0 && <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'#999'}}>No players left to select.</div>}
              </div>
          </div>

          <div style={{padding:'20px', background:'#f8f9fa', borderTop:'1px solid #eee', textAlign:'right'}}>
              <button 
                  onClick={handleSubmit} 
                  disabled={hasSubmitted || !identifier}
                  className="primary-btn" 
                  style={{background: hasSubmitted ? '#9ca3af' : '#2563eb', padding:'15px 40px', fontSize:'1.1rem'}}
              >
                  {hasSubmitted ? "SUBMITTED" : "SUBMIT LIST"}
              </button>
          </div>
      </div>
    </div>
  );
};

export default ShortlistPage;