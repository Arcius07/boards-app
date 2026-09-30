function requireWorkspaceRole(prisma, ...allowedRoles) {
  return async (req, res, next) => {
    try {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: req.params.id, userId: req.userId },
        },
        include: { workspace: { select: { ownerId: true } } },
      });

      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.membership = membership;
      next();
    } catch (err) {
      console.error("Workspace role check failed:", err);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

module.exports = requireWorkspaceRole;