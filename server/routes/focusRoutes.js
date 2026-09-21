const express = require('express');
const router = express.Router();
const {
  mission,
  active,
  start,
  pause,
  resume,
  end,
  reflect,
} = require('../controllers/focusController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/mission', mission);
router.get('/active', active);
router.post('/start', start);
router.post('/:id/pause', pause);
router.post('/:id/resume', resume);
router.post('/:id/end', end);
router.post('/:id/reflect', reflect);

module.exports = router;