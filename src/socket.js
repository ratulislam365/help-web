// src/sockets/index.js
// import { Server } from "socket.io";
// import jwt from "jsonwebtoken";
// // import User from "../models/user.model.js"; // src/socket.js থেকে
// // import Notification from "./models/notification.model.js";
// import HelpRequest from "./models/helpRequest.model.js"; // যদি socket.js src ফোল্ডারের মধ্যে থাকে

// import HelpRequest from "../models/helpRequest.model.js";

// শুধুমাত্র একবার import
import User from "./models/user.model.js";
import HelpRequest from "./models/helpRequest.model.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

// আর এখানে আর User/HelpRequest declare করা লাগবে না


/**
 * Socket manager:
 * - JWT auth on connect
 * - user <-> sockets mapping (multi-tab/device)
 * - rooms: request_<requestId>
 * - events: register, joinRequest, leaveRequest, updateLocation, acceptRequest, rejectRequest
 * - helper emit helpers: emitToUser, emitToUsers, emitToRoom
 */

const userSockets = new Map(); // userId -> Set(socketId)
let ioInstance = null;

export function initSocket(server) {
  if (ioInstance) return ioInstance; // idempotent init

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });
  ioInstance = io;

  // Middleware: authenticate socket via token (auth.token or headers.token)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.token;
      if (!token) return next(new Error("Authentication error: token required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      return next();
    } catch (err) {
      return next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = String(socket.userId);
    console.log(`🔌 socket connected: ${socket.id} (user: ${userId})`);

    // register socket id for user
    let set = userSockets.get(userId);
    if (!set) {
      set = new Set();
      userSockets.set(userId, set);
    }
    set.add(socket.id);

    // Optional: client can explicitly register (duplicate-safe)
    socket.on("register", (payload) => {
      // payload optional (e.g., send meta)
      if (!userId) return;
      let s = userSockets.get(userId) || new Set();
      s.add(socket.id);
      userSockets.set(userId, s);
      // acknowledge
      socket.emit("registered", { ok: true, socketId: socket.id, userId });
    });

    // join a request room => joinRequestRoom used when seeker creates request or when helper accepts
    socket.on("joinRequestRoom", ({ requestId }) => {
      if (!requestId) return;
      const room = `request_${requestId}`;
      socket.join(room);
      // optional ack
      socket.emit("joinedRoom", { room });
    });

    socket.on("leaveRequestRoom", ({ requestId }) => {
      if (!requestId) return;
      const room = `request_${requestId}`;
      socket.leave(room);
      socket.emit("leftRoom", { room });
    });

    // Helper sends live location updates (client should send lat,lng, and requestId optionally)
    socket.on("updateLocation", async ({ requestId, lat, lng }) => {
      try {
        if (!userId || lat == null || lng == null) return;
        // update any active HelpRequest helper entry for this user (if exists)
        if (requestId) {
          const request = await HelpRequest.findById(requestId);
          if (request) {
            const helper = request.helpers.find(h => String(h.user) === userId);
            if (helper) {
              helper.lastLocation = { lat, lng, updatedAt: new Date() };
              await request.save();
              // emit to seeker in room
              const room = `request_${requestId}`;
              io.to(room).emit("helperLocationUpdated", {
                requestId,
                helperId: userId,
                lat,
                lng,
                updatedAt: new Date(),
              });
            }
          }
        }

        // also broadcast globally (optional)
        io.to(userId).emit("youLocationSaved", { lat, lng });
      } catch (err) {
        console.error("socket updateLocation error:", err.message);
      }
    });

    // Helper accepts request (client: emit 'acceptRequest' with { requestId })
    socket.on("acceptRequest", async ({ requestId }) => {
      try {
        if (!requestId) return;
        const request = await HelpRequest.findById(requestId);
        if (!request) {
          socket.emit("error", { message: "Request not found" });
          return;
        }
        // mark helper entry status (if present) or push if not
        let helper = request.helpers.find(h => String(h.user) === userId);
        if (!helper) {
          request.helpers.push({
            user: userId,
            status: "enroute",
            lastLocation: null,
          });
          helper = request.helpers.find(h => String(h.user) === userId);
        } else {
          helper.status = "enroute";
        }
        // set request.giver if you use single-giver logic — optional
        request.status = "active";
        await request.save();

        // Notify seeker (via room or direct)
        const room = `request_${requestId}`;
        io.to(room).emit("helperAccepted", {
          requestId,
          helperId: userId,
          helperName: (await User.findById(userId)).fullname,
          timestamp: new Date(),
        });

        // Also send direct notification via saved sockets
        io.emitToUser(request.seeker.toString(), "helpAccepted", {
          requestId,
          helperId: userId,
        });
      } catch (err) {
        console.error("socket acceptRequest error:", err.message);
      }
    });

    // Helper rejects request
    socket.on("rejectRequest", async ({ requestId, reason }) => {
      try {
        if (!requestId) return;
        const request = await HelpRequest.findById(requestId);
        if (!request) return;
        // if helper entry exists mark cancelled for that helper
        const helper = request.helpers.find(h => String(h.user) === userId);
        if (helper) {
          helper.status = "cancelled";
          await request.save();
        }
        // notify seeker
        const room = `request_${requestId}`;
        io.to(room).emit("helperRejected", {
          requestId,
          helperId: userId,
          reason,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error("socket rejectRequest error:", err.message);
      }
    });

    // disconnect cleanup
    socket.on("disconnect", () => {
      // remove socket id from userSockets map
      for (const [uid, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) userSockets.delete(uid);
          break;
        }
      }
      console.log(`🔴 socket disconnected: ${socket.id} (user: ${userId})`);
    });
  });

  // helper emits for controllers
  io.emitToUser = (userId, event, data) => {
    const sockets = userSockets.get(String(userId));
    if (!sockets) return 0;
    let count = 0;
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
      count++;
    }
    return count;
  };

  io.emitToUsers = (userIds = [], event, data) => {
    let total = 0;
    for (const uid of userIds) {
      total += io.emitToUser(uid, event, data) || 0;
    }
    return total;
  };

  io.emitToRoom = (roomName, event, data) => {
    io.to(roomName).emit(event, data);
    return true;
  };

  return io;
}

