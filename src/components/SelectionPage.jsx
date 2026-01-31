import React, { useState } from 'react';
import { useAuction } from '../context/AuctionContext';

const SelectionPage = () => {
  const { importPlayersBulk, setCurrentPage } = useAuction();
  const [loading, setLoading] = useState(false);

  // --- OPTION 1: PARSE UPLOADED FILE ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      parseAndLoad(event.target.result);
    };
    reader.readAsText(file);
  };

  // --- OPTION 2: FETCH PRE-DEFINED DATASET ---
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

  // --- COMMON PARSER LOGIC ---
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
      importPlayersBulk(playersToImport);
      setLoading(false);
      setCurrentPage('review'); // NAVIGATE TO REVIEW PAGE
    } else {
      alert("No valid data found.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="transition-overlay">
        <div className="pulsate">🏏</div>
        <h2>Loading Dataset...</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{maxWidth: '800px', marginTop: '50px'}}>
      <div className="header">
        <h1>📂 Select Player Pool</h1>
        <p>Choose how you want to load players for this auction.</p>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '30px'}}>
        
        {/* CARD 1: OFFICIAL DATASETS */}
        <div style={{
          background: 'white', padding: '30px', borderRadius: '15px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)', textAlign: 'center',
          border: '2px solid #667eea'
        }}>
          <div style={{fontSize: '3rem', marginBottom: '10px'}}>🏆</div>
          <h2 style={{color: '#333'}}>Official Datasets</h2>
          <p style={{color: '#666', marginBottom: '20px', fontSize: '0.9rem'}}>Select a pre-configured player list.</p>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button className="primary-btn" onClick={() => loadDataset('mega.csv')}>
              Load Mega Auction
            </button>
            <button className="primary-btn" style={{background: '#4b5563'}} onClick={() => loadDataset('2026.csv')}>
              Load Auction 2026 (Retention)
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
          <h2 style={{color: '#333'}}>Import Your Own</h2>
          <p style={{color: '#666', marginBottom: '20px', fontSize: '0.9rem'}}>Upload a custom CSV file.</p>
          
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
          <p style={{fontSize:'0.75rem', marginTop:'10px', color:'#999'}}>
            Format: Name, Set, Role, Country, Price, Img
          </p>
        </div>

      </div>

      <div style={{textAlign: 'center', marginTop: '40px'}}>
        <button 
          onClick={() => setCurrentPage('landing')}
          style={{background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', textDecoration: 'underline'}}
        >
          ← Back to Team Setup
        </button>
      </div>
    </div>
  );
};

export default SelectionPage;