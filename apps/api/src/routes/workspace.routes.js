const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");
const requireWorkspaceRole = require("../middleware/workspaceRole");

const router = express.Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
});

const addMemberSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["admin", "member"]).default("member"),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

const renameWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
});

const memberUserSelect = { id: true, name: true, email: true, avatarUrl: true };

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

  router.patch("/:id", requireAuth, requireWorkspaceRole(prisma, "admin"), async (req, res) => {
    const parsed = renameWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    try {
      const workspace = await prisma.workspace.update({
        where: { id: req.params.id },
        data: { name: parsed.data.name },
      });
      res.json({ workspace });
    } catch (err) {
      console.error("Rename workspace failed:", err);
      res.status(500).json({ error: "Failed to rename workspace" });
    }
  });

  router.get("/:id/members", requireAuth, requireWorkspaceRole(prisma), async (req, res) => {
    try {
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: req.params.id },
        include: { user: { select: memberUserSelect } },
        orderBy: { joinedAt: "asc" },
      });
      res.json({
        members,
        ownerId: req.membership.workspace.ownerId,
        myRole: req.membership.role,
      });
    } catch (err) {
      console.error("Fetch members failed:", err);
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  router.post("/:id/members", requireAuth, requireWorkspaceRole(prisma, "admin"), async (req, res) => {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, role } = parsed.data;

    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (!user) {
        return res.status(404).json({ error: "No user with that email" });
      }

      const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
      });
      if (existing) {
        return res.status(409).json({ error: "User is already a member" });
      }

      const member = await prisma.workspaceMember.create({
        data: { workspaceId: req.params.id, userId: user.id, role },
        include: { user: { select: memberUserSelect } },
      });
      res.status(201).json({ member });
    } catch (err) {
      console.error("Add member failed:", err);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  router.patch("/:id/members/:userId", requireAuth, requireWorkspaceRole(prisma, "admin"), async (req, res) => {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    if (req.params.userId === req.membership.workspace.ownerId) {
      return res.status(400).json({ error: "The owner's role can't be changed" });
    }

    try {
      const target = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId } },
      });
      if (!target) {
        return res.status(404).json({ error: "Member not found" });
      }

      const member = await prisma.workspaceMember.update({
        where: { id: target.id },
        data: { role: parsed.data.role },
        include: { user: { select: memberUserSelect } },
      });
      res.json({ member });
    } catch (err) {
      console.error("Update role failed:", err);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  router.delete("/:id/members/:userId", requireAuth, requireWorkspaceRole(prisma), async (req, res) => {
    const isSelf = req.params.userId === req.userId;

    if (!isSelf && req.membership.role !== "admin") {
      return res.status(403).json({ error: "Only admins can remove other members" });
    }
    if (req.params.userId === req.membership.workspace.ownerId) {
      return res.status(400).json({ error: "The workspace owner can't be removed" });
    }

    try {
      const target = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId } },
      });
      if (!target) {
        return res.status(404).json({ error: "Member not found" });
      }

      await prisma.workspaceMember.delete({ where: { id: target.id } });
      res.json({ success: true });
    } catch (err) {
      console.error("Remove member failed:", err);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  return router;
};