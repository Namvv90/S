const mongoose = require("mongoose");

const resetCodeSchema = new mongoose.Schema({
    code: String
});

module.exports = mongoose.model("ResetCode", resetCodeSchema);
