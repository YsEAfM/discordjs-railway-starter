const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

function chr(name) {
  return name.toLowerCase().endsWith(".chr")
    ? name
    : `${name}.chr`;
}

function accessDenied() {
  return {
    content: "Error: MES authorization level insufficient.",
    ephemeral: true,
  };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mes")
    .setDescription("Metaverse Enterprise Solutions interface.")

    // TYPE
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Select an MES operation.")
        .setRequired(true)
        .addChoices(
          {
            name: "Grant elevated access",
            value: "grant_elevated_access",
          },
          {
            name: "Revoke elevated access",
            value: "revoke_elevated_access",
          },
          {
            name: "Dialogue injection",
            value: "dialogue",
          }
        )
    )

    // TARGET USER
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Target character file.")
        .setRequired(false)
    )

    // ROLE
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription("Elevated access level.")
        .setRequired(false)
    )

    // CHANNEL FOR DIALOGUE
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("VM1 dialogue destination.")
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
        .setRequired(false)
    )

    // MESSAGE FOR DIALOGUE
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Dialogue to inject through Y'sEAƒM.")
        .setMaxLength(2000)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: "Error: MES connection unavailable.",
        ephemeral: true,
      });
    }

    const type = interaction.options.getString("type");

    try {
      // =====================================================
      // GRANT ELEVATED ACCESS = ADD ROLE
      // =====================================================
      if (type === "grant_elevated_access") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user || !role) {
          return interaction.reply({
            content: "Character file and access level required.",
            ephemeral: true,
          });
        }

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (
          role.managed ||
          role.position >= interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.reply({
            content: "Error: requested MES access level unavailable.",
            ephemeral: true,
          });
        }

        if (member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: `${chr(user.username)} already has elevated access.`,
            ephemeral: true,
          });
        }

        await member.roles.add(
          role,
          `MES elevated access granted by ${interaction.user.username}`
        );

        // Verify that Discord actually applied the role.
        const updated = await interaction.guild.members.fetch(user.id);

        if (!updated.roles.cache.has(role.id)) {
          return interaction.reply({
            content: "MES authorization update failed.",
            ephemeral: true,
          });
        }

        return interaction.reply(
          `MES granted elevated access to ${chr(user.username)}.\nAccess level: ${role.name}`
        );
      }

      // =====================================================
      // REVOKE ELEVATED ACCESS = REMOVE ROLE
      // =====================================================
      if (type === "revoke_elevated_access") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");

        if (!user || !role) {
          return interaction.reply({
            content: "Character file and access level required.",
            ephemeral: true,
          });
        }

        const member = await interaction.guild.members
          .fetch(user.id)
          .catch(() => null);

        if (!member) {
          return interaction.reply({
            content: "Character file not found.",
            ephemeral: true,
          });
        }

        if (
          role.managed ||
          role.position >= interaction.guild.members.me.roles.highest.position
        ) {
          return interaction.reply({
            content: "Error: requested MES access level unavailable.",
            ephemeral: true,
          });
        }

        if (!member.roles.cache.has(role.id)) {
          return interaction.reply({
            content: `${chr(user.username)} does not have this elevated access level.`,
            ephemeral: true,
          });
        }

        await member.roles.remove(
          role,
          `MES elevated access revoked by ${interaction.user.username}`
        );

        const updated = await interaction.guild.members.fetch(user.id);

        if (updated.roles.cache.has(role.id)) {
          return interaction.reply({
            content: "MES authorization update failed.",
            ephemeral: true,
          });
        }

        return interaction.reply(
          `Elevated access revoked from ${chr(user.username)}.\nAccess level removed: ${role.name}`
        );
      }

      // =====================================================
      // DIALOGUE = SPEAK THROUGH Y'sEAƒM
      // =====================================================
      if (type === "dialogue") {
        if (
          !interaction.memberPermissions.has(
            PermissionFlagsBits.ManageMessages
          )
        ) {
          return interaction.reply(accessDenied());
        }

        const channel = interaction.options.getChannel("channel");
        const message = interaction.options.getString("message");

        if (!channel || !message) {
          return interaction.reply({
            content: "VM1 destination and dialogue data required.",
            ephemeral: true,
          });
        }

        if (!channel.isTextBased()) {
          return interaction.reply({
            content: "VM1 dialogue destination unavailable.",
            ephemeral: true,
          });
        }

        const botMember = interaction.guild.members.me;

        const permissions = channel.permissionsFor(botMember);

        if (
          !permissions ||
          !permissions.has(PermissionFlagsBits.ViewChannel) ||
          !permissions.has(PermissionFlagsBits.SendMessages)
        ) {
          return interaction.reply({
            content: "Permission failed to load.",
            ephemeral: true,
          });
        }

        await channel.send(message);

        // Confirmation only visible to the person who ran /mes.
        return interaction.reply({
          content:
            `Dialogue injected into VM1.\nDestination: ${channel}`,
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: "404 MES operation not found.",
        ephemeral: true,
      });
    } catch (error) {
      console.error(`MES/${type}:`, error);

      const response = {
        content: "MES operation failed.\nPermission failed to load.",
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(response);
      }

      return interaction.reply(response);
    }
  },
};