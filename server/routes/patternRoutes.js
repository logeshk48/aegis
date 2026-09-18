const express = require('express');
const router = express.Router();
const { getUserPatterns } = require('../controllers/patternController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getUserPatterns);

module.exports = router;