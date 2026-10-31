const Category = require('../models/Category');
const Medicine = require('../models/Medicine');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    // Also include drug counts
    const withCounts = await Promise.all(categories.map(async (cat) => {
      const count = await Medicine.countDocuments({ category: cat._id });
      return {
        ...cat.toObject(),
        medicine_count: count
      };
    }));
    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const category = await Category.create({ name: name.trim(), description });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Category name already exists.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const inUse = await Medicine.findOne({ category: req.params.id });
    if (inUse) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category: active medicines are categorized under it.'
      });
    }
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Category safely deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
