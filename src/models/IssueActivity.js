const mongoose = require("mongoose");

const issueActivitySchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changes: [
      {
        field: {
          type: String,
          enum: ["status", "assigneeId", "priority"],
          required: true,
        },
        from: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        to: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("IssueActivity", issueActivitySchema);
