const CHANNEL_ID = "1553708050068537354";
const DISBOARD_ID = "302050872383242240";
const DELAY_MS = 2 * 60 * 60 * 1000 + 5000;
const MARKER = "disboard-reminder:";
const DEFAULT_ROLE_IDS = ["1546777627136761957", "1546777509050191902", "1546908874496413747"];

function isSuccessfulBump(message) {
  if (message.author?.id !== DISBOARD_ID) return false;
  return (message.embeds ?? []).some((embed) => {
    // DISBOARD's success image also works when its response is translated.
    const successImage = [embed.image?.url, embed.thumbnail?.url].some((value) => {
      try {
        const url = new URL(value);
        return url.hostname === "disboard.org" && url.pathname === "/images/bump.png";
      } catch {
        return false;
      }
    });
    return successImage || /\bBump done!/i.test(embed.description ?? "");
  });
}

async function findLatestBump(channel, botId) {
  let before;
  const reminded = new Set();
  // Bound work in an unexpectedly busy channel; never guess a cooldown.
  for (let page = 0; page < 20; page += 1) {
    const batch = await channel.messages.fetch({ limit: 100, before, cache: false });
    const messages = [...batch.values()].sort((a, b) =>
      BigInt(a.id) > BigInt(b.id) ? -1 : BigInt(a.id) < BigInt(b.id) ? 1 : 0
    );
    for (const message of messages) {
      if (message.author?.id === botId) {
        for (const embed of message.embeds ?? []) {
          const footer = embed.footer?.text ?? "";
          if (footer.startsWith(MARKER)) reminded.add(footer.slice(MARKER.length));
        }
      }
      if (isSuccessfulBump(message)) {
        return { message, reminded: reminded.has(message.id) };
      }
    }
    if (messages.length < 100) return null;
    before = messages.at(-1).id;
  }
  throw new Error("No confirmed DISBOARD bump in the last 2000 messages.");
}

function createBumpCheck(client, { roleIds = DEFAULT_ROLE_IDS, now = Date.now } = {}) {
  roleIds = [...new Set(roleIds)];
  if (roleIds.length > 100 || roleIds.some((id) => !/^\d{17,20}$/.test(id))) {
    throw new Error("BUMP_ROLE_IDS must contain valid Discord role IDs.");
  }
  let running = false;
  let lastSentId;
  return async function checkBump() {
    if (running) return;
    running = true;
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (!channel?.isTextBased() || typeof channel.send !== "function") {
        throw new Error("Bump reminder channel is unavailable or cannot receive messages.");
      }
      const latest = await findLatestBump(channel, client.user.id);
      if (!latest || latest.reminded || latest.message.id === lastSentId) return;
      if (now() < latest.message.createdTimestamp + DELAY_MS) return;

      await channel.send({
        content: roleIds.length ? roleIds.map((id) => `<@&${id}>`).join(" ") : undefined,
        allowedMentions: { parse: [], roles: roleIds },
        embeds: [{
          color: 0x58b9ae,
          title: "Time to bump!",
          description: "It has been 2 hours since the last successful bump. If you have a moment, please run DISBOARD's **/bump** command in this channel. Thank you!",
          footer: { text: `${MARKER}${latest.message.id}` },
        }],
        // Discord deduplicates recent sends, including ambiguous network retries.
        nonce: latest.message.id,
        enforceNonce: true,
      });
      lastSentId = latest.message.id;
    } finally {
      running = false;
    }
  };
}

function startBumpReminders(client) {
  const roleIds = process.env.BUMP_ROLE_IDS === undefined
    ? DEFAULT_ROLE_IDS
    : process.env.BUMP_ROLE_IDS.split(/[\s,]+/).filter(Boolean);
  const check = createBumpCheck(client, { roleIds });
  const run = () => check().catch((error) => console.error("Bump reminder check failed:", error));
  void run();
  const timer = setInterval(run, 60_000);
  timer.unref();
  console.log(`Bump reminders enabled in channel ${CHANNEL_ID}.`);
  return () => clearInterval(timer);
}

module.exports = { startBumpReminders, createBumpCheck, isSuccessfulBump, DELAY_MS };
