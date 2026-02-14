import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';
import { DEFAULT_AVATAR } from '../data/initialPlayers'; // Import default avatar

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
      // Pass the text content to our parser
      parseAndLoad(event.target.result);
    };
    reader.readAsText(file);
  };

  // Helper to load predefined server files (optional feature)
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
    const lines = csvText.split(/\r?\n/); // Handle Windows/Mac line endings
    const playersToImport = [];

    console.log(`📄 parsing ${lines.length} lines...`);

    lines.forEach((line, index) => {
      // Skip empty lines
      if (!line.trim()) return;

      const parts = line.split(',').map(p => p.trim());
      
      // We expect at least NAME (0) and SET (1)
      if (parts.length >= 2) { 
        const name = parts[0];
        const setName = parts[1];
        
        // Skip header row
        if (!name || name.toLowerCase() === "name" || !setName) return;

        const role = parts[2] || "Unknown";
        const country = parts[3] || "India";
        
        // Price Parsing
        let price = 0.2; 
        const priceRaw = parts[4];
        if (priceRaw) {
            const p = priceRaw.toUpperCase();
            if (p.includes('C')) price = parseFloat(p.replace('C', '')); 
            else if (p.includes('L')) price = parseFloat(p.replace('L', '')) / 100;
            else price = parseFloat(p) / 10000000;
        }

        // --- IMAGE DEBUGGING ---
        const imageRaw = parts[5]; // This is the column we care about
        console.log(`Row ${index}: ${name} -> Image Column: "${imageRaw}"`);

        let finalImage = DEFAULT_AVATAR;
        
        if (imageRaw && imageRaw.length > 3) { // Ensure it's not just a stray character
            if (imageRaw.startsWith('http')) {
                finalImage = imageRaw;
            } else {
                // FORCE THE SLASH to ensure path is absolute relative to public
                finalImage = `/players/${imageRaw}`;
            }
        }

        playersToImport.push({
          targetSetName: setName,
          player: {
            id: Math.random().toString(36).substr(2, 9),
            name, 
            type: role, 
            country,
            isForeign: country.toLowerCase() !== 'india',
            basePrice: price, 
            img: finalImage // <--- Check this in console
          }
        });
      }
    });

    if (playersToImport.length > 0) {
      console.log("✅ Importing players:", playersToImport);
      importPlayersBulk(playersToImport);
    } else {
      alert("No valid data found in CSV.");
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
        
        {/* CARD 1: OFFICIAL DATASETS (Optional) */}
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
            <button className="primary-btn" onClick={() => loadDataset('players_with_images.csv')}>
              Load Players With Images
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
          <p style={{marginTop:'10px', fontSize:'0.8rem', color:'#666'}}>
             Format: Name, Set, Role, Country, Price, Image
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectionPage;