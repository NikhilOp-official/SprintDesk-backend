require("dotenv").config();

const cors = require("cors");
const express = require("express");
const http = require("http");

const connectDb = require("./config/database");
const authRouter = require("./routers/auth");
const projectRouter = require("./routers/project");
const userRouter = require("./routers/user");
const issueRouter = require("./routers/issue");
const { createSocketServer } = require("./socket");

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

const io = createSocketServer(server);

app.set("io", io);

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
