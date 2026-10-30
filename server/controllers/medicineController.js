const db = require('../config/database');

// GET /api/medicines - List with search, filter, sort, pagination
function getAllMedicines(req, res, next) {
  try {
    const {
      q = '',
      category_id = '',
      supplier_id = '',
      stock_status = '',   // 'all', 'low', 'out', 'in_stock'
      expiry_status = '',  // 'all', 'expired', 'near_expiry', 'valid'
      sort_by = 'name',    // 'name', 'unit_price', 'quantity_in_stock', 'expiry_date', 'created_at'
      sort_order = 'asc',  // 'asc', 'desc'
      page = 1,
      limit = 50
    } = req.query;

    const conditions = [];
    const params = [];

    // Search query on SKU, Brand Name, or Generic Name
    if (q && q.trim()) {
      conditions.push('(m.name LIKE ? OR m.generic_name LIKE ? OR m.sku LIKE ?)');
      const searchTerm = `%${q.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (category_id && !isNaN(parseInt(category_id, 10))) {
      conditions.push('m.category_id = ?');
      params.push(parseInt(category_id, 10));
    }

    // Supplier filter
    if (supplier_id && !isNaN(parseInt(supplier_id, 10))) {
      conditions.push('m.supplier_id = ?');
      params.push(parseInt(supplier_id, 10));
    }

    // Stock status filter
    if (stock_status === 'out') {
      conditions.push('m.quantity_in_stock = 0');
    } else if (stock_status === 'low') {
      conditions.push('m.quantity_in_stock > 0 AND m.quantity_in_stock <= m.min_stock_threshold');
    } else if (stock_status === 'in_stock') {
      conditions.push('m.quantity_in_stock > m.min_stock_threshold');
    }

    // Expiry status filter (relative to CURRENT_DATE)
    if (expiry_status === 'expired') {
      conditions.push("m.expiry_date < date('now')");
    } else if (expiry_status === 'near_expiry') {
      conditions.push("m.expiry_date >= date('now') AND m.expiry_date <= date('now', '+30 days')");
    } else if (expiry_status === 'valid') {
      conditions.push("m.expiry_date > date('now', '+30 days')");
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortColumns = {
      name: 'm.name',
      unit_price: 'm.unit_price',
      quantity_in_stock: 'm.quantity_in_stock',
      expiry_date: 'm.expiry_date',
      created_at: 'm.created_at',
      sku: 'm.sku'
    };
    const orderCol = allowedSortColumns[sort_by] || 'm.name';
    const orderDir = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Count total matches
    const countSql = `SELECT COUNT(*) as total FROM medicines m ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const sql = `
      SELECT
        m.*,
        c.name as category_name,
        s.name as supplier_name,
        CASE
          WHEN m.quantity_in_stock = 0 THEN 'OUT_OF_STOCK'
          WHEN m.quantity_in_stock <= m.min_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status,
        CASE
          WHEN m.expiry_date < date('now') THEN 'EXPIRED'
          WHEN m.expiry_date <= date('now', '+30 days') THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END as expiry_status,
        CAST((julianday(m.expiry_date) - julianday(date('now'))) AS INTEGER) as days_until_expiry
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      ${whereClause}
      ORDER BY ${orderCol} ${orderDir}
      LIMIT ? OFFSET ?
    `;

    const medicines = db.prepare(sql).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: medicines,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/medicines/:id - Retrieve single medicine with relationships & logs
function getMedicineById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid medicine ID.' });
    }

    const sql = `
      SELECT
        m.*,
        c.name as category_name,
        s.name as supplier_name,
        s.phone as supplier_phone,
        s.email as supplier_email,
        CASE
          WHEN m.quantity_in_stock = 0 THEN 'OUT_OF_STOCK'
          WHEN m.quantity_in_stock <= m.min_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status,
        CASE
          WHEN m.expiry_date < date('now') THEN 'EXPIRED'
          WHEN m.expiry_date <= date('now', '+30 days') THEN 'EXPIRING_SOON'
          ELSE 'VALID'
        END as expiry_status,
        CAST((julianday(m.expiry_date) - julianday(date('now'))) AS INTEGER) as days_until_expiry
      FROM medicines m
      LEFT JOIN categories c ON m.category_id = c.id
      LEFT JOIN suppliers s ON m.supplier_id = s.id
      WHERE m.id = ?
    `;

    const medicine = db.prepare(sql).get(id);
    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    // Get stock adjustments log
    const adjustments = db.prepare(`
      SELECT * FROM stock_adjustments
      WHERE medicine_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(id);

    // Get sales count
    const salesStats = db.prepare(`
      SELECT COUNT(*) as total_sales, COALESCE(SUM(quantity), 0) as total_units_sold
      FROM sale_items
      WHERE medicine_id = ?
    `).get(id);

    res.json({
      success: true,
      data: {
        ...medicine,
        adjustments,
        salesStats
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/medicines - Create new medicine
function createMedicine(req, res, next) {
  try {
    const {
      sku,
      name,
      generic_name,
      category_id,
      supplier_id,
      dosage_form,
      strength,
      cost_price,
      unit_price,
      quantity_in_stock,
      min_stock_threshold,
      expiry_date,
      batch_number,
      requires_prescription,
      description
    } = req.body;

    // Check duplicate SKU
    const existing = db.prepare('SELECT id FROM medicines WHERE sku = ?').get(sku.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A medicine with SKU '${sku.trim()}' already exists in inventory.`,
        errors: { sku: 'SKU is already in use.' }
      });
    }

    const insertSql = `
      INSERT INTO medicines (
        sku, name, generic_name, category_id, supplier_id,
        dosage_form, strength, cost_price, unit_price,
        quantity_in_stock, min_stock_threshold, expiry_date,
        batch_number, requires_prescription, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(insertSql).run(
      sku.trim(),
      name.trim(),
      generic_name.trim(),
      parseInt(category_id, 10),
      supplier_id ? parseInt(supplier_id, 10) : null,
      dosage_form.trim(),
      strength.trim(),
      parseFloat(cost_price),
      parseFloat(unit_price),
      parseInt(quantity_in_stock, 10) || 0,
      parseInt(min_stock_threshold, 10) || 10,
      expiry_date,
      batch_number.trim(),
      requires_prescription ? 1 : 0,
      description ? description.trim() : null
    );

    // Initial stock adjustment entry
    if (parseInt(quantity_in_stock, 10) > 0) {
      db.prepare(`
        INSERT INTO stock_adjustments (medicine_id, type, quantity, reason)
        VALUES (?, 'Restock', ?, 'Initial Inventory Setup')
      `).run(result.lastInsertRowid, parseInt(quantity_in_stock, 10));
    }

    const created = db.prepare('SELECT * FROM medicines WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Medicine record created successfully.',
      data: created
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/medicines/:id - Update existing medicine
function updateMedicine(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid medicine ID.' });
    }

    const existing = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    const {
      sku,
      name,
      generic_name,
      category_id,
      supplier_id,
      dosage_form,
      strength,
      cost_price,
      unit_price,
      quantity_in_stock,
      min_stock_threshold,
      expiry_date,
      batch_number,
      requires_prescription,
      description
    } = req.body;

    // Check SKU conflict with another medicine
    const skuConflict = db.prepare('SELECT id FROM medicines WHERE sku = ? AND id != ?').get(sku.trim(), id);
    if (skuConflict) {
      return res.status(409).json({
        success: false,
        message: `SKU '${sku.trim()}' is already used by another medicine record.`,
        errors: { sku: 'SKU is already in use.' }
      });
    }

    const newQty = parseInt(quantity_in_stock, 10);
    const qtyDiff = newQty - existing.quantity_in_stock;

    const updateSql = `
      UPDATE medicines SET
        sku = ?,
        name = ?,
        generic_name = ?,
        category_id = ?,
        supplier_id = ?,
        dosage_form = ?,
        strength = ?,
        cost_price = ?,
        unit_price = ?,
        quantity_in_stock = ?,
        min_stock_threshold = ?,
        expiry_date = ?,
        batch_number = ?,
        requires_prescription = ?,
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.prepare(updateSql).run(
      sku.trim(),
      name.trim(),
      generic_name.trim(),
      parseInt(category_id, 10),
      supplier_id ? parseInt(supplier_id, 10) : null,
      dosage_form.trim(),
      strength.trim(),
      parseFloat(cost_price),
      parseFloat(unit_price),
      newQty,
      parseInt(min_stock_threshold, 10),
      expiry_date,
      batch_number.trim(),
      requires_prescription ? 1 : 0,
      description ? description.trim() : null,
      id
    );

    // If stock quantity manually changed during update, log adjustment
    if (qtyDiff !== 0) {
      db.prepare(`
        INSERT INTO stock_adjustments (medicine_id, type, quantity, reason)
        VALUES (?, 'Correction', ?, 'Manual inventory update')
      `).run(id, qtyDiff);
    }

    const updated = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);

    res.json({
      success: true,
      message: 'Medicine record updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/medicines/:id - Safe deletion
function deleteMedicine(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid medicine ID.' });
    }

    const existing = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Medicine not found.' });
    }

    // Safety check: is this medicine part of existing sales invoices?
    const salesCount = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE medicine_id = ?').get(id).count;
    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete '${existing.name}' because it is linked to ${salesCount} recorded transaction(s). To preserve accounting records, please adjust stock to 0 instead of deleting.`,
        hasSales: true
      });
    }

    // Safe to delete adjustments and medicine
    db.prepare('DELETE FROM stock_adjustments WHERE medicine_id = ?').run(id);
    db.prepare('DELETE FROM medicines WHERE id = ?').run(id);

    res.json({
      success: true,
      message: `Medicine '${existing.name}' was safely removed from inventory.`,
      data: { id, name: existing.name }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/medicines/:id/stock - Quick Stock Adjustment
function adjustStock(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { type, quantity, reason } = req.body;

    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid medicine ID.' });

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' });
    }

    const validTypes = ['Restock', 'Damaged', 'Expired', 'Correction'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: `Type must be one of: ${validTypes.join(', ')}` });
    }

    const medicine = db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found.' });

    let delta = qty;
    if (['Damaged', 'Expired'].includes(type)) {
      delta = -qty;
      if (medicine.quantity_in_stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${qty} units. Current stock is only ${medicine.quantity_in_stock}.`
        });
      }
    }

    const newStock = medicine.quantity_in_stock + delta;

    db.transaction(() => {
      db.prepare('UPDATE medicines SET quantity_in_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, id);
      db.prepare(`
        INSERT INTO stock_adjustments (medicine_id, type, quantity, reason)
        VALUES (?, ?, ?, ?)
      `).run(id, type, delta, reason || `${type} adjustment`);
    })();

    res.json({
      success: true,
      message: `Stock updated successfully. New quantity: ${newStock}`,
      data: { id, quantity_in_stock: newStock }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  adjustStock
};
