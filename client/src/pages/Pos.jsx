import React, { useState, useEffect } from 'react';
import { MedicineService, CategoryService, SaleService } from '../services/api';
import {
  Search,
  ShoppingCart,
  Trash2,
  Receipt,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  Printer
} from 'lucide-react';

export default function Pos() {
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('Nimal Perera');
  const [customerPhone, setCustomerPhone] = useState('0771234567');
  const [prescriptionId, setPrescriptionId] = useState('SLMC-9421');
  const [discountPercent, setDiscountPercent] = useState(5);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    MedicineService.getAll({ limit: 100 }).then(res => res.success && setCatalog(res.data));
    CategoryService.getAll().then(res => res.success && setCategories(res.data));
  }, []);

  const addToCart = (med) => {
    if (med.quantity_in_stock <= 0) {
      alert(`'${med.name}' is out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item._id === med._id);
      if (existing) {
        if (existing.quantity >= med.quantity_in_stock) {
          alert(`Cannot exceed available stock (${med.quantity_in_stock} units).`);
          return prev;
        }
        return prev.map(item => item._id === med._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...med, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item._id === id) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.quantity_in_stock) {
            alert(`Stock limit reached (${item.quantity_in_stock} available).`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const total = subtotal - discountAmount;

  const requiresPrescription = cart.some(item => item.requires_prescription);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (requiresPrescription && (!prescriptionId || !prescriptionId.trim())) {
      alert('Doctor Prescription ID is mandatory for regulated (Rx) medicines!');
      return;
    }

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        prescription_id: prescriptionId,
        items: cart.map(item => ({
          medicine_id: item._id,
          quantity: item.quantity
        })),
        discount_percent: discountPercent,
        payment_method: paymentMethod
      };

      const res = await SaleService.create(payload);
      if (res.success) {
        setCompletedSale(res.data);
        setShowReceipt(true);
        setCart([]);
        // Refresh catalog stock counts
        MedicineService.getAll({ limit: 100 }).then(r => r.success && setCatalog(r.data));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredCatalog = catalog.filter(m => {
    const matchesCat = !selectedCat || (m.category?._id === selectedCat || m.category === selectedCat);
    const matchesSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="pos-layout">
      {/* Left: Product Catalog Grid */}
      <div>
        {/* Search & Categories Bar */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '34px' }}
                placeholder="Search catalog by name, generic or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              className={`btn btn-sm ${selectedCat === '' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCat('')}
            >
              All
            </button>
            {categories.map(c => (
              <button
                key={c._id}
                className={`btn btn-sm ${selectedCat === c._id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedCat(c._id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="pos-catalog-grid">
          {filteredCatalog.map(med => (
            <div
              key={med._id}
              className="pos-item-card"
              onClick={() => addToCart(med)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{med.sku}</span>
                {med.requires_prescription ? <span className="badge badge-rx">Rx</span> : <span className="badge badge-otc">OTC</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '2px' }}>{med.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{med.strength}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--primary)', fontSize: '14px' }}>Rs. {med.unit_price?.toFixed(2)}</strong>
                <span style={{ fontSize: '11px', color: med.quantity_in_stock <= med.min_stock_threshold ? '#d97706' : 'var(--text-muted)' }}>
                  {med.quantity_in_stock} left
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart & Checkout Panel */}
      <div className="pos-cart-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
          <ShoppingCart size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Dispensary Cart</h3>
          <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{cart.length} items</span>
        </div>

        {/* Cart Items List */}
        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '14px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Cart is empty. Click medication cards on the left to add items.
            </div>
          ) : (
            cart.map(item => (
              <div key={item._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border-light)', fontSize: '12.5px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rs. {item.unit_price?.toFixed(2)} x {item.quantity}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={() => updateQuantity(item._id, -1)}><Minus size={12} /></button>
                  <span style={{ fontWeight: 700, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                  <button className="btn-icon" style={{ width: '24px', height: '24px' }} onClick={() => updateQuantity(item._id, 1)}><Plus size={12} /></button>
                  <button className="btn-icon" style={{ width: '24px', height: '24px', color: '#dc2626' }} onClick={() => removeFromCart(item._id)}><Trash2 size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Prescription Check Callout */}
        {requiresPrescription && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px', color: '#991b1b', marginBottom: '12px' }}>
            ⚠️ <strong>Prescription Required (Rx):</strong> Doctor reference ID is mandatory before dispensing.
          </div>
        )}

        {/* Customer & Prescription Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div className="form-group" style={{ marginBottom: '6px' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Customer Name</label>
            <input type="text" className="form-control" style={{ padding: '6px 8px' }} value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: '6px' }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Phone Number</label>
            <input type="text" className="form-control" style={{ padding: '6px 8px' }} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label className="form-label" style={{ fontSize: '11px' }}>
            Doctor Prescription ID {requiresPrescription && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          <input
            type="text"
            className="form-control"
            style={{ padding: '6px 8px' }}
            placeholder="e.g. SLMC-9421"
            value={prescriptionId}
            onChange={e => setPrescriptionId(e.target.value)}
          />
        </div>

        {/* Totals Summary */}
        <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span>Subtotal:</span>
            <span>Rs. {subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span>Discount (%):</span>
            <input
              type="number"
              min="0"
              max="100"
              style={{ width: '60px', padding: '2px 6px', textAlign: 'right' }}
              value={discountPercent}
              onChange={e => setDiscountPercent(Number(e.target.value))}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '15px', color: 'var(--primary)', borderTop: '1px solid var(--border-light)', paddingTop: '6px', marginTop: '6px' }}>
            <span>TOTAL:</span>
            <span>Rs. {total.toFixed(2)}</span>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleCheckout}>
          Complete Dispensation (POS)
        </button>
      </div>

      {/* RECEIPT MODAL */}
      {showReceipt && completedSale && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', fontFamily: 'monospace' }}>
            <div className="modal-header">
              <h3>Official Dispensation Invoice</h3>
              <button className="btn-icon" onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: '8px', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px' }}>PHARMACARE PRO DISPENSARY</strong><br />
                University of Ruhuna Teaching Campus<br />
                Invoice #: {completedSale.invoice_number}<br />
                Date: {new Date(completedSale.createdAt).toLocaleString()}
              </div>

              <div>Customer: {completedSale.customer_name} ({completedSale.customer_phone})</div>
              {completedSale.prescription_id && <div>Prescription: {completedSale.prescription_id}</div>}

              <div style={{ borderTop: '1px dashed #ccc', marginTop: '10px', paddingTop: '8px', marginBottom: '10px' }}>
                {completedSale.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.medicine_name} x {item.quantity}</span>
                    <span>Rs. {item.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px dashed #ccc', paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>Rs. {completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount ({completedSale.discount_percent}%):</span>
                    <span>-Rs. {completedSale.discount_amount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                  <span>TOTAL PAID ({completedSale.payment_method}):</span>
                  <span>Rs. {completedSale.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReceipt(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
