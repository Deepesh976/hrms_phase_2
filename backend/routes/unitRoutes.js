const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');

// CRUD Routes
router.post('/', unitController.createUnit);
router.get('/', unitController.getUnits);
router.get('/:id', unitController.getUnitById);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;