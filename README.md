# 🏏 IPL Auction Multiplayer

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)

A highly interactive, real-time multiplayer IPL Auction simulator. Built with a decoupled "Dumb Frontend / Smart Backend" architecture, this application allows a host to manage a player pool while multiple connected clients engage in live, synchronized bidding wars.


## ✨ Features

* **Real-Time Bidding Engine:** Powered by Socket.IO, ensuring synchronization of bids, timers, and team purses across all connected clients.
* **Smart Bidding Logic:** Server-side validation prevents self-bidding, enforces maximum player limits, caps foreign player slots, and locks out third-party teams during active 1v1 bidding wars.
* **Host Mode Dashboard:** The room host has complete control to pause/resume the timer, manually adjust the countdown, force-skip players, and upload custom CSV datasets to build the auction pool.
* **Consensus Mechanics:** Features a "Fast Auction" voting system where teams can submit shortlists. Once consensus is reached, the server aggregates the data and skips directly to the desired players.
* **Role-Based UI & Auto-Reconnect:** Seamless session recovery using `localStorage` ensures that users who accidentally refresh do not lose their team ownership or room status.

## 🛠 Tech Stack

* **Frontend:** React.js, Context API (for global WebSocket state management), CSS3.
* **Backend:** Node.js, Express.js.
* **Real-Time Communication:** Socket.IO (WebSockets).

## 🚀 Local Setup & Installation

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the Repository
-> clone repository  
-> cd ipl-auction

### 2. Backend Setup
Open a terminal in the root directory.
\`\`\`
cd server
npm install
node server.js
\`\`\`
*The server will start running on `http://localhost:4000`.*

### 3. Frontend Setup
Open a second, separate terminal in the root directory.
\`\`\`
npm install
npm start
\`\`\`
*The React app will open in your browser at `http://localhost:3000`.*

## 📂 Project Architecture Highlights

* **`AuctionContext.js`:** The brain of the frontend. It maintains the WebSocket connection, catches the `STATE_UPDATE` broadcasts from the backend, and distributes the data to all React components, preventing the need for prop-drilling.
* **`gameHandler.js`:** The backend logic. It maintains an in-memory dictionary of all active rooms, validates every `EVENTS.BID`, calculates purse deductions, and controls the automated timer interval.
* **Data Parsing:** The frontend includes a robust CSV parser (`SelectionPage.jsx`) that safely converts human-readable prices (e.g., "2C" or "50L") into strict numerical values for the backend engine.

## 📝 Usage / Game Flow
1. **Host** creates a room and shares the Room Code / link.
2. **Players** join the lobby and claim an IPL team or create a custom one.
3. **Host** uploads a CSV of players and starts the auction.
4. **Bidding:** The timer ticks down. Bids automatically increment based on backend logic. Highest bidder when the timer hits 0 wins the player!
