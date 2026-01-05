import React from 'react';
import { useAuction } from '../context/AuctionContext';

const SummaryPage = () => {
  const { activeTeams, unsoldPlayers, setCurrentPage, resetGame } = useAuction();

  // --- SAFETY CHECK 1: HANDLE LOADING/EMPTY DATA ---
  // If activeTeams is null or undefined, show a safe fallback instead of crashing
  if (!activeTeams || activeTeams.length === 0) {
    return (
      <div className="container" style={{textAlign:'center', padding:'50px', color:'white'}}>
        <h1>Waiting for Results...</h1>
        <p>No auction data found yet.</p>
        <div style={{display:'flex', gap:'20px', justifyContent:'center', marginTop:'20px'}}>
             <button className="primary-btn" onClick={() => setCurrentPage('landing')}>Go to Home</button>
             <button className="primary-btn" style={{background:'#e94560'}} onClick={resetGame}>Reset Game</button>
        </div>
      </div>
    );
  }

  // --- CSV DOWNLOAD LOGIC ---
  const downloadCSV = () => {
    let csv = 'Team,Players Acquired,Total Spent,Remaining Budget\n';
    activeTeams.forEach(team => {
      // Safe access to squad names
      const playerNames = team.squad?.map(p => p.name).join(' | ') || "";
      csv += `"${team.name}","${playerNames}",${team.spent || 0},${team.budget || 0}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ipl_auction_results.csv';
    a.click();
  };

  return (
    <div className="container" style={{paddingTop: '40px', paddingBottom: '40px'}}>
      
      {/* HEADER */}
      <div className="header" style={{textAlign: 'center', marginBottom: '40px'}}>
        <h1 style={{fontSize: '2.5rem', marginBottom: '10px', color: 'white'}}>🏆 Final Results</h1>
        <p style={{color: '#ddd'}}>Auction Complete</p>
      </div>

      {/* UNSOLD PLAYERS SECTION (Only shows if players exist) */}
      {unsoldPlayers && unsoldPlayers.length > 0 && (
        <div style={{
          background: '#fff5f5', 
          padding: '20px', 
          borderRadius: '12px', 
          border: '2px solid #feb2b2', 
          marginBottom: '30px'
        }}>
          <h3 style={{color: '#9b2c2c', marginTop: 0}}>⚠️ Unsold Players ({unsoldPlayers.length})</h3>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
            {unsoldPlayers.map((p, idx) => (
              <div key={idx} style={{
                background: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #fc8181',
                color: '#c53030',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAMS GRID */}
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px'
      }}>
        {activeTeams.map((team) => (
          <div key={team.name} style={{
            background: 'white',
            borderRadius: '15px',
            padding: '20px',
            borderTop: `6px solid ${team.color || '#667eea'}`,
            boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Team Header */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem', color: '#333'}}>{team.abbr || team.name}</h2>
              <span style={{
                background: team.color || '#667eea', 
                color: 'white', 
                padding: '5px 10px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold'
              }}>
                {team.squad?.length || 0} Players
              </span>
            </div>

            {/* Stats Row */}
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', background: '#f8f9fa', padding: '10px', borderRadius: '8px'}}>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '0.75rem', color: '#666', textTransform: 'uppercase'}}>Spent</div>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#d97706'}}>{team.spent || 0}L</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '0.75rem', color: '#666', textTransform: 'uppercase'}}>Left</div>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#16a34a'}}>{team.budget || 0}L</div>
              </div>
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '0.75rem', color: '#666', textTransform: 'uppercase'}}>Foreign</div>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#2563eb'}}>{team.foreignCount || 0}</div>
              </div>
            </div>

            {/* Player List */}
            <h4 style={{margin: '0 0 10px 0', color: '#555', fontSize: '0.9rem', borderBottom: '1px solid #eee', paddingBottom: '5px'}}>Squad List</h4>
            <ul style={{
              listStyle: 'none', 
              padding: 0, 
              margin: 0, 
              maxHeight: '200px', 
              overflowY: 'auto'
            }}>
              {team.squad && team.squad.length > 0 ? (
                team.squad.map((p, i) => (
                  <li key={i} style={{
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '6px 0', 
                    borderBottom: '1px dashed #eee',
                    fontSize: '0.9rem',
                    color: '#333'
                  }}>
                    <span>{p.name}</span>
                    <strong style={{color: '#667eea'}}>{p.soldPrice}L</strong>
                  </li>
                ))
              ) : (
                <li style={{color: '#999', fontStyle: 'italic', fontSize: '0.9rem'}}>No players bought</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* FOOTER ACTIONS */}
      <div style={{textAlign: 'center', marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center'}}>
        <button className="primary-btn" onClick={resetGame} style={{background: '#666', width: 'auto'}}>
          🔄 Start New Auction
        </button>
        <button className="primary-btn" onClick={downloadCSV} style={{width: 'auto'}}>
          ⬇️ Download CSV
        </button>
      </div>
      
    </div>
  );
};

export default SummaryPage;