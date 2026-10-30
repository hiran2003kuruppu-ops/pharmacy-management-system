// Validation helper functions and middlewares

function validateMedicine(req, res, next) {
  const {
    sku,
    name,
    generic_name,
    category_id,
    dosage_form,
    strength,
    cost_price,
    unit_price,
    quantity_in_stock,
    min_stock_threshold,
    expiry_date,
    batch_number
  } = req.body;

  const errors = {};

  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    errors.sku = 'SKU / Barcode is required and cannot be empty.';
  } else if (sku.trim().length > 30) {
    errors.sku = 'SKU cannot exceed 30 characters.';
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Medicine brand name is required.';
  } else if (name.trim().length > 100) {
    errors.name = 'Medicine name cannot exceed 100 characters.';
  }

  if (!generic_name || typeof generic_name !== 'string' || generic_name.trim().length === 0) {
    errors.generic_name = 'Generic/chemical name is required.';
  }

  if (!category_id || isNaN(parseInt(category_id, 10))) {
    errors.category_id = 'Valid category must be selected.';
  }

  if (!dosage_form || typeof dosage_form !== 'string' || dosage_form.trim().length === 0) {
    errors.dosage_form = 'Dosage form is required (e.g. Tablet, Capsule, Syrup).';
  }

  if (!strength || typeof strength !== 'string' || strength.trim().length === 0) {
    errors.strength = 'Strength is required (e.g. 500mg, 10mg/ml).';
  }

  const parsedCost = parseFloat(cost_price);
  if (isNaN(parsedCost) || parsedCost < 0) {
    errors.cost_price = 'Cost price must be a valid non-negative number.';
  }

  const parsedUnit = parseFloat(unit_price);
  if (isNaN(parsedUnit) || parsedUnit < 0) {
    errors.unit_price = 'Unit selling price must be a valid non-negative number.';
  } else if (!isNaN(parsedCost) && parsedUnit < parsedCost) {
    errors.unit_price = 'Unit selling price cannot be less than cost price.';
  }

  const parsedQty = parseInt(quantity_in_stock, 10);
  if (isNaN(parsedQty) || parsedQty < 0) {
    errors.quantity_in_stock = 'Quantity in stock must be a non-negative integer.';
  }

  const parsedMin = parseInt(min_stock_threshold, 10);
  if (isNaN(parsedMin) || parsedMin < 0) {
    errors.min_stock_threshold = 'Min stock threshold must be a non-negative integer.';
  }

  if (!expiry_date || !/^\d{4}-\d{2}-\d{2}$/.test(expiry_date)) {
    errors.expiry_date = 'Valid expiry date in YYYY-MM-DD format is required.';
  } else {
    const d = new Date(expiry_date);
    if (isNaN(d.getTime())) {
      errors.expiry_date = 'Expiry date must be a valid calendar date.';
    }
  }

  if (!batch_number || typeof batch_number !== 'string' || batch_number.trim().length === 0) {
    errors.batch_number = 'Batch / Lot number is required.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please correct the highlighted errors.',
      errors
    });
  }

  next();
}

function validateCategory(req, res, next) {
  const { name } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Category name is required.';
  } else if (name.trim().length > 50) {
    errors.name = 'Category name cannot exceed 50 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Category validation failed.',
      errors
    });
  }

  next();
}

function validateSupplier(req, res, next) {
  const { name, phone, email } = req.body;
  const errors = {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Supplier company name is required.';
  }

  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    errors.phone = 'Phone number is required.';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Provided email address is invalid.';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Supplier validation failed.',
      errors
    });
  }

  next();
}

function validateSale(req, res, next) {
  const { customer_name, payment_method, items } = req.body;
  const errors = {};

  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
    errors.customer_name = 'Customer name is required.';
  }

  const validPayments = ['Cash', 'Card', 'Online', 'Insurance'];
  if (!payment_method || !validPayments.includes(payment_method)) {
    errors.payment_method = `Payment method must be one of: ${validPayments.join(', ')}`;
  }

  if (!Array.isArray(items) || items.length === 0) {
    errors.items = 'Sale must contain at least one medicine item.';
  } else {
    items.forEach((item, index) => {
      if (!item.medicine_id || isNaN(parseInt(item.medicine_id, 10))) {
        errors[`item_${index}_medicine`] = 'Valid medicine item must be selected.';
      }
      if (!item.quantity || parseInt(item.quantity, 10) <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be at least 1.';
      }
    });
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Checkout validation failed.',
      errors
    });
  }

  next();
}

module.exports = {
  validateMedicine,
  validateCategory,
  validateSupplier,
  validateSale
};
