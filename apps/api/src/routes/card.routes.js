const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");
const { getIO } = require("../sockets/io");

const router = express.Router();

const updateCardSchema = z.object({
  listId: z.string().optional(),
  boardId: z.string().optional(),
  position: z.number().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

module.exports = (prisma) => {
  router.patch("/:id", requireAuth, async (req, res) => {
    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { listId, boardId, position, title, description } = parsed.data;

    if (
      listId === undefined &&
      position === undefined &&
      title === undefined &&
      description === undefined
    ) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const dataToUpdate = {};
    if (listId !== undefined) dataToUpdate.listId = listId;
    if (position !== undefined) dataToUpdate.position = position;
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;

    try {
      const card = await prisma.card.update({
        where: { id: req.params.id },
        data: dataToUpdate,
      });

      const isMove = listId !== undefined || position !== undefined;
      const io = getIO();

      if (isMove) {
        if (!boardId) {
          return res.status(400).json({ error: "boardId is required when moving a card" });
        }
        io.to(`board:${boardId}`).emit("card:moved", { card });
      } else {
        const list = await prisma.list.findUnique({ where: { id: card.listId } });
        io.to(`board:${list.boardId}`).emit("card:updated", { card });
      }

      res.json({ card });
    } catch (err) {
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  const createCommentSchema = z.object({
    text: z.string().min(1),
  });

  router.post("/:id/comments", requireAuth, async (req, res) => {
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
          user: {
            select: { id: true, name: true },
          },
        },
      });

      const card = await prisma.card.findUnique({ where: { id: req.params.id } });
      const list = await prisma.list.findUnique({ where: { id: card.listId } });

      getIO().to(`board:${list.boardId}`).emit("comment:created", { comment });

      res.status(201).json({ comment });
    } catch (err) {
      res.status(500).json({ error: "Failed to create comment" });
    }
});

  const createAttachmentSchema = z.object({
    url: z.string().min(1),
    filename: z.string().min(1),
    fileType: z.enum(["image", "pdf"]),
  });

  router.post("/:id/attachments", requireAuth, async (req, res) => {
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
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      });

      const card = await prisma.card.findUnique({ where: { id: req.params.id } });
      const list = await prisma.list.findUnique({ where: { id: card.listId } });

      getIO().to(`board:${list.boardId}`).emit("attachment:created", { attachment });

      res.status(201).json({ attachment });
    } catch (err) {
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  router.delete("/:id/attachments/:attachmentId", requireAuth, async (req, res) => {
    try {
      const attachment = await prisma.attachment.findUnique({
        where: { id: req.params.attachmentId },
      });

      if (!attachment || attachment.cardId !== req.params.id) {
        return res.status(404).json({ error: "Attachment not found" });
      }

      if (attachment.uploadedBy !== req.userId) {
        return res.status(403).json({ error: "You can only delete your own attachments" });
      }

      await prisma.attachment.delete({ where: { id: attachment.id } });

      const card = await prisma.card.findUnique({ where: { id: attachment.cardId } });
      const list = await prisma.list.findUnique({ where: { id: card.listId } });

      getIO()
        .to(`board:${list.boardId}`)
        .emit("attachment:deleted", {
          attachmentId: attachment.id,
          cardId: attachment.cardId,
        });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  return router;
};