const express = require("express");
const { z } = require("zod");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  avatarUrl: z.string().optional(),
});

module.exports = (prisma) => {
  router.patch("/me", requireAuth, async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    if (parsed.data.name === undefined && parsed.data.avatarUrl === undefined) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    try {
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: parsed.data,
        select: { id: true, name: true, email: true, avatarUrl: true },
      });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  return router;
};