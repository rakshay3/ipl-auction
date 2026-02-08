import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';

const SelectionPage = () => {
  const { importPlayersBulk, roomId, isHost } = useAuction(); 
  const [loading, setLoading] = useState(false);

  // --- BIDDER VIEW (Read-Only) ---
  if (!isHost) {
    return (
      <div className="container" style={{textAlign:'center', marginTop:'100px'}}>
         <div className="pulsate" style={{fontSize:'3rem', marginBottom:'20px'}}>⏳</div>
         <h2 style={{color:'white'}}>Waiting for Host...</h2>
         <p style={{color:'#a5f3fc'}}>The host is selecting the player pool for this auction.</p>
         <div style={{marginTop:'30px', padding:'20px', background:'rgba(255,255,255,0.1)', borderRadius:'10px', display:'inline-block'}}>
            <strong>Room Code:</strong> <span style={{letterSpacing:'2px', marginLeft:'10px', color:'#fde047'}}>{roomId}</span>
         </div>
      </div>
    );
  }

  // --- HOST VIEW (Upload Logic) ---

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      parseAndLoad(event.target.result);
    };
    reader.readAsText(file);
  };

  const loadDataset = async (fileName) => {
    setLoading(true);
    try {
      const response = await fetch(`/data/${fileName}`);
      if (!response.ok) throw new Error("Failed to load dataset");
      const text = await response.text();
      parseAndLoad(text);
    } catch (error) {
      alert("Error loading dataset: " + error.message);
      setLoading(false);
    }
  };

  const parseAndLoad = (csvText) => {
    const lines = csvText.split('\n');
    const playersToImport = [];

    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 4) { 
        const name = parts[0]?.trim();
        const setName = parts[1]?.trim(); 
        const role = parts[2]?.trim();
        const country = parts[3]?.trim();
        const price = parseFloat(parts[4]?.trim()) || 20;
        const img = parts[5]?.trim() || "";

        if (!name || name.toLowerCase() === "name") return;

        if (name && setName) {
          playersToImport.push({
            targetSetName: setName,
            player: {
              id: Date.now() + Math.random(),
              name, type: role, country,
              isForeign: country.toLowerCase() !== 'india',
              basePrice: price, img
            }
          });
        }
      }
    });

    if (playersToImport.length > 0) {
      // 1. Send data to server
      importPlayersBulk(playersToImport);
      setLoading(false);
      
      // NOTE: We do NOT call setCurrentPage('review') here.
      // The server will receive the data, set page to 'review', 
      // and send a STATE_UPDATE which triggers the navigation.
      
    } else {
      alert("No valid data found.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{textAlign:'center', paddingTop:'100px', color:'white'}}>
        <div className="pulsate" style={{fontSize:'3rem'}}>📂</div>
        <h2>Loading Players...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{maxWidth: '900px', marginTop: '30px'}}>
      
      <div className="header">
        <span style={{background:'#22c55e', color:'white', padding:'2px 8px', borderRadius:'4px', fontSize:'0.8rem'}}>HOST CONTROLS</span>
        <h1>Select Player Pool</h1>
        <p>Load players to start the auction.</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px'}}>
        
        {/* CARD 1: OFFICIAL DATASETS */}
        <div style={{
          background: 'white', padding: '30px', borderRadius: '15px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center',
          border: '2px solid #667eea'
        }}>
          <div style={{fontSize: '3rem', marginBottom: '10px'}}>📂</div>
          <h2 style={{color: '#333'}}>Official Datasets</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button className="primary-btn" onClick={() => loadDataset('mega.csv')}>
              Load Mega Auction
            </button>
            <button className="primary-btn" style={{background: '#4b5563'}} onClick={() => loadDataset('2026.csv')}>
              Load Auction 2026
            </button>
          </div>
        </div>

        {/* CARD 2: UPLOAD CSV */}
        <div style={{
          background: 'white', padding: '30px', borderRadius: '15px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center',
          border: '2px dashed #999'
        }}>
          <div style={{fontSize: '3rem', marginBottom: '10px'}}>📤</div>
          <h2 style={{color: '#333'}}>Import CSV</h2>
          <div style={{position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%'}}>
            <button className="primary-btn" style={{background: '#0ea5e9'}}>Choose File</button>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              style={{
                position: 'absolute', left: 0, top: 0, opacity: 0, 
                width: '100%', height: '100%', cursor: 'pointer'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectionPage;