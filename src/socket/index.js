const { Server } = require("socket.io");
const mongoose = require("mongoose");

const socketAuthMiddleware = require("../middlewares/socketAuthMiddleware");
const Project = require("../models/Project");

const createSocketServer = (httpServer) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("project:join", async (payload, callback) => {
      const respond = typeof callback === "function" ? callback : () => {};

      try {
        const projectId = payload?.projectId;

        if (!mongoose.isValidObjectId(projectId)) {
          return respond({ success: false, message: "Invalid project ID" });
        }

        const project = await Project.findById(projectId).select(
          "owner members status",
        );

        if (!project) {
          return respond({ success: false, message: "Project not found" });
        }

        const isOwner = project.owner.toString() === socket.user.userId;
        const isMember = project.members.some(
          (memberId) => memberId.toString() === socket.user.userId,
        );
        const hasAccess = socket.user.role === "admin" ? isOwner : isMember;

        if (!hasAccess) {
          return respond({
            success: false,
            message: "You do not have access to this project",
          });
        }

        await socket.join(`project:${project._id.toString()}`);

        return respond({
          success: true,
          projectId: project._id.toString(),
          message: "Joined project room successfully",
        });
      } catch (error) {
        console.error("Project room join error:", error.message);
        return respond({
          success: false,
          message: "Unable to join project room",
        });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { createSocketServer };
