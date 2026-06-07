const mongoose = require("mongoose");

const resetCodeSchema = new mongoose.Schema({
    code: String,
    discordId: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("ResetCode", resetCodeSchema);
