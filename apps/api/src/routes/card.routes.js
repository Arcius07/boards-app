const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");
const requireBoardAccess = require("../middleware/boardAccess");
const { getIO } = require("../sockets/io");

const router = express.Router();
const cloudinary = require("cloudinary").v2;

const updateCardSchema = z.object({
  listId: z.string().optional(),
  boardId: z.string().optional(),
  position: z.number().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
});

module.exports = (prisma) => {
  router.patch("/:id", requireAuth, requireBoardAccess(prisma, "card"), async (req, res) => {
    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const { listId, position, title, description } = parsed.data;

    if (
      listId === undefined &&
      position === undefined &&
      title === undefined &&
      description === undefined
    ) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    try {
      if (listId !== undefined) {
        const destList = await prisma.list.findUnique({
          where: { id: listId },
          select: { boardId: true },
        });
        if (!destList || destList.boardId !== req.boardId) {
          return res.status(400).json({ error: "Invalid destination list" });
        }
      }

      const dataToUpdate = {};
      if (listId !== undefined) dataToUpdate.listId = listId;
      if (position !== undefined) dataToUpdate.position = position;
      if (title !== undefined) dataToUpdate.title = title;
      if (description !== undefined) dataToUpdate.description = description;

      const card = await prisma.card.update({
        where: { id: req.params.id },
        data: dataToUpdate,
      });

      const isMove = listId !== undefined || position !== undefined;
      getIO()
        .to(`board:${req.boardId}`)
        .emit(isMove ? "card:moved" : "card:updated", { card });

      res.json({ card });
    } catch (err) {
      console.error("Update card failed:", err);
      res.status(500).json({ error: "Failed to update card" });
    }
  });

  const createCommentSchema = z.object({
    text: z.string().min(1),
  });

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
    publicId: z.string().optional(),
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
          publicId: parsed.data.publicId,
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
      console.error("Create attachment failed:", err);
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