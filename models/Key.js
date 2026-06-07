const mongoose = require("mongoose");

const keySchema = new mongoose.Schema({
    key: String,
    used: { type: Boolean, default: false },
    discordId: String,
    hwid: { type: String, default: "" }
});

module.exports = mongoose.model("Key", keySchema);
