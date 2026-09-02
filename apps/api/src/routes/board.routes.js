const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const createListSchema = z.object({
  name: z.string().min(1, "List name is required"),
});

const createCardSchema = z.object({
  title: z.string().min(1, "Card title is required"),
});

module.exports = (prisma) => {
  router.get("/:id", requireAuth, async (req, res) => {
    try {
      const board = await prisma.board.findUnique({
        where: { id: req.params.id },
        include: {
          lists: {
            orderBy: { position: "asc" },
            include: {
              cards: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });

      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }

      res.json({ board });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch board" });
    }
  });

  router.post("/:id/lists", requireAuth, async (req, res) => {
    const parsed = createListSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const lastList = await prisma.list.findFirst({
        where: { boardId: req.params.id },
        orderBy: { position: "desc" },
      });
      const nextPosition = lastList ? lastList.position + 1 : 1;

      const list = await prisma.list.create({
        data: {
          name: parsed.data.name,
          boardId: req.params.id,
          position: nextPosition,
        },
      });
      res.status(201).json({ list: { ...list, cards: [] } });
    } catch (err) {
      res.status(500).json({ error: "Failed to create list" });
    }
  });

  return router;
};