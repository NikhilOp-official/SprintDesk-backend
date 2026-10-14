const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const Project = require("../models/Project");
const IssueActivity = require("../models/IssueActivity");

const STATUSES = ["To Do", "In Progress", "In Review", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

const isValidId = (id) => mongoose.isValidObjectId(id);

const hasProjectAccess = (project, user) => {
  const ownerId = String(project.owner?._id || project.owner);
  const userId = String(user.userId);

  if (user.role === "admin") {
    return ownerId === userId;
  }

  return project.members.some(
    (member) => String(member._id || member) === userId,
  );
};

const canEditIssue = (issue, user) =>
  user.role === "admin" ||
  String(issue.creatorId?._id || issue.creatorId) === String(user.userId) ||
  String(issue.assigneeId?._id || issue.assigneeId) === String(user.userId);

const getAccessibleIssue = async (id, user) => {
  const issue = await Issue.findById(id);

  if (!issue) {
    return { error: { status: 404, message: "Issue not found" } };
  }

  const project = await Project.findById(issue.projectId);

  if (!project) {
    return { error: { status: 404, message: "Project not found" } };
  }

  if (!hasProjectAccess(project, user)) {
    return {
      error: { status: 403, message: "You do not have access to this issue" },
    };
  }

  return { issue, project };
};

// POST /projects/:projectId/issues
const createIssue = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description = "",
      status = "To Do",
      priority = "Medium",
      assigneeId = null,
      dueDate = null,
    } = req.body;

    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (title.trim().length > 150) {
      return res.status(400).json({
        message: "Title cannot exceed 150 characters",
      });
    }

    if (typeof description !== "string") {
      return res.status(400).json({
        message: "Description must be a string",
      });
    }

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid issue status" });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid issue priority" });
    }

    if (dueDate !== null && dueDate !== "") {
      if (typeof dueDate !== "string" || Number.isNaN(Date.parse(dueDate))) {
        return res.status(400).json({ message: "Invalid due date" });
      }
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({
        message: "You do not have access to this project",
      });
    }

    if (project.status === "archived") {
      return res.status(403).json({
        message: "Cannot create issues in an archived project",
      });
    }

    let validatedAssigneeId = null;

    if (assigneeId !== null && assigneeId !== "") {
      if (!isValidId(assigneeId)) {
        return res.status(400).json({ message: "Invalid assignee ID" });
      }

      const isMember = project.members.some(
        (member) => String(member) === String(assigneeId),
      );

      if (!isMember) {
        return res.status(400).json({
          message: "Assignee must be a member of this project",
        });
      }

      // Only admins can assign an issue to another user.
      if (
        req.user.role !== "admin" &&
        String(assigneeId) !== String(req.user.userId)
      ) {
        return res.status(403).json({
          message: "Only admins can assign issues to other users",
        });
      }

      validatedAssigneeId = assigneeId;
    }

    const issue = await Issue.create({
      title: title.trim(),
      description: description.trim(),
      projectId,
      status,
      priority,
      creatorId: req.user.userId,
      assigneeId: validatedAssigneeId,
      dueDate: dueDate || null,
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate("creatorId", "name email")
      .populate("assigneeId", "name email");

    return res.status(201).json({
      message: "Issue created successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    console.error("Create issue error:", error);
    return res.status(500).json({ message: "Failed to create issue" });
  }
};

// GET /projects/:projectId/issues
const getProjectIssues = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!isValidId(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (!hasProjectAccess(project, req.user)) {
      return res.status(403).json({
        message: "You do not have access to this project",
      });
    }

    const {
      search = "",
      status,
      priority,
      assigneeId,
      sort = "newest",
    } = req.query;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: "Page must be positive and limit must be between 1 and 100",
      });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid issue status filter" });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority filter" });
    }

    if (assigneeId && assigneeId !== "unassigned" && !isValidId(assigneeId)) {
      return res.status(400).json({ message: "Invalid assignee filter" });
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      dueDate: { dueDate: 1, createdAt: -1 },
    };

    if (!Object.hasOwn(sortOptions, sort)) {
      return res.status(400).json({ message: "Invalid sort option" });
    }

    const filter = { projectId };

    if (search.trim()) {
      filter.title = { $regex: search.trim(), $options: "i" };
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (assigneeId === "unassigned") {
      filter.assigneeId = null;
    } else if (assigneeId) {
      filter.assigneeId = assigneeId;
    }

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .populate("creatorId", "name email")
        .populate("assigneeId", "name email")
        .sort(sortOptions[sort])
        .skip((page - 1) * limit)
        .limit(limit),
      Issue.countDocuments(filter),
    ]);

    return res.status(200).json({
      issues,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get project issues error:", error);
    return res.status(500).json({ message: "Failed to fetch issues" });
  }
};

