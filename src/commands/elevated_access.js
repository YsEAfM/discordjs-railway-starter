const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("elevated_access")
    .setDescription("MES elevated access interface.")

    // BAN
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ban")
        .setDescription("Delete a character file.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file to delete.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason.")
            .setRequired(false)
        )
    )

    // KICK
    .addSubcommand((subcommand) =>
      subcommand
        .setName("kick")
        .setDescription("Disconnect a character file from VM1.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file to disconnect.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason.")
            .setRequired(false)
        )
    )

    // TIMEOUT
    .addSubcommand((subcommand) =>
      subcommand
        .setName("timeout")
        .setDescription("Revoke communication access.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("minutes")
            .setDescription("Timeout duration in minutes.")
            .setMinValue(1)
            .setMaxValue(40320)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason.")
            .setRequired(false)
        )
    )

    // REMOVE TIMEOUT
    .addSubcommand((subcommand) =>
      subcommand
        .setName("untimeout")
        .setDescription("Restore communication access.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file.")
            .setRequired(true)
        )
    )

    // RENAME
    .addSubcommand((subcommand) =>
      subcommand
        .setName("rename")
        .setDescription("Modify character file properties.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("New nickname.")
            .setMaxLength(32)
            .setRequired(true)
        )
    )

    // PROMOTE
    .addSubcommand((subcommand) =>
      subcommand
        .setName("promote")
        .setDescription("Grant elevated access.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file.")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Access level.")
            .setRequired(true)
        )
    )

    // DEMOTE
    .addSubcommand((subcommand) =>
      subcommand
        .setName("demote")
        .setDescription("Revoke elevated access.")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Character file.")
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Access level.")
            .setRequired(true)
        )
    )

    // PURGE
    .addSubcommand((subcommand) =>
      subcommand
        .setName("purge")
        .setDescription("Clean corrupted dialogue history.")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Number of entries to remove.")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )

    // SLOWMODE
    .addSubcommand((subcommand) =>
      subcommand
        .setName("slowmode")
        .setDescription("Modify VM1 communication rate.")
        .addIntegerOption((option) =>
          option
            .setName("seconds")
            .setDescription("0 disables slowmode.")
            .setMinValue(0)
            .setMaxValue(21600)
            .setRequired(true)
        )
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Error: VM1 connection unavailable.",
        ephemeral: true,
      });
    }

    const action = interaction.options.getSubcommand();

    try {
      // BAN
      if (action === "ban") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers)) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const user = interaction.options.getUser("user");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        await interaction.guild.members.ban(user.id, { reason });

        return interaction.reply(
          `Deleting character file...\n${user.username}.chr has been removed from the simulation.`
        );
      }

      // KICK
      if (action === "kick") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers)) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        await member.kick(reason);

        return interaction.reply(
          `Disconnecting ${member.user.username}.chr from VM1...\nConnection terminated.`
        );
      }

      // TIMEOUT
      if (action === "timeout") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ModerateMembers
          )
        ) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");
        const minutes = interaction.options.getInteger("minutes");
        const reason =
          interaction.options.getString("reason") || "No reason provided.";

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        await member.timeout(minutes * 60 * 1000, reason);

        return interaction.reply(
          `Communication access revoked for ${member.user.username}.chr.\nDuration: ${minutes} minute(s).`
        );
      }

      // REMOVE TIMEOUT
      if (action === "untimeout") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ModerateMembers
          )
        ) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        await member.timeout(null);

        return interaction.reply(
          `Communication access restored for ${member.user.username}.chr.`
        );
      }

      // RENAME
      if (action === "rename") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageNicknames
          )
        ) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");
        const newName = interaction.options.getString("name");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        const oldName = member.displayName;

        await member.setNickname(newName);

        return interaction.reply(
          `Modifying character file properties...\n${oldName}.chr → ${newName}.chr`
        );
      }

      // PROMOTE
      if (action === "promote") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");
        const role = interaction.options.getRole("role");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        await member.roles.add(role);

        return interaction.reply(
          `MES granted elevated access to ${member.user.username}.chr.\nAccess level: ${role.name}`
        );
      }

      // DEMOTE
      if (action === "demote") {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const member = interaction.options.getMember("user");
        const role = interaction.options.getRole("role");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        await member.roles.remove(role);

        return interaction.reply(
          `Elevated access revoked from ${member.user.username}.chr.\nAccess level removed: ${role.name}`
        );
      }

      // PURGE
      if (action === "purge") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
          )
        ) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const amount = interaction.options.getInteger("amount");

        if (!interaction.channel?.bulkDelete) {
          return interaction.reply({
            content: "Permission failed to load.",
            ephemeral: true,
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const deleted = await interaction.channel.bulkDelete(amount, true);

        return interaction.editReply(
          `Cleaning corrupted dialogue history...\n${deleted.size} entries removed.`
        );
      }

      // SLOWMODE
      if (action === "slowmode") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return interaction.reply({
            content: "Error: elevated_access = false",
            ephemeral: true,
          });
        }

        const seconds = interaction.options.getInteger("seconds");

        await interaction.channel.setRateLimitPerUser(seconds);

        if (seconds === 0) {
          return interaction.reply(
            "VM1 communication restrictions removed."
          );
        }

        return interaction.reply(
          `VM1 communication rate limited to ${seconds} seconds.`
        );
      }
    } catch (error) {
      console.error(`elevated_access/${action}:`, error);

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
          content: "Permission failed to load.",
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: "Permission failed to load.",
        ephemeral: true,
      });
    }
  },
};