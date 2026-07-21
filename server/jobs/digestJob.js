const cron = require('node-cron');
const User = require('../models/User');
const { buildDigestForUser } = require('../services/digestService');
const { sendEmail } = require('../services/emailService');

// send a digest to every user
const sendDigestsToAllUsers = async () => {
  console.log('⏰ Running daily digest job...');

  try {
    const users = await User.find({});

    for (const user of users) {
      try {
        const { subject, html } = await buildDigestForUser(user);
        await sendEmail({ to: user.email, subject, html });
        console.log(`  ✅ Digest sent to ${user.email}`);
      } catch (err) {
        // one user failing shouldn't stop the rest
        console.error(`  ❌ Failed for ${user.email}:`, err.message);
      }
    }

    console.log('⏰ Daily digest job complete.');
  } catch (err) {
    console.error('Digest job error:', err.message);
  }
};

// schedule it: every day at 7:00 AM (server time)
const startDigestJob = () => {
  cron.schedule('0 7 * * *', sendDigestsToAllUsers);
  console.log('⏰ Daily digest job scheduled for 7:00 AM');
};

module.exports = { startDigestJob, sendDigestsToAllUsers };