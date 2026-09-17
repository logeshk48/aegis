const express = require('express');
const router = express.Router();
const { sendMyDigest } = require('../controllers/digestController');
const { sendDigestsToAllUsers } = require('../jobs/digestJob');
const { protect } = require('../middleware/authMiddleware');

// Public trigger for an external cron service.
// Uses GET with the secret in the URL so any simple pinger can call it
// with no custom headers or methods. Also wakes the sleeping free-tier server.
router.get('/run', async (req, res) => {
  const secret = req.query.key;

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

router.post('/send', sendMyDigest);

module.exports = router;