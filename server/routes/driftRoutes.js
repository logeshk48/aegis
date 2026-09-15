const express = require('express');
const router = express.Router();
const { getDrift, getHistory } = require('../controllers/driftController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getDrift);
router.get('/history', getHistory);

module.exports = router;