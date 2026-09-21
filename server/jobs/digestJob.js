const cron = require('node-cron');
const User = require('../models/User');
const DigestLog = require('../models/DigestLog');
const { buildDigestForUser } = require('../services/digestService');
const { sendEmail } = require('../services/emailService');

// the timezone the brief is written for — defaults to India
const TZ = process.env.DIGEST_TZ || 'Asia/Kolkata';

// today's date in that timezone, as YYYY-MM-DD
const localDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

let running = false;

/**
 * Sends today's brief to every user who hasn't had it yet.
 * Safe to call many times a day: each user is claimed in DigestLog BEFORE
 * sending, so retries, overlapping calls and the internal cron can never
 * double-send. If a send fails, the claim is released for the next retry.
 */
const sendDigestsToAllUsers = async () => {
  if (running) {
    console.log('⏰ Digest run already in progress — skipping');
    return { skipped: true };
  }
  running = true;

  const date = localDate();
  const summary = { sent: 0, alreadySent: 0, failed: 0 };
  console.log(`⏰ Running daily digest for ${date}…`);

  try {
    const users = await User.find({});

    for (const user of users) {
      // 1. claim today's slot
      try {
        await DigestLog.create({ user: user._id, date });
      } catch (err) {
        if (err.code === 11000) {
          summary.alreadySent += 1; // someone already sent it today
        } else {
          summary.failed += 1;
          console.error(`  ❌ Could not claim ${user.email}:`, err.message);
        }
        continue;
      }

      // 2. build and send
      try {
        const { subject, html } = await buildDigestForUser(user);
        await sendEmail({ to: user.email, subject, html });
        summary.sent += 1;
        console.log(`  ✅ Digest sent to ${user.email}`);
      } catch (err) {
        // 3. release the claim so the next retry can try again
        await DigestLog.deleteOne({ user: user._id, date }).catch(() => {});
        summary.failed += 1;
        console.error(`  ❌ Failed for ${user.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Digest job error:', err.message);
  } finally {
    running = false;
  }

  console.log(
    `⏰ Digest done — sent ${summary.sent}, already sent ${summary.alreadySent}, failed ${summary.failed}`
  );
  return summary;
};

// Fallback: if the server happens to be awake at 7 AM local time.
// The external pinger is the main trigger — this just covers the gaps.
const startDigestJob = () => {
  cron.schedule('0 7 * * *', sendDigestsToAllUsers, { timezone: TZ });
  console.log(`⏰ Daily digest job scheduled for 7:00 AM (${TZ})`);
};

module.exports = { startDigestJob, sendDigestsToAllUsers };