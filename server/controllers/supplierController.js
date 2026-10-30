const db = require('../config/database');

function getAllSuppliers(req, res, next) {
  try {
    const suppliers = db.prepare(`
      SELECT
        s.*,
        COUNT(m.id) as total_products_supplied
      FROM suppliers s
      LEFT JOIN medicines m ON s.id = m.supplier_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `).all();

    res.json({ success: true, data: suppliers });
  } catch (err) {
    next(err);
  }
}

function getSupplierById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const medicines = db.prepare('SELECT id, sku, name, dosage_form, unit_price, quantity_in_stock FROM medicines WHERE supplier_id = ?').all(id);

    res.json({ success: true, data: { ...supplier, medicines } });
  } catch (err) {
    next(err);
  }
}

function createSupplier(req, res, next) {
  try {
    const { name, contact_person, phone, email, address } = req.body;

    const info = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, email, address)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone.trim(),
      email ? email.trim() : null,
      address ? address.trim() : null
    );

    const created = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Supplier registered successfully.', data: created });
  } catch (err) {
    next(err);
  }
}

function updateSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, contact_person, phone, email, address } = req.body;

    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    db.prepare(`
      UPDATE suppliers SET
        name = ?,
        contact_person = ?,
        phone = ?,
        email = ?,
        address = ?
      WHERE id = ?
    `).run(
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone.trim(),
      email ? email.trim() : null,
      address ? address.trim() : null,
      id
    );

    const updated = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    res.json({ success: true, message: 'Supplier updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
}

function deleteSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    // Set supplier_id to NULL on existing medicines (handled by ON DELETE SET NULL, or explicit update)
    db.prepare('UPDATE medicines SET supplier_id = NULL WHERE supplier_id = ?').run(id);
    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);

    res.json({ success: true, message: `Supplier '${existing.name}' was deleted safely.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};
