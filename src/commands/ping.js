const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check Y’sEAƒM connection latency."),

  async execute(interaction) {
    const websocketPing =
      interaction.client?.ws?.ping;

    const ping =
      typeof websocketPing === "number"
        ? Math.round(websocketPing)
        : null;

    if (ping === null) {
      return interaction.reply(
        "VM1 connection detected.\nLatency data unavailable."
      );
    }

    return interaction.reply(
      `VM1 connection detected.\nLatency: ${ping} ms`
    );
  },
};