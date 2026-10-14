const express = require("express");
const issueRouter = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  createIssue,
  getProjectIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  getIssueActivity,
} = require("../controllers/issueController");

issueRouter.use(authMiddleware);

issueRouter.post("/projects/:projectId/issues", createIssue);
issueRouter.get("/projects/:projectId/issues", getProjectIssues);

issueRouter.get("/issues/:id/activity", getIssueActivity);
issueRouter.get("/issues/:id", getIssueById);
issueRouter.patch("/issues/:id", updateIssue);
issueRouter.delete("/issues/:id", deleteIssue);

module.exports = issueRouter;
