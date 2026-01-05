import React from 'react';
import { useAuction } from '../context/AuctionContext';

const SummaryPage = () => {
  const { activeTeams, unsoldPlayers, setCurrentPage } = useAuction();

  // Safety Check: If page accessed directly or state lost
  if (!activeTeams || activeTeams.length === 0) {
    return (
      <div className="container" style={{textAlign:'center', padding:'50px'}}>
        <h2>No Auction Data Found</h2>
        <button className="primary-btn" onClick={() => window.location.reload()}>Go to Home</button>
      </div>
    );
  }

  const downloadCSV = () => {
    let csv = 'Team,Players Acquired,Total Spent,Remaining Budget\n';
    activeTeams.forEach(team => {
      const playerNames = team.squad.map(p => p.name).join(' | ');
      csv += `"${team.name}","${playerNames}",${team.spent},${team.budget}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipl_auction_results.csv';
    a.click();
  };

  return (
    <div className="container" style={{paddingTop: '40px'}}>
      <div className="header">
        <h1>🏆 Final Results</h1>
        <button className="primary-btn" style={{width:'auto', marginBottom:'20px'}} onClick={() => setCurrentPage('landing')}>New Auction</button>
      </div>

      {unsoldPlayers && unsoldPlayers.length > 0 && (
        <div style={{background: '#fff5f5', padding: '20px', borderRadius: '10px', border:'1px solid #feb2b2', marginBottom:'30px'}}>
          <h3 style={{color: '#9b2c2c', marginTop:0}}>Unsold Players ({unsoldPlayers.length})</h3>
          <p>{unsoldPlayers.map(p => p.name).join(', ')}</p>
        </div>
      )}

      <div className="setup-grid">
        {activeTeams.map(team => (
          <div key={team.name} style={{
            background: 'white', borderRadius: '12px', padding: '20px',
            borderTop: `5px solid ${team.color || '#667eea'}`, boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{marginTop:0}}>{team.name}</h2>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px', fontWeight:'bold', color:'#555'}}>
              <span>Spent: {team.spent}L</span>
              <span>Rem: {team.budget}L</span>
            </div>
            <ul style={{paddingLeft:'20px', fontSize:'0.9rem'}}>
              {team.squad.map((p, i) => <li key={i}>{p.name} - {p.soldPrice}L</li>)}
            </ul>
          </div>
        ))}
      </div>
      
      <div style={{textAlign:'center', marginTop:'30px'}}>
        <button className="primary-btn" onClick={downloadCSV} style={{width:'auto'}}>⬇️ Download CSV</button>
      </div>
    </div>
  );
};

export default SummaryPage;