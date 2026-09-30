const boardSelect = { id: true, workspaceId: true };

const resolvers = {
  board: (prisma, id) =>
    prisma.board.findUnique({ where: { id }, select: boardSelect }),

  list: async (prisma, id) => {
    const list = await prisma.list.findUnique({
      where: { id },
      select: { board: { select: boardSelect } },
    });
    return list ? list.board : null;
  },

  card: async (prisma, id) => {
    const card = await prisma.card.findUnique({
      where: { id },
      select: { list: { select: { board: { select: boardSelect } } } },
    });
    return card ? card.list.board : null;
  },
};

// source: "board" | "list" | "card" — what req.params.id refers to
function requireBoardAccess(prisma, source) {
  return async (req, res, next) => {
    try {
      const board = await resolvers[source](prisma, req.params.id);
      if (!board) return res.status(404).json({ error: "Not found" });

      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId: board.workspaceId, userId: req.userId },
        },
      });
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      req.boardId = board.id;
      req.membership = membership;
      next();
    } catch (err) {
      console.error("Board access check failed:", err);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
}

module.exports = requireBoardAccess;