const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
});

module.exports = (prisma) => {

  router.get("/", requireAuth, async (req, res) => {
    try {
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: req.userId },
        include: { workspace: true },
      });
      const workspaces = memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      }));
      res.json({ workspaces });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch workspaces" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    const parsed = createWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
        
      const workspace = await prisma.workspace.create({
        data: {
          name: parsed.data.name,
          ownerId: req.userId,
          members: {
            create: { userId: req.userId, role: "admin" },
          },
        },
      });
      res.status(201).json({ workspace });
    } catch (err) {
      res.status(500).json({ error: "Failed to create workspace" });
    }
  });

  router.get("/:id/boards", requireAuth, async (req, res) => {
    try {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.userId } },
      });
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      const boards = await prisma.board.findMany({
        where: { workspaceId: req.params.id },
      });
      res.json({ boards });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch boards" });
    }
  });

  router.post("/:id/boards", requireAuth, async (req, res) => {
    const parsed = createBoardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.userId } },
      });
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      const board = await prisma.board.create({
        data: {
          name: parsed.data.name,
          workspaceId: req.params.id,
          lists: {
            create: [
              { name: "To Do", position: 1 },
              { name: "In Progress", position: 2 },
              { name: "Done", position: 3 },
            ],
          },
        },
        include: { lists: true },
      });
      res.status(201).json({ board });
    } catch (err) {
      res.status(500).json({ error: "Failed to create board" });
    }
  });

  return router;
};