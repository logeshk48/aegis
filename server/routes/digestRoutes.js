const express = require('express');
const router = express.Router();
const { sendMyDigest } = require('../controllers/digestController');
const { sendDigestsToAllUsers } = require('../jobs/digestJob');
const { protect } = require('../middleware/authMiddleware');

// --- public trigger for external cron (no auth, protected by a secret) ---
// An external pinger (e.g. cron-job.org) hits this at 07:00 — it both wakes
// the sleeping free-tier server AND runs the job, which node-cron alone can't
// guarantee on a host that sleeps.
router.post('/run', async (req, res) => {
  const secret = req.headers['x-digest-secret'];

  if (!process.env.DIGEST_SECRET || secret !== process.env.DIGEST_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // respond immediately; run the batch in the background
  res.status(202).json({ message: 'Digest run started' });

  sendDigestsToAllUsers().catch((err) =>
    console.error('Triggered digest run failed:', err.message)
  );
});

// --- authenticated routes ---
router.use(protect);

// POST /api/digest/send  →  send the digest to the logged-in user
router.post('/send', sendMyDigest);

module.exports = router;