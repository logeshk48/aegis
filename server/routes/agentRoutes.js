const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', chat);

module.exports = router;