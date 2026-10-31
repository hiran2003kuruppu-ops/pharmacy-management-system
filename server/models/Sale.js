const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  medicine_name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit_price: {
    type: Number,
    required: true,
    min: 0
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  invoice_number: {
    type: String,
    required: true,
    unique: true
  },
  pharmacist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  customer_name: {
    type: String,
    trim: true,
    default: 'Walk-in Customer'
  },
  customer_phone: {
    type: String,
    trim: true,
    default: ''
  },
  prescription_id: {
    type: String,
    trim: true,
    default: ''
  },
  items: {
    type: [saleItemSchema],
    validate: [v => v.length > 0, 'Sale must contain at least one medicine item']
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discount_percent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discount_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  payment_method: {
    type: String,
    enum: ['Cash', 'Card', 'Online'],
    default: 'Cash'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Sale', saleSchema);
