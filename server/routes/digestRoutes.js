const express = require('express');
const router = express.Router();
const { sendMyDigest } = require('../controllers/digestController');
const { sendDigestsToAllUsers } = require('../jobs/digestJob');
const { protect } = require('../middleware/authMiddleware');

// ===== PUBLIC — must stay above router.use(protect) =====
// External cron services hit this. The secret in the URL guards it.
router.get('/run', async (req, res) => {
  const secret = req.query.key;

  if (!process.env.DIGEST_SECRET || secret !== process.env.DIGEST_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  res.status(202).json({ message: 'Digest run started' });

  sendDigestsToAllUsers().catch((err) =>
    console.error('Triggered digest run failed:', err.message)
  );
});

// ===== EVERYTHING BELOW REQUIRES LOGIN =====
router.use(protect);

router.post('/send', sendMyDigest);

module.exports = router;