const express = require('express');
const router = express.Router();
const { sendMyDigest } = require('../controllers/digestController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// POST /api/digest/send  →  send the digest to the logged-in user
router.post('/send', sendMyDigest);

module.exports = router;