const express = require("express");
const { login, changePassword } = require("../controllers/authController");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");

const authRouter = express.Router();

authRouter.post("/login", login);
authRouter.patch("/change-password", authMiddleware, changePassword);

authRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Fetch current user failed:", error.message);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = authRouter;
