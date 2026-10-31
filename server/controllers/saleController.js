const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');

exports.createSale = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      prescription_id,
      items,
      discount_percent = 0,
      payment_method = 'Cash'
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart cannot be empty.' });
    }

    let calculatedSubtotal = 0;
    const validatedItems = [];
    let prescriptionRequired = false;

    // Verify stock and calculate totals
    for (const item of items) {
      const medicine = await Medicine.findById(item.medicine_id || item.medicine);
      if (!medicine) {
        return res.status(404).json({
          success: false,
          message: `Medicine not found for ID: ${item.medicine_id || item.medicine}`
        });
      }

      const qty = parseInt(item.quantity, 10);
      if (qty <= 0) {
        return res.status(400).json({ success: false, message: 'Item quantity must be at least 1.' });
      }

      if (medicine.quantity_in_stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for '${medicine.name}'. Available: ${medicine.quantity_in_stock}, Requested: ${qty}.`
        });
      }

      if (medicine.requires_prescription) {
        prescriptionRequired = true;
      }

      const lineTotal = medicine.unit_price * qty;
      calculatedSubtotal += lineTotal;

      validatedItems.push({
        medicine: medicine._id,
        medicine_name: medicine.name,
        sku: medicine.sku,
        quantity: qty,
        unit_price: medicine.unit_price,
        total_price: lineTotal
      });
    }

    // Prescription enforcement
    if (prescriptionRequired && (!prescription_id || !prescription_id.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Prescription ID is strictly required by NMRA regulations for regulated (Rx) medicines.'
      });
    }

    const discountP = Math.min(Math.max(Number(discount_percent) || 0, 0), 100);
    const discountAmount = (calculatedSubtotal * discountP) / 100;
    const finalTotal = calculatedSubtotal - discountAmount;

    // Decrement stock
    for (const vItem of validatedItems) {
      await Medicine.findByIdAndUpdate(vItem.medicine, {
        $inc: { quantity_in_stock: -vItem.quantity }
      });
    }

    // Generate Invoice Number
    const count = await Sale.countDocuments();
    const invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;

    const sale = await Sale.create({
      invoice_number: invoiceNumber,
      pharmacist: req.user ? req.user._id : null,
      customer_name: customer_name || 'Walk-in Customer',
      customer_phone: customer_phone || '',
      prescription_id: prescription_id || '',
      items: validatedItems,
      subtotal: calculatedSubtotal,
      discount_percent: discountP,
      discount_amount: discountAmount,
      total_amount: finalTotal,
      payment_method
    });

    res.status(201).json({
      success: true,
      message: 'Dispensation completed successfully.',
      data: sale
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const sales = await Sale.find()
      .populate('pharmacist', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('pharmacist', 'name');
    if (!sale) return res.status(404).json({ success: false, message: 'Sale invoice not found.' });
    res.status(200).json({ success: true, data: sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
