const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { validateSale } = require('../middleware/validator');

router.get('/', saleController.getAllSales);
router.get('/:id', saleController.getSaleById);
router.post('/', validateSale, saleController.createSale);

module.exports = router;
