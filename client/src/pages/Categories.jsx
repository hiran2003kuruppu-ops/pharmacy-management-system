import React, { useState, useEffect } from 'react';
import { CategoryService } from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const loadCategories = () => {
    CategoryService.getAll().then(res => res.success && setCategories(res.data));
  };

  useEffect(() => { loadCategories(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await CategoryService.update(editing._id, formData);
      } else {
        await CategoryService.create(formData);
      }
      setShowModal(false);
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category '${name}'?`)) return;
    try {
      await CategoryService.delete(id);
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Therapeutic Drug Classifications</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Classify pharmaceuticals according to anatomical and therapeutic indications</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setFormData({ name: '', description: '' }); setShowModal(true); }}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Medicines Count</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(c => (
              <tr key={c._id}>
                <td><strong>{c.name}</strong></td>
                <td style={{ color: 'var(--text-muted)' }}>{c.description || 'No clinical description'}</td>
                <td><span className="badge badge-info">{c.medicine_count || 0} Drugs</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-icon" style={{ width: '28px', height: '28px', display: 'inline-flex', marginRight: '6px' }} onClick={() => { setEditing(c); setFormData({ name: c.name, description: c.description }); setShowModal(true); }}>
                    <Edit2 size={13} />
                  </button>
                  <button className="btn-icon" style={{ width: '28px', height: '28px', display: 'inline-flex', color: '#dc2626' }} onClick={() => handleDelete(c._id, c.name)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Category' : 'Add Category'}</h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Category Name</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
