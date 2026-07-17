const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// all analytics routes require login
router.use(protect);

// GET /api/analytics  →  get the user's stats
router.get('/', getAnalytics);

module.exports = router;