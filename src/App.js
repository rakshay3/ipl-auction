import React from 'react';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import LandingPage from './components/LandingPage';
import SetReviewPage from './components/SetReviewPage';
import AuctionPage from './components/AuctionPage';
import SummaryPage from './components/SummaryPage';
import './App.css';

const GameController = () => {
  const { currentPage } = useAuction();

  // Simple Router Switch
  switch(currentPage) {
    case 'landing': return <LandingPage />;
    case 'review': return <SetReviewPage />;
    case 'auction': return <AuctionPage />;
    case 'summary': return <SummaryPage />;
    default: return <LandingPage />;
  }
};

function App() {
  return (
    <AuctionProvider>
      <GameController />
    </AuctionProvider>
  );
}

export default App;