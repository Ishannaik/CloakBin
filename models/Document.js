const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  value: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Document", documentSchema);
