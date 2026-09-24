const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSleep,
  startSleep,
  endSleep,
  acceptNight,
  updateNight,
} = require('../controllers/sleepController');

router.use(protect);

router.get('/', getSleep);
router.post('/bed', startSleep);
router.post('/wake', endSleep);
router.post('/:date/confirm', acceptNight);
router.put('/:date', updateNight);

module.exports = router;