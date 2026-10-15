const emitIssueEvent = (req, projectId, eventName, payload) => {
  const io = req.app.get("io");

  if (!io) return;

  io.to(`project:${projectId.toString()}`).emit(eventName, {
    projectId: projectId.toString(),
    ...payload,
  });
};

module.exports = { emitIssueEvent };
