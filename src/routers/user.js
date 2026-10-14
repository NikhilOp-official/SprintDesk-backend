const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const { getMembers } = require("../controllers/userController");

const router = express.Router();

router.get("/members", authMiddleware, getMembers);

module.exports = router;
