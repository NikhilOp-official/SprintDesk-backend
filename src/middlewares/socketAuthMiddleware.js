const jwt = require("jsonwebtoken");
const User = require("../models/User");

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error("Server authentication is not configured"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm that the user still exists and use their current role.
    const user = await User.findById(decoded.userId).select("_id role");

    if (!user) {
      return next(new Error("User no longer exists"));
    }

    socket.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
};

module.exports = socketAuthMiddleware;
