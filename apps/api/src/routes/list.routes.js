const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");
const requireBoardAccess = require("../middleware/boardAccess");
const { getIO } = require("../sockets/io");
const { logActivity } = require("../services/activityService");

const router = express.Router();

const createCardSchema = z.object({
  title: z.string().min(1, "Card title is required"),
});

module.exports = (prisma) => {
  // POST /lists/:id/cards: create a new card
  router.post("/:id/cards", requireAuth, requireBoardAccess(prisma, "list"), async (req, res) => {
    const parsed = createCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const list = await prisma.list.findUnique({
        where: { id: req.params.id },
      });
      if (!list) {
        return res.status(404).json({ error: "List not found" });
      }

      const lastCard = await prisma.card.findFirst({
        where: { listId: req.params.id },
        orderBy: { position: "desc" },
      });
      const nextPosition = lastCard ? lastCard.position + 1 : 1;

      const card = await prisma.card.create({
        data: {
          title: parsed.data.title,
          listId: req.params.id,
          position: nextPosition,
        },
      });

      getIO().to(`board:${list.boardId}`).emit("card:created", { card });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true },
      });
      await logActivity(prisma, {
        boardId: list.boardId,
        userId: req.userId,
        actionText: `${user?.name || "Someone"} added "${card.title}" to ${list.name}`,
      });

      res.status(201).json({ card });
    } catch (err) {
      console.error("Create card failed:", err);
      res.status(500).json({ error: "Failed to create card" });
    }
  });

  return router;
};