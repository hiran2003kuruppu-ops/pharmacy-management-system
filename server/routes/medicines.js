const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { validateMedicine } = require('../middleware/validator');

// List, search, filter, sort
router.get('/', medicineController.getAllMedicines);

// Retrieve single
router.get('/:id', medicineController.getMedicineById);

// Create new medicine
router.post('/', validateMedicine, medicineController.createMedicine);

// Update medicine
router.put('/:id', validateMedicine, medicineController.updateMedicine);

// Safe delete medicine
router.delete('/:id', medicineController.deleteMedicine);

// Quick stock adjustment
router.post('/:id/stock', medicineController.adjustStock);

module.exports = router;
