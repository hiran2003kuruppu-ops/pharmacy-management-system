const db = require('../config/database');

// GET /api/sales - List sales with customer or invoice search
function getAllSales(req, res, next) {
  try {
    const { q = '', date = '', page = 1, limit = 50 } = req.query;

    const conditions = [];
    const params = [];

    if (q && q.trim()) {
      conditions.push('(s.invoice_number LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (date) {
      conditions.push("date(s.created_at) = ?");
      params.push(date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) as total FROM sales s ${whereClause}`;
    const totalCount = db.prepare(countSql).get(...params).total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const sql = `
      SELECT
        s.*,
        COUNT(si.id) as item_count,
        COALESCE(SUM(si.quantity), 0) as total_units
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const sales = db.prepare(sql).all(...params, limitNum, offset);

    res.json({
      success: true,
      data: sales,
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

// GET /api/sales/:id - Invoice details
function getSaleById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found.' });
    }

    const items = db.prepare(`
      SELECT
        si.*,
        m.name as medicine_name,
        m.sku,
        m.dosage_form,
        m.strength
      FROM sale_items si
      JOIN medicines m ON si.medicine_id = m.id
      WHERE si.sale_id = ?
    `).all(id);

    res.json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/sales - Checkout transaction
function createSale(req, res, next) {
  try {
    const {
      customer_name,
      customer_phone,
      doctor_prescription_id,
      discount_percent = 0,
      payment_method,
      items
    } = req.body;

    // Execute within SQLite transaction to ensure ACID compliance
    const executeCheckout = db.transaction(() => {
      // 1. Verify all medicines and check stock
      let subtotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const medId = parseInt(item.medicine_id, 10);
        const reqQty = parseInt(item.quantity, 10);

        const med = db.prepare('SELECT * FROM medicines WHERE id = ?').get(medId);
        if (!med) {
          throw new Error(`Medicine with ID ${medId} does not exist.`);
        }

        if (med.quantity_in_stock < reqQty) {
          throw new Error(`Insufficient stock for '${med.name}'. Requested: ${reqQty}, Available: ${med.quantity_in_stock}.`);
        }

        // Check prescription requirement
        if (med.requires_prescription === 1 && (!doctor_prescription_id || !doctor_prescription_id.trim())) {
          throw new Error(`'${med.name}' is a prescription-only drug. Doctor prescription reference ID is required.`);
        }

        const itemSubtotal = med.unit_price * reqQty;
        subtotal += itemSubtotal;

        verifiedItems.push({
          medicine_id: med.id,
          name: med.name,
          quantity: reqQty,
          unit_price: med.unit_price,
          subtotal: itemSubtotal,
          current_stock: med.quantity_in_stock
        });
      }

      // Calculate discount and total
      const discPct = Math.max(0, Math.min(100, parseFloat(discount_percent) || 0));
      const discountAmount = (subtotal * discPct) / 100;
      const totalAmount = Math.max(0, subtotal - discountAmount);

      // Generate invoice number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

      // Insert sale record
      const saleInsert = db.prepare(`
        INSERT INTO sales (
          invoice_number, customer_name, customer_phone,
          doctor_prescription_id, subtotal, discount_percent,
          total_amount, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceNumber,
        customer_name.trim(),
        customer_phone ? customer_phone.trim() : null,
        doctor_prescription_id ? doctor_prescription_id.trim() : null,
        subtotal,
        discPct,
        totalAmount,
        payment_method
      );

      const saleId = saleInsert.lastInsertRowid;

      // Insert items and deduct stock
      const insertItemStmt = db.prepare(`
        INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE medicines
        SET quantity_in_stock = quantity_in_stock - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      const logStockStmt = db.prepare(`
        INSERT INTO stock_adjustments (medicine_id, type, quantity, reason)
        VALUES (?, 'Damaged', ?, ?)
      `);

      for (const vItem of verifiedItems) {
        insertItemStmt.run(saleId, vItem.medicine_id, vItem.quantity, vItem.unit_price, vItem.subtotal);
        updateStockStmt.run(vItem.quantity, vItem.medicine_id);
      }

      return {
        id: saleId,
        invoice_number: invoiceNumber,
        customer_name,
        subtotal,
        discount_percent: discPct,
        total_amount: totalAmount,
        payment_method,
        items: verifiedItems
      };
    });

    const result = executeCheckout();

    res.status(201).json({
      success: true,
      message: 'Sale transaction processed successfully.',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
}

module.exports = {
  getAllSales,
  getSaleById,
  createSale
};