// GET /issues/:id
const getIssueById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    const result = await getAccessibleIssue(id, req.user);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const issue = await Issue.findById(id)
      .populate("creatorId", "name email")
      .populate("assigneeId", "name email")
      .populate("projectId", "name status");

    return res.status(200).json({ issue });
  } catch (error) {
    console.error("Get issue error:", error);
    return res.status(500).json({ message: "Failed to fetch issue" });
  }
};

// PATCH /issues/:id
const updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigneeId, dueDate } =
      req.body;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    const result = await getAccessibleIssue(id, req.user);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const { issue, project } = result;

    if (project.status === "archived") {
      return res.status(403).json({
        message: "Cannot update issues in an archived project",
      });
    }

    if (!canEditIssue(issue, req.user)) {
      return res.status(403).json({
        message: "You cannot edit this issue",
      });
    }

    const updates = {};
    const changes = [];

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (title.trim().length > 150) {
        return res.status(400).json({
          message: "Title cannot exceed 150 characters",
        });
      }

      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      updates.description = description.trim();
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid issue status" });
      }

      if (issue.status !== status) {
        changes.push({
          field: "status",
          from: issue.status,
          to: status,
        });
      }

      updates.status = status;
    }

    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: "Invalid issue priority" });
      }

      if (issue.priority !== priority) {
        changes.push({
          field: "priority",
          from: issue.priority,
          to: priority,
        });
      }

      updates.priority = priority;
    }

    if (assigneeId !== undefined) {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          message: "Only admins can assign issues",
        });
      }

      let nextAssigneeId = null;

      if (assigneeId !== null && assigneeId !== "") {
        if (!isValidId(assigneeId)) {
          return res.status(400).json({ message: "Invalid assignee ID" });
        }

        const isMember = project.members.some(
          (member) => String(member) === String(assigneeId),
        );

        if (!isMember) {
          return res.status(400).json({
            message: "Assignee must be a member of this project",
          });
        }

        nextAssigneeId = assigneeId;
      }

      const previousAssigneeId = issue.assigneeId
        ? String(issue.assigneeId)
        : null;

      if (previousAssigneeId !== nextAssigneeId) {
        changes.push({
          field: "assigneeId",
          from: previousAssigneeId,
          to: nextAssigneeId,
        });
      }

      updates.assigneeId = nextAssigneeId;
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === "") {
        updates.dueDate = null;
      } else if (
        typeof dueDate !== "string" ||
        Number.isNaN(Date.parse(dueDate))
      ) {
        return res.status(400).json({ message: "Invalid due date" });
      } else {
        updates.dueDate = dueDate;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    Object.assign(issue, updates);
    await issue.save();

    if (changes.length > 0) {
      await IssueActivity.create({
        issueId: issue._id,
        actorId: req.user.userId,
        changes,
      });
    }

    const populatedIssue = await Issue.findById(issue._id)
      .populate("creatorId", "name email")
      .populate("assigneeId", "name email")
      .populate("projectId", "name status");

    return res.status(200).json({
      message: "Issue updated successfully",
      issue: populatedIssue,
    });
  } catch (error) {
    console.error("Update issue error:", error);
    return res.status(500).json({ message: "Failed to update issue" });
  }
};

// DELETE /issues/:id — admin only
const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    const result = await getAccessibleIssue(id, req.user);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const { issue, project } = result;

    if (project.status === "archived") {
      return res.status(403).json({
        message: "Cannot delete issues in an archived project",
      });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can delete issues",
      });
    }

    await IssueActivity.deleteMany({ issueId: issue._id });
    await issue.deleteOne();

    return res.status(200).json({
      message: "Issue deleted successfully",
    });
  } catch (error) {
    console.error("Delete issue error:", error);
    return res.status(500).json({ message: "Failed to delete issue" });
  }
};

// GET /issues/:id/activity
const getIssueActivity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: "Invalid issue ID" });
    }

    const result = await getAccessibleIssue(id, req.user);

    if (result.error) {
      return res.status(result.error.status).json({
        message: result.error.message,
      });
    }

    const activity = await IssueActivity.find({ issueId: id })
      .populate("actorId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: activity.length,
      activity,
    });
  } catch (error) {
    console.error("Get issue activity error:", error);
    return res.status(500).json({
      message: "Failed to fetch issue activity",
    });
  }
};

module.exports = {
  createIssue,
  getProjectIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  getIssueActivity,
};
