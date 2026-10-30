const express = require('express');
const router = express.Router();

const medicineRoutes = require('./medicines');
const categoryRoutes = require('./categories');
const supplierRoutes = require('./suppliers');
const saleRoutes = require('./sales');
const statsRoutes = require('./stats');

router.use('/medicines', medicineRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/sales', saleRoutes);
router.use('/stats', statsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Pharmacy Management System API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
