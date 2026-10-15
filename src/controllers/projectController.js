const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const Project = require("../models/Project");
const User = require("../models/User");

const getProjects = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin"
        ? { owner: req.user.userId }
        : {
            $or: [{ owner: req.user.userId }, { members: req.user.userId }],
          };

    const projects = await Project.find(filter)
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error("Get projects error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate project name
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Project name is required",
      });
    }

    // Only admins can create projects
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create projects",
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description?.trim() || "",
      owner: req.user.userId,
      members: [],
    });

    return res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Create project error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    // Find the project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only the owning admin can update the project
    if (
      req.user.role !== "admin" ||
      project.owner.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "You are not allowed to update this project",
      });
    }

    // Archived projects are read-only
    if (project.status === "archived") {
      return res.status(400).json({
        message: "Archived projects cannot be updated",
      });
    }

    // Validate provided fields
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Project name cannot be empty",
        });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }
      project.description = description.trim();
    }

    if (status !== undefined) {
      if (!["active", "archived"].includes(status)) {
        return res.status(400).json({
          message: "Status must be active or archived",
        });
      }
      project.status = status;
    }

    await project.save();

    return res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    console.error("Update project error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const addProjectMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;

    // Validate member IDs
    if (
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      memberIds.some(
        (memberId) =>
          typeof memberId !== "string" || !mongoose.isValidObjectId(memberId),
      )
    ) {
      return res.status(400).json({
        message: "Please provide a valid, non-empty array of member IDs",
      });
    }

    // Find the project
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Only the owning admin can manage members
    if (
      req.user.role !== "admin" ||
      project.owner.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "You are not allowed to manage this project",
      });
    }

    // Archived projects are read-only
    if (project.status === "archived") {
      return res.status(400).json({
        message: "Archived projects cannot be modified",
      });
    }

    // Remove duplicate IDs within the request
    const uniqueMemberIds = [...new Set(memberIds)];

    // Fetch all selected users
    const users = await User.find({
      _id: { $in: uniqueMemberIds },
    }).select("_id role");

    // Ensure every selected user exists
    if (users.length !== uniqueMemberIds.length) {
      return res.status(404).json({
        message: "One or more selected users were not found",
      });
    }

    // Only members can be added
    if (users.some((user) => user.role !== "member")) {
      return res.status(400).json({
        message: "Only users with the member role can be added",
      });
    }

    // Add all selected members in one save
    project.members.push(...uniqueMemberIds);
    await project.save();

    const updatedProject = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members", "name email");

    return res.status(200).json({
      message: "Members added successfully",
      project: updatedProject,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID or member ID",
      });
    }

    console.error("Add project members error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const removeProjectMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    if (
      req.user.role !== "admin" ||
      project.owner.toString() !== req.user.userId
    ) {
      return res.status(403).json({
        message: "You are not allowed to manage this project",
      });
    }

    if (project.status === "archived") {
      return res.status(400).json({
        message: "Archived projects cannot be modified",
      });
    }

    const memberIndex = project.members.findIndex(
      (memberId) => memberId.toString() === userId,
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        message: "User is not a member of this project",
      });
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    const io = req.app.get("io");

    if (io) {
      const projectId = project._id.toString();
      const room = `project:${projectId}`;

      // Notify remaining project members.
      io.to(room).emit("project:memberRemoved", {
        projectId,
        userId,
      });

      // // Remove the revoked member's sockets from the room.
      // const sockets = await io.in(room).fetchSockets();

      // for (const socket of sockets) {
      //   if (socket.user?.userId === userId) {
      //     // Notify this user's socket directly before removing it.
      //     socket.emit("project:accessRevoked", { projectId });

      //     await socket.leave(room);
      //   }
      // }
    }

    return res.status(200).json({
      message: "Member removed successfully",
      project,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID or user ID",
      });
    }

    console.error("Remove project member error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Admins can access their own projects.
    // Members can access projects they belong to.
    const isOwner = project.owner._id.toString() === req.user.userId;

    const isMember = project.members.some(
      (member) => member._id.toString() === req.user.userId,
    );

    if (
      (req.user.role === "admin" && !isOwner) ||
      (req.user.role !== "admin" && !isOwner && !isMember)
    ) {
      return res.status(403).json({
        message: "You are not allowed to access this project",
      });
    }

    const issues = await Issue.find({ projectId: project._id });

    const summary = {
      totalIssues: issues.length,
      todo: issues.filter((issue) => issue.status === "To Do").length,
      inProgress: issues.filter((issue) => issue.status === "In Progress")
        .length,
      inReview: issues.filter((issue) => issue.status === "In Review").length,
      done: issues.filter((issue) => issue.status === "Done").length,
    };

    return res.status(200).json({
      project,
      summary,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    console.error("Get project error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  getProjects,
  createProject,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  getProjectById,
};
