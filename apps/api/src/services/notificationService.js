const { getIO } = require("../sockets/io");

// Writes the notification to the DB first (source of truth),
// then pushes it over the socket as a delivery optimization.
async function createNotification(prisma, { userId, type, text, link }) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, text, link },
    });
    getIO().to(`user:${userId}`).emit("notification:new", { notification });
    return notification;
  } catch (err) {
    // A failed notification must never break the action that triggered it.
    console.error("Create notification failed:", err);
    return null;
  }
}

module.exports = { createNotification };