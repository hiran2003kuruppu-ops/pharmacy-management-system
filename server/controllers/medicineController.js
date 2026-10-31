const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');

exports.getAllMedicines = async (req, res) => {
  try {
    const {
      q,
      category,
      stock_status,
      expiry_status,
      sort_by = 'name',
      sort_order = 'asc',
      page = 1,
      limit = 15
    } = req.query;

    const filter = {};

    // Keyword search
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { name: regex },
        { generic_name: regex },
        { sku: regex }
      ];
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Stock Status
    if (stock_status === 'out') {
      filter.quantity_in_stock = 0;
    } else if (stock_status === 'low') {
      filter.quantity_in_stock = { $gt: 0, $lte: 15 };
    } else if (stock_status === 'in_stock') {
      filter.quantity_in_stock = { $gt: 15 };
    }

    // Expiry Status
    const now = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (expiry_status === 'expired') {
      filter.expiry_date = { $lt: now };
    } else if (expiry_status === 'near_expiry') {
      filter.expiry_date = { $gte: now, $lte: thirtyDaysAhead };
    } else if (expiry_status === 'valid') {
      filter.expiry_date = { $gt: thirtyDaysAhead };
    }

    // Sorting
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Medicine.countDocuments(filter);
    const medicines = await Medicine.find(filter)
      .populate('category', 'name')
      .populate('supplier', 'name phone email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      data: medicines,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMedicineById = async (req, res) => {
  try {
    const medicine = await Medicine.findById(req.params.id)
      .populate('category', 'name')
      .populate('supplier', 'name phone email contact_person address');

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createMedicine = async (req, res) => {
  try {
    const {
      sku,
      name,
      generic_name,
      category,
      supplier,
      dosage_form,
      strength,
      batch_number,
      cost_price,
      unit_price,
      quantity_in_stock,
      min_stock_threshold,
      expiry_date,
      requires_prescription,
      description
    } = req.body;

    // Margin validation
    if (Number(unit_price) < Number(cost_price)) {
      return res.status(400).json({
        success: false,
        message: 'Selling price cannot be less than cost price.'
      });
    }

    // SKU check
    const existing = await Medicine.findOne({ sku: sku.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `SKU '${sku}' already exists.`
      });
    }

    const medicine = await Medicine.create({
      sku: sku.toUpperCase().trim(),
      name,
      generic_name,
      category,
      supplier: supplier || null,
      dosage_form,
      strength,
      batch_number,
      cost_price: Number(cost_price),
      unit_price: Number(unit_price),
      quantity_in_stock: Number(quantity_in_stock) || 0,
      min_stock_threshold: Number(min_stock_threshold) || 15,
      expiry_date,
      requires_prescription: Boolean(requires_prescription),
      description
    });

    const populated = await Medicine.findById(medicine._id)
      .populate('category', 'name')
      .populate('supplier', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const { cost_price, unit_price } = req.body;

    if (cost_price !== undefined && unit_price !== undefined) {
      if (Number(unit_price) < Number(cost_price)) {
        return res.status(400).json({
          success: false,
          message: 'Selling price cannot be less than cost price.'
        });
      }
    }

    const medicine = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('supplier', 'name');

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.status(200).json({ success: true, data: medicine });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.adjustStock = async (req, res) => {
  try {
    const { adjustment_type, quantity, reason } = req.body;
    const qty = parseInt(quantity, 10);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity required.' });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    let delta = qty;
    if (['Damaged', 'Expired', 'Loss'].includes(adjustment_type)) {
      delta = -qty;
      if (medicine.quantity_in_stock + delta < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot reduce stock below 0. Current stock is ${medicine.quantity_in_stock}.`
        });
      }
    }

    medicine.quantity_in_stock += delta;
    await medicine.save();

    res.status(200).json({
      success: true,
      message: `Stock successfully adjusted (${delta > 0 ? '+' : ''}${delta} units).`,
      data: medicine
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    // Relational Integrity: Check if medicine is present in any sale invoice
    const hasSales = await Sale.findOne({ 'items.medicine': req.params.id });

    if (hasSales) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete medicine: this item is linked to recorded sales invoices. Deletion is blocked to preserve financial and accounting audit integrity.'
      });
    }

    const medicine = await Medicine.findByIdAndDelete(req.params.id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Medicine '${medicine.name}' safely removed from database.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
