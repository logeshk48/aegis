const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDisruptions,
  createDisruption,
  finishDisruption,
  deleteDisruption,
} = require('../controllers/disruptionController');

router.use(protect);

router.get('/', getDisruptions);
router.post('/', createDisruption);
router.post('/:id/end', finishDisruption);
router.delete('/:id', deleteDisruption);

module.exports = router;