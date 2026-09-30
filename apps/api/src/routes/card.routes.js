const express = require("express");
const { z } = require("zod");
const cloudinary = require("cloudinary").v2;
const requireAuth = require("../middleware/auth");
const requireBoardAccess = require("../middleware/boardAccess");
const { getIO } = require("../sockets/io");

const router = express.Router();

const cardInclude = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  labels: { include: { label: true } },
};

const updateCardSchema = z.object({
  listId: z.string().optional(),
  boardId: z.string().optional(),
  position: z.number().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

const createCommentSchema = z.object({
  text: z.string().min(1),
});

const createAttachmentSchema = z.object({
  url: z.string().min(1),
  filename: z.string().min(1),
  fileType: z.enum(["image", "pdf"]),
  publicId: z.string().optional(),
});

const attachLabelSchema = z.object({ labelId: z.string() });

module.exports = (prisma) => {
  // PATCH /cards/:id — partial update (move, edit, assign, due date)
  router.patch("/:id", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { boardId: _ignored, ...fields } = parsed.data;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    try {
      if (fields.listId !== undefined) {
        const destList = await prisma.list.findUnique({
          where: { id: fields.listId },
          select: { boardId: true },
        });
        if (!destList || destList.boardId !== req.boardId) {
          return res.status(400).json({ error: "Invalid destination list" });
        }
      }

      if (fields.assigneeId) {
        const assigneeMembership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: req.membership.workspaceId,
              userId: fields.assigneeId,
            },
          },
        });
        if (!assigneeMembership) {
          return res.status(400).json({ error: "Assignee must be a workspace member" });
        }
      }

      const data = { ...fields };
      if (fields.dueDate !== undefined) {
        data.dueDate = fields.dueDate === null ? null : new Date(fields.dueDate);
      }

      const card = await prisma.card.update({
        where: { id: req.params.id },
        data,
        include: cardInclude,
      });

      const isMove = fields.listId !== undefined || fields.position !== undefined;
      getIO()
        .to(`board:${req.boardId}`)
        .emit(isMove ? "card:moved" : "card:updated", { card });

      res.json({ card });
    } catch (err) {
      console.error("Update card failed:", err);
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  // POST /cards/:id/comments
  router.post("/:id/comments", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const comment = await prisma.comment.create({
        data: {
          text: parsed.data.text,
          cardId: req.params.id,
          userId: req.userId,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      getIO().to(`board:${req.boardId}`).emit("comment:created", { comment });

      res.status(201).json({ comment });
    } catch (err) {
      console.error("Create comment failed:", err);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // POST /cards/:id/attachments
  router.post("/:id/attachments", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    const parsed = createAttachmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const attachment = await prisma.attachment.create({
        data: {
          cardId: req.params.id,
          url: parsed.data.url,
          filename: parsed.data.filename,
          fileType: parsed.data.fileType,
          uploadedBy: req.userId,
          publicId: parsed.data.publicId,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      getIO().to(`board:${req.boardId}`).emit("attachment:created", { attachment });

      res.status(201).json({ attachment });
    } catch (err) {
      console.error("Create attachment failed:", err);
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  // DELETE /cards/:id/attachments/:attachmentId
  router.delete(
    "/:id/attachments/:attachmentId",
    requireAuth,
    requireBoardAccess(prisma, "card"),
    async (req, res) => {
      try {
        const attachment = await prisma.attachment.findUnique({
          where: { id: req.params.attachmentId },
        });

        if (!attachment || attachment.cardId !== req.params.id) {
          return res.status(404).json({ error: "Attachment not found" });
        }

        if (attachment.uploadedBy !== req.userId && req.membership.role !== "admin") {
          return res.status(403).json({ error: "You can only delete your own attachments" });
        }

        await prisma.attachment.delete({ where: { id: attachment.id } });

        if (attachment.publicId) {
          try {
            await cloudinary.uploader.destroy(attachment.publicId, {
              resource_type: attachment.fileType === "pdf" ? "raw" : "image",
            });
          } catch (cloudErr) {
            console.error("Cloudinary cleanup failed for", attachment.publicId, cloudErr);
          }
        }

        getIO()
          .to(`board:${req.boardId}`)
          .emit("attachment:deleted", {
            attachmentId: attachment.id,
            cardId: attachment.cardId,
          });

        res.json({ success: true });
      } catch (err) {
        console.error("Delete attachment failed:", err);
        res.status(500).json({ error: "Failed to delete attachment" });
      }
    }
  );

  // POST /cards/:id/labels — attach an existing board label to a card
  router.post("/:id/labels", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    const parsed = attachLabelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const label = await prisma.label.findUnique({ where: { id: parsed.data.labelId } });
      if (!label || label.boardId !== req.boardId) {
        return res.status(400).json({ error: "Invalid label" });
      }

      await prisma.cardLabel.upsert({
        where: { cardId_labelId: { cardId: req.params.id, labelId: label.id } },
        update: {},
        create: { cardId: req.params.id, labelId: label.id },
      });

      const card = await prisma.card.findUnique({
        where: { id: req.params.id },
        include: cardInclude,
      });

      getIO().to(`board:${req.boardId}`).emit("card:updated", { card });
      res.json({ card });
    } catch (err) {
      console.error("Attach label failed:", err);
      res.status(500).json({ error: "Failed to attach label" });
    }
  });

  // DELETE /cards/:id/labels/:labelId — detach a label from a card
  router.delete("/:id/labels/:labelId", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    try {
      await prisma.cardLabel.deleteMany({
        where: { cardId: req.params.id, labelId: req.params.labelId },
      });

      const card = await prisma.card.findUnique({
        where: { id: req.params.id },
        include: cardInclude,
      });

      getIO().to(`board:${req.boardId}`).emit("card:updated", { card });
      res.json({ card });
    } catch (err) {
      console.error("Detach label failed:", err);
      res.status(500).json({ error: "Failed to detach label" });
    }
  });

  return router;
};