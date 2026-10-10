const express = require("express");
const requireAuth = require("../middleware/auth");

const router = express.Router();

module.exports = (prisma) => {
  router.get("/", requireAuth, async (req, res) => {
    try {
      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.userId },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        prisma.notification.count({ where: { userId: req.userId, read: false } }),
      ]);
      res.json({ notifications, unreadCount });
    } catch (err) {
      console.error("Fetch notifications failed:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  router.post("/read-all", requireAuth, async (req, res) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.userId, read: false },
        data: { read: true },
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Read-all failed:", err);
      res.status(500).json({ error: "Failed to update notifications" });
    }
  });

  router.patch("/:id/read", requireAuth, async (req, res) => {
    try {
      // userId in the WHERE clause is the ownership check:
      // you can't mark someone else's notification as read.
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.userId },
        data: { read: true },
      });
      if (result.count === 0) {
        return res.status(404).json({ error: "Notification not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Mark read failed:", err);
      res.status(500).json({ error: "Failed to update notification" });
    }
  });

  return router;
};