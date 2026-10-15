const User = require("../models/User");
const bcrypt = require("bcryptjs");
const getMembers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can view available members",
      });
    }

    const members = await User.find({ role: "member" })
      .select("_id name email")
      .sort({ name: 1 });

    return res.status(200).json({
      count: members.length,
      members,
    });
  } catch (error) {
    console.error("Get members error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const createMember = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email, and temporary password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Temporary password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const member = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "member",
    });

    return res.status(201).json({
      message: "Member created successfully",
      user: {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A user with this email already exists",
      });
    }

    console.error("Create member error:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { getMembers, createMember };
