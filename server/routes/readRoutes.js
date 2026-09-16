const express = require('express');
const router = express.Router();
const { getRead } = require('../controllers/readController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getRead);

module.exports = router;