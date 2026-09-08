const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} = require("discord.js");

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("DISCORD_TOKEN is not set.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,
  ],
});

client.commands = new Collection();

// Load slash commands
const commandsDir = path.join(__dirname, "commands");
const payload = [];

for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));

  if (!command?.data || typeof command.execute !== "function") {
    console.warn(`Skipping ${file}: invalid command.`);
    continue;
  }

  client.commands.set(command.data.name, command);
  payload.push(command.data.toJSON());
}

// Ready + slash-command registration
client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(token);

    // Remove old server-specific slash commands.
    // This is mainly to kill the old Cloudflare-era /elevated_access.
    for (const guild of c.guilds.cache.values()) {
      await rest.put(
        Routes.applicationGuildCommands(c.user.id, guild.id),
        { body: [] }
      );

      console.log(
        `Cleared old guild slash commands from: ${guild.name}`
      );
    }

    // Register the current commands globally.
    await rest.put(
      Routes.applicationCommands(c.user.id),
      { body: payload }
    );

    console.log(
      `Registered ${payload.length} slash command(s): ${payload
        .map((cmd) => `/${cmd.name}`)
        .join(", ")}`
    );
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

// Slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    const response = {
      content: "There was an error while executing this command.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
    } else {
      await interaction.reply(response);
    }
  }
});

// Normal messages — servers + DMs
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const text = message.content.trim().toLowerCase();

  if (text === "happy thoughts") {
    await message.channel.send({
      files: [
        "https://cdn.discordapp.com/attachments/1546824395081777203/1546824428816695307/IMG_5130.jpg?ex=6aa13002&is=6a9fde82&hm=b746c191bcda77959f2ec654e31a0c670b50ec2edb5b7667f999c073fad4b245&"
      ],
    });
    return;
  }

  if (text === "i gently open the door") {
    await message.reply("Sayori.chr deleted successfully.");
  }
});

// Welcome new server members
client.on(Events.GuildMemberAdd, async (member) => {
  const channel = member.guild.channels.cache.get(
    "1546838544285175891"
  );

  if (!channel || !channel.isTextBased()) {
    console.error("Welcome channel not found or is not text-based.");
    return;
  }

  await channel.send(
    `Welcome to the LC on VM1, ${member.displayName}.chr`
  );
});

client.login(token).catch((error) => {
  console.error("Failed to login to Discord:", error);
  process.exit(1);
});