const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

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

const Key = require("./models/Key");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const OWNER_ID = "1101827562243641364";
const PREMIUM_ROLE = "1356627402213556265";

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

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
            return interaction.reply({ content: "❌ Owner Only", ephemeral: true });
        }
    
        const key = interaction.options.getString("key");
    
        const exist = await Key.findOne({ key });
        if (exist) {
            return interaction.reply({ content: "❌ Key Already Exists", ephemeral: true });
        }
    
        await Key.create({
            key: key,
            used: false,
            discordId: "",
            hwid: ""
        });
    
        return interaction.reply({
            content: `✅ Key Created: ${key}`,
            ephemeral: true
        });
    }
    
    if (interaction.commandName === "blacklist-key") {
    
        if (userId !== OWNER_ID) {
            return interaction.reply({ content: "❌ Owner Only", ephemeral: true });
        }
    
        const key = interaction.options.getString("key");
    
        const data = await Key.findOne({ key });
    
        if (!data) {
            return interaction.reply({ content: "❌ Key Not Found", ephemeral: true });
        }
    
        await Key.deleteOne({ key });
    
        return interaction.reply({
            content: `✅ Key Blacklisted: ${key}`,
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
    
        const data = await Key.findOne({ key });
    
        if (!data) {
            return interaction.editReply("❌ Key Not Working");
        }
    
        if (data.used) {
            return interaction.editReply("❌ Key Already Redeemed");
        }
    
        try {
            await member.roles.add(PREMIUM_ROLE);
        } catch (e) {
            return interaction.editReply("❌ Bot missing Manage Roles permission");
        }
    
        data.used = true;
        data.discordId = member.user.id;
        data.hwid = "";
    
        await data.save();
    
        return interaction.editReply("✅ Redeem Success");
    }
    
    if (interaction.commandName === "get-role") {
    
        const member = interaction.member;
    
        if (member.roles.cache.has(PREMIUM_ROLE)) {
            return interaction.reply({ content: "❌ You Already Have Role", ephemeral: true });
        }
    
        const data = await Key.findOne({ discordId: userId });
    
        if (!data) {
            return interaction.reply({ content: "❌ No Redeemed Key Found", ephemeral: true });
        }
    
        await member.roles.add(PREMIUM_ROLE);
    
        return interaction.reply({
            content: "✅ Role Added",
            ephemeral: true
        });
    }
    
    if (interaction.commandName === "get-key") {
    
        const data = await Key.findOne({ discordId: userId });
    
        if (!data) {
            return interaction.reply({ content: "❌ Key Not Found", ephemeral: true });
        }
    
        return interaction.reply({
            content: `Your Key: \`${data.key}\``,
            ephemeral: true
        });
    }
    
    if (interaction.commandName === "resethwid") {
    
        const data = await Key.findOne({ discordId: userId });
    
        if (!data) {
            return interaction.reply({ content: "❌ Key Not Found", ephemeral: true });
        }
    
        data.hwid = "";
        await data.save();
    
        return interaction.reply({
            content: "✅ HWID Reset Success",
            ephemeral: true
        });
    }
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

app.post("/checkkey", async (req, res) => {

    const { key } = req.body;

    const data = await Key.findOne({ key });

    if (!data || !data.used) {
        return res.json({ success: false });
    }

    return res.json({ success: true });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`API Started On Port ${PORT}`);
});

app.get("/", (req, res) => {
    res.send("Bot is running");
});

app.get("/db", async (req, res) => {
    const keys = await Key.find({});
    res.json(keys);
});

app.post("/sethwid", async (req, res) => {

    const { key, hwid } = req.body;

    const data = await Key.findOne({ key });

    if (!data) {
        return res.json({ success: false, message: "Key not found" });
    }

    data.hwid = hwid;
    await data.save();

    return res.json({ success: true });
});

client.login(TOKEN);
