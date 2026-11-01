import React, { useState, useEffect } from 'react';
import { MedicineService, CategoryService, SupplierService } from '../services/api';
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Boxes,
  RotateCcw,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    generic_name: '',
    category: '',
    supplier: '',
    dosage_form: 'Tablet',
    strength: '',
    batch_number: '',
    cost_price: '',
    unit_price: '',
    quantity_in_stock: '',
    min_stock_threshold: '15',
    expiry_date: '',
    requires_prescription: false,
    description: ''
  });

  const [stockData, setStockData] = useState({
    adjustment_type: 'Restock',
    quantity: '10',
    reason: ''
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchMedicines = () => {
    setLoading(true);
    MedicineService.getAll({
      q: search,
      category: selectedCategory,
      stock_status: stockStatus,
      expiry_status: expiryStatus,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: pagination.page,
      limit: pagination.limit
    })
      .then(res => {
        if (res.success) {
          setMedicines(res.data);
          setPagination(res.pagination);
        }
      })
      .catch(err => showToast(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    CategoryService.getAll().then(res => res.success && setCategories(res.data));
    SupplierService.getAll().then(res => res.success && setSuppliers(res.data));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedicines();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, stockStatus, expiryStatus, sortBy, sortOrder, pagination.page]);

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setFormData({
      sku: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      generic_name: '',
      category: categories[0]?._id || '',
      supplier: suppliers[0]?._id || '',
      dosage_form: 'Tablet',
      strength: '500mg',
      batch_number: `BAT-${new Date().getFullYear()}-01`,
      cost_price: '',
      unit_price: '',
      quantity_in_stock: '50',
      min_stock_threshold: '15',
      expiry_date: '2027-12-31',
      requires_prescription: false,
      description: ''
    });
    setShowFormModal(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedicine(med);
    setFormData({
      sku: med.sku,
      name: med.name,
      generic_name: med.generic_name,
      category: med.category?._id || med.category || '',
      supplier: med.supplier?._id || med.supplier || '',
      dosage_form: med.dosage_form || 'Tablet',
      strength: med.strength,
      batch_number: med.batch_number,
      cost_price: med.cost_price,
      unit_price: med.unit_price,
      quantity_in_stock: med.quantity_in_stock,
      min_stock_threshold: med.min_stock_threshold,
      expiry_date: med.expiry_date ? med.expiry_date.slice(0, 10) : '',
      requires_prescription: med.requires_prescription,
      description: med.description || ''
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (Number(formData.unit_price) < Number(formData.cost_price)) {
      alert('Selling price cannot be less than cost price!');
      return;
    }

    try {
      const payload = {
        ...formData,
        supplier: formData.supplier || null,
        cost_price: Number(formData.cost_price),
        unit_price: Number(formData.unit_price),
        quantity_in_stock: Number(formData.quantity_in_stock),
        min_stock_threshold: Number(formData.min_stock_threshold) || 15
      };

      if (editingMedicine) {
        await MedicineService.update(editingMedicine._id, payload);
        showToast(`Updated '${formData.name}' successfully!`);
      } else {
        await MedicineService.create(payload);
        showToast(`Created '${formData.name}' successfully!`);
      }
      setShowFormModal(false);
      fetchMedicines();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStockAdjustment = async (e) => {
    e.preventDefault();
    try {
      await MedicineService.adjustStock(selectedMedicine._id, stockData);
      showToast(`Stock adjusted for '${selectedMedicine.name}'.`);
      setShowStockModal(false);
      fetchMedicines();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMedicine = async () => {
    try {
      await MedicineService.delete(selectedMedicine._id);
      showToast(`'${selectedMedicine.name}' safely deleted.`);
      setShowDeleteModal(false);
      fetchMedicines();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <CheckCircle size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Action and Filter Bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              id="search-input"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by name, generic chemical, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" id="btn-add-medicine" onClick={handleOpenAddModal}>
            <Plus size={16} /> Add Medicine
          </button>
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', fontSize: '13px' }}>
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt;15)</option>
            <option value="low">Low Stock (&le;15)</option>
            <option value="out">Out of Stock (0)</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={expiryStatus}
            onChange={(e) => setExpiryStatus(e.target.value)}
          >
            <option value="">All Expiry Dates</option>
            <option value="valid">Valid Shelf Life</option>
            <option value="near_expiry">Expiring Soon (&le;30d)</option>
            <option value="expired">Expired</option>
          </select>

          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setStockStatus('');
              setExpiryStatus('');
            }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Medicines Table Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Medicines Catalog ({pagination.total} registered in MongoDB)
          </span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Brand Name &amp; Generic</th>
                <th>Category</th>
                <th>Dosage &amp; Strength</th>
                <th>Price (LKR)</th>
                <th>Stock</th>
                <th>Expiry</th>
                <th>Rx</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading medicines from MongoDB...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                medicines.map(med => (
                  <tr key={med._id}>
                    <td><code>{med.sku}</code></td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{med.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{med.generic_name}</div>
                    </td>
                    <td>
                      <div>{med.category?.name || 'Uncategorized'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{med.supplier?.name || 'Local / SPC'}</div>
                    </td>
                    <td>{med.dosage_form} ({med.strength})</td>
                    <td><strong>Rs. {med.unit_price?.toFixed(2)}</strong></td>
                    <td>
                      {med.quantity_in_stock === 0 ? (
                        <span className="badge badge-danger">Out of Stock (0)</span>
                      ) : med.quantity_in_stock <= med.min_stock_threshold ? (
                        <span className="badge badge-warning">Low ({med.quantity_in_stock})</span>
                      ) : (
                        <span className="badge badge-success">{med.quantity_in_stock} Units</span>
                      )}
                    </td>
                    <td>
                      {med.expiry_status === 'EXPIRED' ? (
                        <span className="badge badge-danger">Expired</span>
                      ) : med.expiry_status === 'EXPIRING_SOON' ? (
                        <span className="badge badge-warning">Near Expiry</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{med.expiry_date?.slice(0, 10)}</span>
                      )}
                    </td>
                    <td>
                      {med.requires_prescription ? (
                        <span className="badge badge-rx">Rx</span>
                      ) : (
                        <span className="badge badge-otc">OTC</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="View Specifications"
                          onClick={() => {
                            setSelectedMedicine(med);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Adjust Stock"
                          onClick={() => {
                            setSelectedMedicine(med);
                            setStockData({ adjustment_type: 'Restock', quantity: '20', reason: 'Supplier PO' });
                            setShowStockModal(true);
                          }}
                        >
                          <Boxes size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '30px', height: '30px' }}
                          title="Edit Medicine"
                          onClick={() => handleOpenEditModal(med)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn-icon"
                          style={{ width: '30px', height: '30px', color: '#dc2626' }}
                          title="Safe Deletion"
                          onClick={() => {
                            setSelectedMedicine(med);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT MEDICINE */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Add New Medicine Record'}
              </h3>
              <button className="btn-icon" onClick={() => setShowFormModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">SKU Barcode</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Generic Chemical Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.generic_name}
                      onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Therapeutic Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Pharmaceutical Supplier</label>
                    <select
                      className="form-select"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    >
                      <option value="">-- No Supplier (General) --</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dosage Form</label>
                    <select
                      className="form-select"
                      value={formData.dosage_form}
                      onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup</option>
                      <option value="Injection">Injection</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Inhaler">Inhaler</option>
                      <option value="Drops">Drops</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Strength / Dose</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 500mg, 10ml"
                      value={formData.strength}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Cost Price (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selling Price (Rs.)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Units</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.quantity_in_stock}
                      onChange={(e) => setFormData({ ...formData, quantity_in_stock: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min Threshold</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={formData.min_stock_threshold}
                      onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Expiry Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '22px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={formData.requires_prescription}
                        onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                      />
                      <span><strong>Prescription Required (Rx)</strong></span>
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '14px' }}>
                  <label className="form-label">Description / Therapeutic Notes</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    placeholder="Clinical indications, warnings, administration notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Medicine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STOCK ADJUSTMENT */}
      {showStockModal && selectedMedicine && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Adjust Stock: {selectedMedicine.name}</h3>
              <button className="btn-icon" onClick={() => setShowStockModal(false)}>✕</button>
            </div>
            <form onSubmit={handleStockAdjustment}>
              <div className="modal-body">
                <div style={{ background: 'var(--bg-page)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                  Current Stock: <strong>{selectedMedicine.quantity_in_stock} units</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-select"
                    value={stockData.adjustment_type}
                    onChange={(e) => setStockData({ ...stockData, adjustment_type: e.target.value })}
                  >
                    <option value="Restock">Restock (+ Add units)</option>
                    <option value="Damaged">Damaged / Broken (- Remove units)</option>
                    <option value="Expired">Expired Quarantine (- Remove units)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={stockData.quantity}
                    onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Notes</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. PO-7890 received from supplier"
                    value={stockData.reason}
                    onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowStockModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW SPECIFICATIONS */}
      {showDetailModal && selectedMedicine && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{selectedMedicine.name} Specification</h3>
              <button className="btn-icon" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div><strong>SKU:</strong> <code>{selectedMedicine.sku}</code></div>
                <div><strong>Generic:</strong> {selectedMedicine.generic_name}</div>
                <div><strong>Category:</strong> {selectedMedicine.category?.name}</div>
                <div><strong>Form / Strength:</strong> {selectedMedicine.dosage_form} - {selectedMedicine.strength}</div>
                <div><strong>Cost Price:</strong> Rs. {selectedMedicine.cost_price?.toFixed(2)}</div>
                <div><strong>Retail Price:</strong> Rs. {selectedMedicine.unit_price?.toFixed(2)}</div>
                <div><strong>Batch:</strong> {selectedMedicine.batch_number}</div>
                <div><strong>Expiry:</strong> {selectedMedicine.expiry_date?.slice(0, 10)}</div>
                <div><strong>Supplier:</strong> {selectedMedicine.supplier?.name || 'Local SPC'}</div>
                <div><strong>Prescription:</strong> {selectedMedicine.requires_prescription ? 'Mandatory Rx' : 'OTC'}</div>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>{selectedMedicine.description || 'Clinical therapeutic item.'}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SAFE DELETION CHECK */}
      {showDeleteModal && selectedMedicine && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ borderBottomColor: '#fecaca' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Confirm Deletion
              </h3>
              <button className="btn-icon" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '13px' }}>
              <p>Are you sure you want to delete <strong>{selectedMedicine.name}</strong> (<code>{selectedMedicine.sku}</code>)?</p>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px', borderRadius: '8px', marginTop: '10px', fontSize: '12px', color: '#991b1b' }}>
                🛡️ <strong>Relational Safety Protection:</strong> If this medicine has any existing sales invoices recorded, MongoDB relational validation will block deletion to protect financial audit history.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteMedicine}>Yes, Delete Safely</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
