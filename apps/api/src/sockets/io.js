const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let ioInstance = null;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("No token provided"));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

        socket.on("join-board", (boardId) => {
        socket.join(`board:${boardId}`);
        console.log(`Socket ${socket.id} joined board:${boardId}`);
        });

        socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
        });
    });

  ioInstance = io;
  return io;
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.IO not initialized yet");
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };