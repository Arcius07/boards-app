const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");
const requireBoardAccess = require("../middleware/boardAccess");
const { getIO } = require("../sockets/io");

const router = express.Router();

const createListSchema = z.object({
  name: z.string().min(1, "List name is required"),
});

const createLabelSchema = z.object({
  name: z.string().min(1, "Label name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #4f46e5"),
});

module.exports = (prisma) => {
  router.get("/:id", requireAuth, requireBoardAccess(prisma, "board"), async (req, res) => {
    try {
      const board = await prisma.board.findUnique({
        where: { id: req.params.id },
        include: {
          labels: true,
          lists: {
            orderBy: { position: "asc" },
            include: {
              cards: {
                orderBy: { position: "asc" },
                include: {
                  assignee: { select: { id: true, name: true, avatarUrl: true } },
                  labels: { include: { label: true } },
                  comments: {
                    orderBy: { createdAt: "asc" },
                    include: {
                      user: { select: { id: true, name: true } },
                    },
                  },
                  attachments: {
                    orderBy: { createdAt: "asc" },
                    include: {
                      user: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!board) {
        return res.status(404).json({ error: "Board not found" });
      }

      res.json({ board, myRole: req.membership.role });
    } catch (err) {
      console.error("Fetch board failed:", err);
      res.status(500).json({ error: "Failed to fetch board" });
    }
  });

  router.post("/:id/lists", requireAuth, requireBoardAccess(prisma, "board"), async (req, res) => {
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

      getIO()
        .to(`board:${req.params.id}`)
        .emit("list:created", { list: { ...list, cards: [] } });

      res.status(201).json({ list: { ...list, cards: [] } });
    } catch (err) {
      console.error("Create list failed:", err);
      res.status(500).json({ error: "Failed to create list" });
    }
  });

  router.post("/:id/labels", requireAuth, requireBoardAccess(prisma, "board"), async (req, res) => {
    const parsed = createLabelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const label = await prisma.label.create({
        data: { boardId: req.params.id, name: parsed.data.name, color: parsed.data.color },
      });
      getIO().to(`board:${req.params.id}`).emit("label:created", { label });
      res.status(201).json({ label });
    } catch (err) {
      console.error("Create label failed:", err);
      res.status(500).json({ error: "Failed to create label" });
    }
  });

  return router;
};