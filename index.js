const fs = require("fs");

const express = require("express");
const app = express();

app.use(express.json());

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const OWNER_ID = "1101827562243641364";
const PREMIUM_ROLE = "1356627402213556265";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

let db = { KeyDontUse: {}, KeyUse: {} };

try {
    if (fs.existsSync("db.json")) {
        const raw = fs.readFileSync("db.json", "utf8");
        db = JSON.parse(raw || "{}");
    }
} catch (e) {
    console.log("DB corrupted, reset safe mode");
}

function saveDB() {
    fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

setInterval(() => {
    try {
        fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
    } catch (e) {}
}, 5000);

const commands = [
    new SlashCommandBuilder()
        .setName("create-key")
        .setDescription("Create Key")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("Key")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("blacklist-key")
        .setDescription("Blacklist Key")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("Key")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("redeem")
        .setDescription("Redeem Key")
        .addStringOption(o =>
            o.setName("key")
                .setDescription("Key")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("get-role")
        .setDescription("Get Premium Role"),

    new SlashCommandBuilder()
        .setName("get-key")
        .setDescription("Get Your Key"),

    new SlashCommandBuilder()
        .setName("resethwid")
        .setDescription("Reset HWID")
]
.map(cmd => cmd.toJSON());

(async () => {
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
    );

    console.log("Slash Commands Loaded");
})();

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const userId = interaction.user.id;

    if (interaction.commandName === "create-key") {

        if (userId !== OWNER_ID) {
            return interaction.reply({
                content: "❌ Owner Only",
                ephemeral: true
            });
        }

        const key = interaction.options.getString("key");

        if (
            db.KeyDontUse[key] ||
            db.KeyUse[key]
        ) {
            return interaction.reply({
                content: "❌ Key Already Exists",
                ephemeral: true
            });
        }

        db.KeyDontUse[key] = true;

        saveDB();

        return interaction.reply({
            content: `✅ Key Create: ${key}`,
            ephemeral: true
        });
    }

    if (interaction.commandName === "blacklist-key") {

        if (userId !== OWNER_ID) {
            return interaction.reply({
                content: "❌ Owner Only",
                ephemeral: true
            });
        }

        const key = interaction.options.getString("key");

        if (db.KeyUse[key]) {

            delete db.KeyUse[key];

            saveDB();

            return interaction.reply({
                content: `✅ Blacklist Key: ${key}`,
                ephemeral: true
            });
        }

        return interaction.reply({
            content: "❌ No Keys in the Used List",
            ephemeral: true
        });
    }

    if (interaction.commandName === "redeem") {
    
        await interaction.deferReply({ ephemeral: true });
    
        const member = interaction.member;
        const key = interaction.options.getString("key");
    
        if (member.roles.cache.has(PREMIUM_ROLE)) {
            return interaction.editReply("❌ Already Redeemed");
        }
    
        if (!db.KeyDontUse[key]) {
            return interaction.editReply("❌ Key Not Working");
        }
    
        if (db.KeyUse[key]) {
            return interaction.editReply("❌ Key Already Redeemed");
        }
    
        try {
            await member.roles.add(PREMIUM_ROLE);
        } catch (e) {
            return interaction.editReply("❌ Bot missing Manage Roles permission");
        }
    
        delete db.KeyDontUse[key];
    
        db.KeyUse[key] = {
            DiscordId: member.user.id,
            Hwid: ""
        };
    
        try {
            fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
        } catch (e) {
            console.log("Save DB failed");
        }
    
        return interaction.editReply("✅ Redeem Success");
    }

    if (interaction.commandName === "get-role") {

        const member = interaction.member;

        if (member.roles.cache.has(PREMIUM_ROLE)) {
            return interaction.reply({
                content: "❌ You Already Have a Role",
                ephemeral: true
            });
        }

        for (const key in db.KeyUse) {

            if (
                db.KeyUse[key].DiscordId === userId
            ) {

                await member.roles.add(PREMIUM_ROLE);

                return interaction.reply({
                    content: "✅ Role Added",
                    ephemeral: true
                });
            }
        }

        return interaction.reply({
            content: "❌ No Redeemed Key Found",
            ephemeral: true
        });
    }

    if (interaction.commandName === "get-key") {

        const member = interaction.member;

        if (!member.roles.cache.has(PREMIUM_ROLE)) {
            return interaction.reply({
                content: "❌ You Don't Already Redeemed A Key",
                ephemeral: true
            });
        }

        for (const key in db.KeyUse) {

            if (
                db.KeyUse[key].DiscordId === userId
            ) {

                return interaction.reply({
                    content: `Your Key: \`${key}\``,
                    ephemeral: true
                });
            }
        }

        return interaction.reply({
            content: "❌ Key Not Found",
            ephemeral: true
        });
    }

    if (interaction.commandName === "resethwid") {

        const member = interaction.member;

        if (!member.roles.cache.has(PREMIUM_ROLE)) {
            return interaction.reply({
                content: "❌ You Don't Already Redeemed A Key",
                ephemeral: true
            });
        }

        for (const key in db.KeyUse) {

            if (
                db.KeyUse[key].DiscordId === userId
            ) {

                db.KeyUse[key].Hwid = "";

                saveDB();

                return interaction.reply({
                    content: "✅ HWID Reset Success",
                    ephemeral: true
                });
            }
        }

        return interaction.reply({
            content: "❌ Key Not Found",
            ephemeral: true
        });
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

app.post("/checkkey", (req, res) => {

    const { key } = req.body;

    if (db.KeyUse[key]) {
        return res.json({
            success: true
        });
    }

    return res.json({
        success: false
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API Started On Port ${PORT}`);
});

app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.get("/db", (req, res) => {
    res.json(db);
});

app.post("/sethwid", (req, res) => {
    const { key, hwid } = req.body;

    if (!db.KeyUse[key]) {
        return res.json({ success: false, message: "Key not found" });
    }

    db.KeyUse[key].Hwid = hwid;

    saveDB();

    return res.json({ success: true });
});

client.login(TOKEN);
