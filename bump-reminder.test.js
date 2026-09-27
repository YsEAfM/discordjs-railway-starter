const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createBumpCheck, isSuccessfulBump, DELAY_MS } = require("./src/bump-reminder");
const botId = "123456789012345678";
function bump(id = "100", time = 1000) {
  return { id, createdTimestamp: time, author: { id: "302050872383242240" },
    embeds: [{ description: "Bump done!" }] };
}
function fixture(messages = [bump()]) {
  const sent = [];
  const history = [...messages];
  let now = 1000 + DELAY_MS;
  const channel = {
    isTextBased: () => true,
    messages: { fetch: async ({ before, limit }) => new Map(history
      .filter((m) => !before || BigInt(m.id) < BigInt(before))
      .sort((a, b) => BigInt(a.id) > BigInt(b.id) ? -1 : 1)
      .slice(0, limit).map((m) => [m.id, m])) },
    send: async (payload) => {
      sent.push(payload);
      history.push({ ...payload, id: "999999", author: { id: botId } });
    },
  };
  const client = { user: { id: botId }, channels: { fetch: async (id) => {
    assert.equal(id, "1553708050068537354");
    return channel;
  } } };
  return { sent, history, channel, client, options: { now: () => now },
    setNow: (value) => { now = value; } };
}
test("only DISBOARD success messages count, including localized success images", () => {
  assert.equal(isSuccessfulBump(bump()), true);
  assert.equal(isSuccessfulBump({ ...bump(), author: { id: botId } }), false);
  // Slash-command replies may carry a webhook ID belonging to the application.
  assert.equal(isSuccessfulBump({ ...bump(), webhookId: "302050872383242240" }), true);
  assert.equal(isSuccessfulBump({ ...bump(), embeds: [{ description: "Please wait 120 minutes" }] }), false);
  assert.equal(isSuccessfulBump({ ...bump(), embeds: [{ image: { url: "https://disboard.org/images/bump.png" } }] }), true);
});
test("waits for cooldown plus buffer and mentions exactly the three roles once", async () => {
  const f = fixture();
  const check = createBumpCheck(f.client, f.options);
  f.setNow(1000 + DELAY_MS - 1);
  await check();
  assert.equal(f.sent.length, 0);
  f.setNow(1000 + DELAY_MS);
  await check();
  await check();
  assert.equal(f.sent.length, 1);
  assert.deepEqual(f.sent[0].allowedMentions, { parse: [], roles: ["1546777627136761957", "1546777509050191902", "1546908874496413747"] });
  assert.equal(f.sent[0].enforceNonce, true);
});
test("restart recovers reminder from history without sending it twice", async () => {
  const f = fixture();
  await createBumpCheck(f.client, f.options)();
  await createBumpCheck(f.client, f.options)();
  assert.equal(f.sent.length, 1);
});
test("new successful bump replaces the old cooldown", async () => {
  const f = fixture();
  f.history.push(bump("200", 1000 + DELAY_MS));
  const check = createBumpCheck(f.client, f.options);
  await check();
  assert.equal(f.sent.length, 0);
  f.setNow(1000 + 2 * DELAY_MS);
  await check();
  assert.equal(f.sent[0].nonce, "200");
});
test("empty history sends nothing; failed attempts do not replace a success", async () => {
  const f = fixture([]);
  const check = createBumpCheck(f.client, f.options);
  await check();
  assert.equal(f.sent.length, 0);
  f.history.push(bump(), { ...bump("200"), embeds: [{ description: "Please wait" }] });
  await check();
  assert.equal(f.sent.length, 1);
});
test("recovers a success older than the first history page", async () => {
  const f = fixture([bump(), ...Array.from({ length: 110 }, (_, i) => ({
    id: String(200 + i), author: { id: "other" }, embeds: [],
  }))]);
  await createBumpCheck(f.client, f.options)();
  assert.equal(f.sent.length, 1);
});
test("failed send is retried and concurrent checks do not duplicate", async () => {
  const f = fixture();
  const send = f.channel.send;
  f.channel.send = async () => { throw new Error("offline"); };
  const check = createBumpCheck(f.client, f.options);
  await assert.rejects(check(), /offline/);
  f.channel.send = send;
  await Promise.all([check(), check()]);
  assert.equal(f.sent.length, 1);
});
test("history failure cannot produce a speculative reminder", async () => {
  const f = fixture();
  f.channel.messages.fetch = async () => { throw new Error("missing permission"); };
  await assert.rejects(createBumpCheck(f.client, f.options)(), /missing permission/);
  assert.equal(f.sent.length, 0);
});
test("role configuration accepts no mentions and rejects malformed IDs", async () => {
  const f = fixture();
  assert.throws(() => createBumpCheck(f.client, { roleIds: ["@everyone"] }), /role IDs/);
  await createBumpCheck(f.client, { ...f.options, roleIds: [] })();
  assert.deepEqual(f.sent[0].allowedMentions, { parse: [], roles: [] });
});