// helper to get io if needed
export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};






































// src/sockets/index.js
// import { Server } from "socket.io";

// const userSockets = new Map(); // userId -> Set(socketId)

// export function initSocket(server) {
//   const io = new Server(server, {
//     cors: {
//       origin: "*", // development: সঠিক origin বসাবে production এ
//       methods: ["GET", "POST"]
//     }
//   });

//   io.on("connection", (socket) => {
//     console.log("Socket connected:", socket.id);

//     // Client should emit 'register' with their userId after connecting
//     socket.on("register", (userId) => {
//       if (!userId) return;
//       let set = userSockets.get(userId);
//       if (!set) {
//         set = new Set();
//         userSockets.set(userId, set);
//       }
//       set.add(socket.id);
//       console.log(`Registered socket ${socket.id} for user ${userId}`);
//     });

//     // Helpers can send live location updates: { userId, lat, lng }
//     socket.on("updateLocation", (payload) => {
//       // payload: { userId, lat, lng }
//       // forward to interested seekers or rooms if you track which seeker requested them
//       // we'll leave the emitting logic to controllers which know which seeker to notify.
//       socket.broadcast.emit("helperLocationUpdate", payload); // basic broadcast (optional)
//     });

//     socket.on("disconnect", () => {
//       // remove socket id from all user sets
//       for (const [userId, set] of userSockets.entries()) {
//         if (set.has(socket.id)) {
//           set.delete(socket.id);
//           if (set.size === 0) userSockets.delete(userId);
//           break;
//         }
//       }
//       console.log("Socket disconnected:", socket.id);
//     });
//   });

//   // helper to emit to a specific userId (works if they have one or many sockets)
//   io.emitToUser = (userId, event, data) => {
//     const sockets = userSockets.get(userId);
//     if (!sockets) return 0;
//     for (const sid of sockets) {
//       io.to(sid).emit(event, data);
//     }
//     return sockets.size;
//   };

//   // helper to emit to multiple users
//   io.emitToUsers = (userIds = [], event, data) => {
//     let count = 0;
//     for (const uid of userIds) {
//       count += io.emitToUser(uid, event, data) || 0;
//     }
//     return count;
//   };

//   return io;
// }


// // Inside socket.js
// socket.on("updateLocation", async ({ userId, lat, lng }) => {
//   try {
//     // Find active help request
//     const request = await HelpRequest.findOne({
//       "helpers.user": userId,
//       status: "active",
//     });

//     if (request) {
//       const helper = request.helpers.find(h => String(h.user) === userId);
//       if (helper) {
//         helper.lastLocation = { lat, lng, updatedAt: new Date() };
//         await request.save();

//         // Notify seeker in real time
//         io.to(request.seeker.toString()).emit("helperLocationUpdated", {
//           userId,
//           lat,
//           lng,
//           updatedAt: new Date(),
//         });
//       }
//     }
//   } catch (err) {
//     console.error("Socket location update error:", err.message);
//   }
// });















