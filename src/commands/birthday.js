const fs = require("node:fs");
const path = require("node:path");

const BIRTHDAY_CHANNEL_ID = "1547302437193261086";
const BIRTHDAY_USER_ID = "783043408280682547";

const BIRTH_MONTH = 9;
const BIRTH_DAY = 10;
const BIRTH_YEAR = 2005;

// Czech/German time zone.
// Railway itself may run in UTC, so never use the server's local date.
const TIME_ZONE = "Europe/Prague";

const STATE_FILE = path.join(
  __dirname,
  "birthday-state.json"
);

function getLocalDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
}

function readLastBirthdayYear() {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return null;
    }

    const data = JSON.parse(
      fs.readFileSync(STATE_FILE, "utf8")
    );

    return data.lastBirthdayYear ?? null;
  } catch (error) {
    console.error(
      "Failed to read birthday state:",
      error
    );

    return null;
  }
}

function saveBirthdayYear(year) {
  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify(
        {
          lastBirthdayYear: year,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "Failed to save birthday state:",
      error
    );
  }
}

async function checkBirthday(client) {
  const today = getLocalDate();

  if (
    today.month !== BIRTH_MONTH ||
    today.day !== BIRTH_DAY
  ) {
    return;
  }

  const lastBirthdayYear =
    readLastBirthdayYear();

  if (lastBirthdayYear === today.year) {
    return;
  }

  const channel = await client.channels
    .fetch(BIRTHDAY_CHANNEL_ID)
    .catch(() => null);

  if (
    !channel ||
    !channel.isTextBased()
  ) {
    console.error(
      "Birthday channel unavailable."
    );

    return;
  }

  const age =
    today.year - BIRTH_YEAR;

  await channel.send(
    `Character file update detected...\n\n` +
    `<@${BIRTHDAY_USER_ID}>\n` +
    `Age: ${age - 1} → ${age}\n\n` +
    `Happy birthday!\n` +
    `Another year has been successfully added to your character file.`
  );

  saveBirthdayYear(today.year);

  console.log(
    `Birthday event completed for ${today.year}.`
  );
}

function startBirthdaySystem(client) {
  // Check immediately after Y'sEAƒM starts.
  checkBirthday(client).catch(console.error);

  // Then check once per hour.
  setInterval(() => {
    checkBirthday(client).catch(console.error);
  }, 60 * 60 * 1000);

  console.log("Birthday system initialized.");
}

module.exports = {
  startBirthdaySystem,
};