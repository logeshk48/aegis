const express = require('express');
const router = express.Router();
const { getDrift } = require('../controllers/driftController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDrift);

module.exports = router;