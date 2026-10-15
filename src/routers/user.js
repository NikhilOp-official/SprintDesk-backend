const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { getMembers, createMember } = require("../controllers/userController");

const userRouter = express.Router();

userRouter.get("/members", authMiddleware, getMembers);

userRouter.post(
  "/member",
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create members",
      });
    }

    next();
  },
  createMember,
);

module.exports = userRouter;
