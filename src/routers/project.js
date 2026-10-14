const express = require("express");
const {
  getProjects,
  createProject,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  getProjectById,
} = require("../controllers/projectController");
const authMiddleware = require("../middlewares/authMiddleware");

const projectRouter = express.Router();

projectRouter.get("/", authMiddleware, getProjects);

projectRouter.get("/:id", authMiddleware, getProjectById);
projectRouter.post("/", authMiddleware, createProject);
projectRouter.patch("/:id", authMiddleware, updateProject);
projectRouter.post("/:id/members", authMiddleware, addProjectMembers);
projectRouter.delete(
  "/:id/members/:userId",
  authMiddleware,
  removeProjectMember,
);

module.exports = projectRouter;
