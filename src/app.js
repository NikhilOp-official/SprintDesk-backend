require("dotenv").config();

const cors = require("cors");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const connectDb = require("./config/database");
const authRouter = require("./routers/auth");
const projectRouter = require("./routers/project");
const userRouter = require("./routers/user");
const issueRouter = require("./routers/issue");
const socketAuthMiddleware = require("./middlewares/socketAuthMiddleware");
const { default: mongoose } = require("mongoose");
const Project = require("./models/Project");

const app = express();
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
  }),
);

app.use(express.json());

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use("/users", userRouter);
app.use("/", issueRouter);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

io.use(socketAuthMiddleware);

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("project:join", async (payload, callback) => {
    const respond = typeof callback === "function" ? callback : () => {};

    try {
      const projectId = payload?.projectId;

      if (!mongoose.isValidObjectId(projectId)) {
        return respond({
          success: false,
          message: "Invalid project ID",
        });
      }

      const project = await Project.findById(projectId).select(
        "owner members status",
      );

      if (!project) {
        return respond({
          success: false,
          message: "Project not found",
        });
      }

      // Admins can access only projects they own.
      // Members can access only projects they belong to.
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

      const room = `project:${project._id.toString()}`;

      await socket.join(room);

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

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDb();
    console.log("MongoDB connected successfully");

    server.listen(PORT, () => {
      console.log(`Server started successfully on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error.message);
    process.exit(1);
  }
}

startServer();
