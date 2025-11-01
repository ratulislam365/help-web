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


// // server.js
// import app from "app.js";
// import app from "./src/app.js"; // তোমার app.js (export default app)
// import { initSocket } from "./src/sockets/index.js";
// import dotenv from "dotenv";

// dotenv.config();

// const PORT = process.env.PORT || 5000;
// const server = http.createServer(app);

// const io = initSocket(server); // returns io instance and sets handlers
// // attach io to app so controllers can access via req.app.get('io')
// app.set("io", io);

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
// ;