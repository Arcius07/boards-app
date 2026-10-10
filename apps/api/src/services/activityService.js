async function logActivity(prisma, { boardId, userId, actionText }) {
  try {
    await prisma.activityLog.create({
      data: { boardId, userId, actionText },
    });
  } catch (err) {
    console.error("Log activity failed:", err);
  }
}

module.exports = { logActivity };