require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const connectDB = require("../config/database");
const User = require("../models/User");
const Project = require("../models/Project");
const Issue = require("../models/Issue");

async function seedDatabase() {
  try {
    await connectDB();
    console.log("MongoDB connected for seeding");

    // Clear existing SprintDesk demo data.
    // Run this only against your local development database.
    await Issue.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    const passwordHash = await bcrypt.hash("SprintDesk@123", 12);

    const [admin, member1, member2] = await User.create([
      {
        name: "SprintDesk Admin",
        email: "admin@sprintdesk.local",
        passwordHash,
        role: "admin",
      },
      {
        name: "Aarav Sharma",
        email: "aarav@sprintdesk.local",
        passwordHash,
        role: "member",
      },
      {
        name: "Priya Patel",
        email: "priya@sprintdesk.local",
        passwordHash,
        role: "member",
      },
    ]);

    const [project1, project2] = await Project.create([
      {
        name: "Payment Dashboard",
        description: "Track payment workflows and issues.",
        owner: admin._id,
        members: [member1._id, member2._id],
        status: "active",
      },
      {
        name: "Customer Portal",
        description: "Manage customer portal improvements.",
        owner: admin._id,
        members: [member1._id],
        status: "active",
      },
    ]);

    const issueTemplates = [
      ["Fix login validation", "To Do", "High"],
      ["Improve dashboard loading", "In Progress", "High"],
      ["Review payment error messages", "In Review", "Medium"],
      ["Update profile layout", "Done", "Low"],
      ["Fix transaction filter", "To Do", "Medium"],
      ["Add form validation", "In Progress", "Medium"],
      ["Correct mobile spacing", "In Review", "Low"],
      ["Fix logout redirect", "Done", "High"],
      ["Improve API error display", "To Do", "Low"],
      ["Update customer details", "In Progress", "High"],
      ["Fix password field styling", "In Review", "Medium"],
      ["Add empty state message", "Done", "Low"],
    ];

    const projects = [
      project1,
      project1,
      project1,
      project1,
      project1,
      project1,
      project2,
      project2,
      project2,
      project2,
      project2,
      project2,
    ];

    const members = [member1, member2];

    const issues = issueTemplates.map(([title, status, priority], index) => ({
      title,
      description: `Demo issue: ${title}.`,
      projectId: projects[index]._id,
      status,
      priority,
      creatorId: members[index % members.length]._id,
      assigneeId: members[(index + 1) % members.length]._id,
      dueDate: new Date(Date.now() + (index + 1) * 86400000),
    }));

    await Issue.insertMany(issues);

    console.log("Database seeded successfully!");
    console.log("Users created: 3");
    console.log("Projects created: 2");
    console.log("Issues created: 12");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
