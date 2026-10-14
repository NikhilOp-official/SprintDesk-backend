const User = require("../models/User");

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

module.exports = { getMembers };
