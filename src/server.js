// import app from './app.js';
// import { connectDB } from './config/db.js';
// import { getIO , initSocket ,userSocketMap } from './socket.js';

// const PORT = process.env.PORT || 5000;

// connectDB()
//   .then(() => {
//     const server = app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//     initSocket(server);
//   })
//   .catch((err) => {
//     console.error('DB connection failed:', err);
//   });

// server.js

import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js'; // 🔹 src/socket.js path use করো

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    // 1️⃣ HTTP server start
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });

    // 2️⃣ Socket.IO init
    initSocket(server); 
    console.log('⚡ Socket.IO initialized');
  })
  .catch((err) => {
    console.error('❌ DB connection failed:', err);
  });