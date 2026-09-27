# Discord bot starter for Railway (discord.js)

A minimal slash-command bot on discord.js v14 that installs cleanly: the lockfile
matches `package.json`, so a frozen install succeeds instead of aborting the build.

## Why this exists

The long-standing discord.js starter on Railway ships a `yarn.lock` that has drifted
out of sync with its `package.json`. Railway's builder installs with
`--frozen-lockfile`, which refuses to resolve the difference:

```
warning discord.js@13.17.1: Version 13 is no longer supported.
error Your lockfile needs to be updated, but yarn was run with `--frozen-lockfile`.
Build Failed: process "yarn install --frozen-lockfile" did not complete successfully: exit code: 1
```

Every deploy dies during install — the bot code never runs.

Here `package-lock.json` is generated from the exact dependency set and committed, so
`npm ci` reproduces the same tree every time and the build is deterministic.

The code is also ported to **discord.js v14** (the incumbent is on v13, which upstream
marks as no longer supported): `GatewayIntentBits`, `Events`, `isChatInputCommand()`,
and `REST` imported from `discord.js` itself rather than the separate
`@discordjs/rest` and `discord-api-types` packages.

## Setup

1. Create an application at the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **Bot**, reset the token and set it as `DISCORD_TOKEN` in Railway.
3. Under **OAuth2 → URL Generator**, select scopes `bot` and `applications.commands`,
   then open the generated URL to invite the bot.

Slash commands are registered globally on startup and can take a few minutes to
appear in Discord.

## Commands

| Command | Does |
|---------|------|
| `/ping` | Replies with the gateway latency |
| `/hello` | Replies with a greeting |

## Adding a command

Drop a file in `src/commands/` exporting `data` and `execute`:

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("name").setDescription("What it does"),
  execute: async (interaction, client) => {
    await interaction.reply("Hey!");
  },
};
```

Commands are loaded relative to `__dirname`, so the working directory does not matter.

## Run locally

```bash
npm ci
DISCORD_TOKEN=your-token npm start
```

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `DISCORD_TOKEN` | yes | Bot token from the Developer Portal |

## DISBOARD bump reminders

Y'sEAfM checks channel `1553708050068537354` once per minute. After a
confirmed DISBOARD bump, it waits two hours plus five seconds and sends one
English reminder. Members still run DISBOARD's `/bump` manually. Failed bump
attempts and messages from other users or bots do not reset the cooldown.

By default reminders mention the three requested roles: `1546777627136761957`,
`1546777509050191902`, and `1546908874496413747`. Optional Railway variable
`BUMP_ROLE_IDS` overrides this list with comma-separated role IDs; an empty
value disables mentions. The roles must be mentionable or the bot must have
permission to mention them. No other roles or users are pinged.

The bot needs View Channel, Read Message History, Send Messages and Embed Links
in that channel, and Message Content Intent enabled in the Discord Developer
Portal (already requested by the client). Run one Railway replica.

The latest success and reminder are recovered from channel history on every
check, including after redeployment; no Railway volume or database is needed.
Keep DISBOARD confirmations and reminder messages in the channel. Removing them
can lose a timer or cause another reminder. Up to 2000 recent messages are
searched; if no success is found, the bot waits for a new manual successful bump.
Network or permission errors are logged and retried on the next minute.

Success detection accepts DISBOARD's `disboard.org/images/bump.png` image or
the English `Bump done!` embed text. If DISBOARD changes its response format,
update the detector against an actual successful response. There is no reminder
until a visible successful bump is found, and no repeated nags while waiting
for someone to bump again.

Validation: `npm test`. After deployment, manually perform a successful bump
in the configured channel and confirm one reminder arrives after roughly
2 hours 5 seconds to 2 hours 65 seconds. Live Discord delivery requires a
separate check; unit tests use simulated Discord messages.

## License

MIT
