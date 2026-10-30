const db = require('../config/database');

function getAllCategories(req, res, next) {
  try {
    const categories = db.prepare(`
      SELECT
        c.*,
        COUNT(m.id) as total_medicines,
        COALESCE(SUM(m.quantity_in_stock), 0) as total_stock
      FROM categories c
      LEFT JOIN medicines m ON c.id = m.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
}

function getCategoryById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
}

function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    const existing = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(name.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists.',
        errors: { name: 'Category name must be unique.' }
      });
    }

    const info = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(
      name.trim(),
      description ? description.trim() : null
    );

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, message: 'Category created successfully.', data: created });
  } catch (err) {
    next(err);
  }
}

function updateCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description } = req.body;

    const existing = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const duplicate = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id != ?').get(name.trim(), id);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Another category with this name already exists.',
        errors: { name: 'Category name must be unique.' }
      });
    }

    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(
      name.trim(),
      description ? description.trim() : null,
      id
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ success: true, message: 'Category updated successfully.', data: updated });
  } catch (err) {
    next(err);
  }
}

function deleteCategory(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    // Safety check: verify no medicines belong to this category
    const medCount = db.prepare('SELECT COUNT(*) as count FROM medicines WHERE category_id = ?').get(id).count;
    if (medCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${existing.name}' because it contains ${medCount} medicine item(s). Reassign them first.`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: `Category '${existing.name}' was safely deleted.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
