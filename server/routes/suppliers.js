const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { validateSupplier } = require('../middleware/validator');

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', validateSupplier, supplierController.createSupplier);
router.put('/:id', validateSupplier, supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
