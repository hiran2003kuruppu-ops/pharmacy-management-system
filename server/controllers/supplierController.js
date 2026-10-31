const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');

exports.getAllSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    const withCounts = await Promise.all(suppliers.map(async (sup) => {
      const count = await Medicine.countDocuments({ supplier: sup._id });
      return {
        ...sup.toObject(),
        supplied_medicines_count: count
      };
    }));
    res.status(200).json({ success: true, data: withCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Supplier name and phone number are required.' });
    }
    const supplier = await Supplier.create({ name, contact_person, phone, email, address });
    res.status(201).json({ success: true, data: supplier });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Supplier name already exists.' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const inUse = await Medicine.findOne({ supplier: req.params.id });
    if (inUse) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier: medicines in inventory reference this distributor.'
      });
    }
    await Supplier.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Supplier safely deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
