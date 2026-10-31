const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');

router.get('/', medicineController.getAllMedicines);
router.get('/:id', medicineController.getMedicineById);
router.post('/', medicineController.createMedicine);
router.put('/:id', medicineController.updateMedicine);
router.post('/:id/stock', medicineController.adjustStock);
router.delete('/:id', medicineController.deleteMedicine);

module.exports = router;
