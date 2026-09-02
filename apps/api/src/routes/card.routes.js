const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const moveCardSchema = z.object({
  listId: z.string(),
  position: z.number(),
});

module.exports = (prisma) => {
  router.patch("/:id", requireAuth, async (req, res) => {
    const parsed = moveCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    try {
      const card = await prisma.card.update({
        where: { id: req.params.id },
        data: {
          listId: parsed.data.listId,
          position: parsed.data.position,
        },
      });
      res.json({ card });
    } catch (err) {
      res.status(500).json({ error: "Failed to move card" });
    }
  });

  return router;
};