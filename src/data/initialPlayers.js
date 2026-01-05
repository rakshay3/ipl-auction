export const IPL_TEAMS = [
  { id: 0, name: 'Chennai Super Kings', abbr: 'CSK', color: '#FFD700' },
  { id: 1, name: 'Mumbai Indians', abbr: 'MI', color: '#0080ffff' },
  { id: 2, name: 'Royal Challengers Bangalore', abbr: 'RCB', color: '#DC143C' },
  { id: 3, name: 'Kolkata Knight Riders', abbr: 'KKR', color: '#9933FF' },
  { id: 4, name: 'Rajasthan Royals', abbr: 'RR', color: '#FF1493' },
  { id: 5, name: 'Delhi Capitals', abbr: 'DC', color: '#0066FF' },
  { id: 6, name: 'Sunrisers Hyderabad', abbr: 'SRH', color: '#FF6600' },
  { id: 7, name: 'Lucknow Super Giants', abbr: 'LSG', color: '#83ffffff' },
  { id: 8, name: 'Gujarat Titans', abbr: 'GT', color: '#003D7A' },
  { id: 9, name: 'Punjab Kings', abbr: 'PBKS', color: '#EE3124' }
];

// Placeholder image for players who don't have one
export const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/166/166344.png";

export const initialPlayerSets = [
  {
      setName: 'Marquee Players',
      players: [
          { id: 'm1', name: 'Virat Kohli', type: 'Batsman', country: 'India', isForeign: false, basePrice: 200, img: "https://documents.iplt20.com/ipl/IPLHeadshot2025/2.png" },
          { id: 'm2', name: 'Rohit Sharma', type: 'Batsman', country: 'India', isForeign: false, basePrice: 180, img: "https://documents.iplt20.com/ipl/IPLHeadshot2025/6.png" },
          { id: 'm3', name: 'Pat Cummins', type: 'Bowler', country: 'Australia', isForeign: true, basePrice: 200, img: "https://documents.iplt20.com/ipl/IPLHeadshot2025/33.png" },
          { id: 'm4', name: 'Jasprit Bumrah', type: 'Bowler', country: 'India', isForeign: false, basePrice: 150, img: "https://documents.iplt20.com/ipl/IPLHeadshot2025/9.png" }
      ]
  },
  {
      setName: 'Capped Batsmen',
      players: [
          { id: 'b1', name: 'Shubman Gill', type: 'Batsman', country: 'India', isForeign: false, basePrice: 100, img: "https://documents.iplt20.com/ipl/IPLHeadshot2025/62.png" },
          { id: 'b2', name: 'David Warner', type: 'Batsman', country: 'Australia', isForeign: true, basePrice: 150, img: "" }, // Empty string will use default avatar
          { id: 'b3', name: 'Steve Smith', type: 'Batsman', country: 'Australia', isForeign: true, basePrice: 100, img: "" }
      ]
  }
];