const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");

function chr(name) {
  return name.toLowerCase().endsWith(".chr")
    ? name
    : `${name}.chr`;
}

async function getMember(interaction, optionName = "user") {
  const user = interaction.options.getUser(optionName);
  if (!user) return null;

  return interaction.guild.members.fetch(user.id).catch(() => null);
}

function accessDenied() {
  return {
    content: "Error: elevated_access = false",
    ephemeral: true,
  };
}

function operationFailed() {
  return {
    content: "Permission failed to load.",
    ephemeral: true,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("elevated_access")
    .setDescription("Access character file management.")

    // TYPE
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Select a VM1 character-file operation.")
        .setRequired(true)
        .addChoices(
          {
            name: "Delete character file",
            value: "delete_character_file",
          },
          {
            name: "Restore character file",
            value: "restore_character_file",
          },
          {
            name: "Disconnect character file",
            value: "disconnect_character_file",
          },
          {
            name: "Revoke communication access",
            value: "revoke_communication_access",
          },
          {
            name: "Restore communication access",
            value: "restore_communication_access",
          },
          {
            name: "Modify character file",
            value: "modify_character_file",
          },
          {
            name: "Clean dialogue history",
            value: "clean_dialogue_history",
          },
          {
            name: "Limit VM1 communication",
            value: "limit_vm1_communication",
          }
        )
    )

    // USER — used by ban, kick, timeout, untimeout, rename
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Target Discord member.")
        .setRequired(false)
    )

    // USER ID — needed for unban because banned users aren't server members
    .addStringOption((option) =>
      option
        .setName("user_id")
        .setDescription("Discord user ID. Used for restoring a banned file.")
        .setRequired(false)
    )

    // REASON
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the operation.")
        .setRequired(false)
    )

    // TIMEOUT LENGTH
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Communication restriction duration in minutes.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(false)
    )

    // NEW NICKNAME
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("New Discord nickname.")
        .setMaxLength(32)
        .setRequired(false)
    )

    // PURGE AMOUNT
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of dialogue entries to delete.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    )

    // SLOWMODE
    .addIntegerOption((option) =>
      option
        .setName("seconds")
        .setDescription("VM1 communication delay. Use 0 to disable.")
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Error: VM1 connection unavailable.",
        ephemeral: true,
      });
    }

    const type = interaction.options.getString("type");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";

    try {
      // =========================================================
      // DELETE CHARACTER FILE = BAN
      // =========================================================
      if (type === "delete_character_file") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.BanMembers
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const user = interaction.options.getUser("user");

        if (!user) {
          return interaction.reply({
            content: "Character file not specified.",
            ephemeral: true,
          });
        }

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (member && !member.bannable) {
          return interaction.reply(operationFailed());
        }

        await interaction.guild.members.ban(user.id, { reason });

        return interaction.reply(
          `Deleting character file...\n${chr(user.username)} has been removed from the simulation.\n\nReason: ${reason}`
        );
      }

      // =========================================================
      // RESTORE CHARACTER FILE = UNBAN
      // =========================================================
      if (type === "restore_character_file") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.BanMembers
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const userId = interaction.options.getString("user_id");

        if (!userId) {
          return interaction.reply({
            content:
              "Character file ID required. Use the user_id option.",
            ephemeral: true,
          });
        }

        const ban = await interaction.guild.bans
          .fetch(userId)
          .catch(() => null);

        if (!ban) {
          return interaction.reply({
            content: "Character file not found in deleted files.",
            ephemeral: true,
          });
        }

        await interaction.guild.bans.remove(userId, reason);

        return interaction.reply(
          `Restoring character file...\n${chr(
            ban.user.username
          )} has been restored.`
        );
      }

      // =========================================================
      // DISCONNECT CHARACTER FILE = KICK
      // =========================================================
      if (type === "disconnect_character_file") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.KickMembers
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const member = await getMember(interaction);

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (!member.kickable) {
          return interaction.reply(operationFailed());
        }

        const username = member.user.username;

        await member.kick(reason);

        return interaction.reply(
          `Disconnecting ${chr(
            username
          )} from VM1...\nConnection terminated.\n\nReason: ${reason}`
        );
      }

      // =========================================================
      // REVOKE COMMUNICATION = TIMEOUT
      // =========================================================
      if (type === "revoke_communication_access") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ModerateMembers
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const member = await getMember(interaction);
        const minutes = interaction.options.getInteger("minutes");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (!minutes) {
          return interaction.reply({
            content: "Communication restriction duration required.",
            ephemeral: true,
          });
        }

        if (!member.moderatable) {
          return interaction.reply(operationFailed());
        }

        await member.timeout(minutes * 60 * 1000, reason);

        return interaction.reply(
          `Communication access revoked for ${chr(
            member.user.username
          )}.\nDuration: ${minutes} minute(s).\n\nReason: ${reason}`
        );
      }

      // =========================================================
      // RESTORE COMMUNICATION = REMOVE TIMEOUT
      // =========================================================
      if (type === "restore_communication_access") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ModerateMembers
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const member = await getMember(interaction);

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (!member.moderatable) {
          return interaction.reply(operationFailed());
        }

        await member.timeout(null, reason);

        return interaction.reply(
          `Communication access restored for ${chr(
            member.user.username
          )}.`
        );
      }

      // =========================================================
      // MODIFY CHARACTER FILE = CHANGE NICKNAME
      // =========================================================
      if (type === "modify_character_file") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageNicknames
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const member = await getMember(interaction);
        const newName = interaction.options.getString("name");

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (!newName) {
          return interaction.reply({
            content: "New character file property required.",
            ephemeral: true,
          });
        }

        if (!member.manageable) {
          return interaction.reply(operationFailed());
        }

        const oldName = member.displayName;

        await member.setNickname(newName, reason);

        // Fetch again so Y'sEAfM verifies Discord actually changed it.
        const updated = await interaction.guild.members.fetch(member.id);

        if (updated.nickname !== newName) {
          return interaction.reply({
            content:
              "Character file modification failed.\nPermission failed to load.",
            ephemeral: true,
          });
        }

        return interaction.reply(
          `Modifying character file properties...\n${chr(
            oldName
          )} → ${chr(newName)}`
        );
      }

      // =========================================================
      // CLEAN DIALOGUE HISTORY = PURGE
      // =========================================================
      if (type === "clean_dialogue_history") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const amount = interaction.options.getInteger("amount");

        if (!amount) {
          return interaction.reply({
            content: "Dialogue entry count required.",
            ephemeral: true,
          });
        }

        if (
          !interaction.channel ||
          typeof interaction.channel.bulkDelete !== "function"
        ) {
          return interaction.reply(operationFailed());
        }

        await interaction.deferReply();

        const deleted = await interaction.channel.bulkDelete(
          amount,
          true
        );

        return interaction.editReply(
          `Cleaning corrupted dialogue history...\n${deleted.size} entries removed.`
        );
      }

      // =========================================================
      // LIMIT VM1 COMMUNICATION = SLOWMODE
      // =========================================================
      if (type === "limit_vm1_communication") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageChannels
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const seconds = interaction.options.getInteger("seconds");

        if (seconds === null) {
          return interaction.reply({
            content: "VM1 communication rate required.",
            ephemeral: true,
          });
        }

        if (
          !interaction.channel ||
          typeof interaction.channel.setRateLimitPerUser !== "function"
        ) {
          return interaction.reply(operationFailed());
        }

        await interaction.channel.setRateLimitPerUser(
          seconds,
          reason
        );

        if (seconds === 0) {
          return interaction.reply(
            "VM1 communication restrictions removed."
          );
        }

        return interaction.reply(
          `VM1 communication rate limited to ${seconds} seconds.`
        );
      }

      return interaction.reply({
        content: "404 operation not found.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(`elevated_access/${type}:`, error);

      const response = {
        content: "Permission failed to load.",
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        return interaction.followUp(response);
      }

      return interaction.reply(response);
    }
  },
};