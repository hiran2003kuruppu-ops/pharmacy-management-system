const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'SKU barcode is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Brand medicine name is required'],
    trim: true
  },
  generic_name: {
    type: String,
    required: [true, 'Generic chemical name is required'],
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Therapeutic category is required']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  dosage_form: {
    type: String,
    enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Inhaler', 'Drops', 'Other'],
    default: 'Tablet'
  },
  strength: {
    type: String,
    required: true,
    trim: true
  },
  batch_number: {
    type: String,
    required: true,
    trim: true
  },
  cost_price: {
    type: Number,
    required: true,
    min: [0, 'Cost price cannot be negative']
  },
  unit_price: {
    type: Number,
    required: true,
    min: [0, 'Unit selling price cannot be negative']
  },
  quantity_in_stock: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  min_stock_threshold: {
    type: Number,
    default: 15,
    min: [1, 'Min stock threshold must be at least 1']
  },
  expiry_date: {
    type: Date,
    required: true
  },
  requires_prescription: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text & Compound Indexes for performance search
medicineSchema.index({ name: 'text', generic_name: 'text', sku: 'text' });
medicineSchema.index({ expiry_date: 1 });
medicineSchema.index({ quantity_in_stock: 1 });

// Virtuals for Expiry Calculation
medicineSchema.virtual('days_until_expiry').get(function () {
  if (!this.expiry_date) return null;
  const diffTime = this.expiry_date.getTime() - new Date().getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

medicineSchema.virtual('expiry_status').get(function () {
  const days = this.days_until_expiry;
  if (days === null) return 'UNKNOWN';
  if (days < 0) return 'EXPIRED';
  if (days <= 30) return 'EXPIRING_SOON';
  return 'VALID';
});

module.exports = mongoose.model('Medicine', medicineSchema);
