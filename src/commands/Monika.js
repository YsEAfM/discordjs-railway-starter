const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("monika")
    .setDescription("Just Monika."),

  async execute(interaction) {
    await interaction.reply("JUST MONIKA");
  },
};