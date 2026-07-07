// Handles WebRTC signaling AND general notifications (like new meeting requests)

const initSignaling = (io) => {
  const rooms = new Map(); // video call rooms
  const userSocketMap = new Map(); // userId -> socketId, for direct notifications

  io.userSocketMap = userSocketMap; // expose so controllers can use it

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // @event register-user
    // Called once when the app loads - lets us send direct notifications
    // to a specific logged-in user regardless of video call rooms
    socket.on("register-user", (userId) => {
      userSocketMap.set(String(userId), socket.id);
      socket.data.userId = String(userId);
    });

    socket.on("join-room", ({ roomId, userName }) => {
      socket.join(roomId);

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }
      const roomUsers = rooms.get(roomId);

      const existingUsers = Array.from(roomUsers);
      socket.emit("room-users", existingUsers);

      roomUsers.add(socket.id);
      socket.data.roomId = roomId;
      socket.data.userName = userName;

      socket.to(roomId).emit("user-joined", { socketId: socket.id, userName });
      console.log(`${userName || socket.id} joined room ${roomId}`);
    });

    socket.on("offer", ({ target, offer }) => {
      io.to(target).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ target, answer }) => {
      io.to(target).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
      io.to(target).emit("ice-candidate", { from: socket.id, candidate });
    });

    socket.on("toggle-media", ({ roomId, kind, enabled }) => {
      socket.to(roomId).emit("peer-toggle-media", { socketId: socket.id, kind, enabled });
    });

    socket.on("leave-room", ({ roomId }) => {
      handleLeave(socket, roomId);
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        handleLeave(socket, roomId);
      }
      if (socket.data.userId) {
        userSocketMap.delete(socket.data.userId);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  const handleLeave = (socket, roomId) => {
    const roomUsers = rooms.get(roomId);
    if (roomUsers) {
      roomUsers.delete(socket.id);
      if (roomUsers.size === 0) {
        rooms.delete(roomId);
      }
    }
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    socket.leave(roomId);
  };
};

export default initSignaling;