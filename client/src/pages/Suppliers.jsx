import React, { useState, useEffect } from 'react';
import { SupplierService } from '../services/api';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin } from 'lucide-react';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address: '' });

  const loadSuppliers = () => {
    SupplierService.getAll().then(res => res.success && setSuppliers(res.data));
  };

  useEffect(() => { loadSuppliers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await SupplierService.update(editing._id, formData);
      } else {
        await SupplierService.create(formData);
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete supplier '${name}'?`)) return;
    try {
      await SupplierService.delete(id);
      loadSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Pharmaceutical Distributors &amp; Vendors</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Registered suppliers in Sri Lanka (State Pharmaceuticals Corporation, Hemas, Morison)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' }); setShowModal(true); }}>
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {suppliers.map(s => (
          <div key={s._id} className="card" style={{ padding: '18px', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{s.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>Contact: {s.contact_person || 'Distributor Desk'}</div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="btn-icon" style={{ width: '28px', height: '28px' }} onClick={() => { setEditing(s); setFormData({ ...s }); setShowModal(true); }}><Edit2 size={13} /></button>
                <button className="btn-icon" style={{ width: '28px', height: '28px', color: '#dc2626' }} onClick={() => handleDelete(s._id, s.name)}><Trash2 size={13} /></button>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={13} /> {s.phone}</div>
              {s.email && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={13} /> {s.email}</div>}
              {s.address && <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={13} /> {s.address}</div>}
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '12px', paddingTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              Supplies {s.supplied_medicines_count || 0} catalogued medicines
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Distributor / Company Name</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input type="text" className="form-control" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-control" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Office / Warehouse Address</label>
                  <textarea className="form-control" rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
