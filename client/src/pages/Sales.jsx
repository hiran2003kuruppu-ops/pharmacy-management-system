import React, { useState, useEffect } from 'react';
import { SaleService } from '../services/api';
import { Receipt, Search, Eye } from 'lucide-react';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    SaleService.getAll({ limit: 50 }).then(res => res.success && setSales(res.data));
  }, []);

  return (
    <div>
      <div className="card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Sales Invoices &amp; Dispensation Audit Trail</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Historical transaction records in Sri Lankan Rupees (Rs.)</p>
        </div>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Prescription ID</th>
              <th>Items Sold</th>
              <th>Payment</th>
              <th>Total (LKR)</th>
              <th>Date &amp; Time</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s._id}>
                <td><code>{s.invoice_number}</code></td>
                <td><strong>{s.customer_name}</strong></td>
                <td>{s.prescription_id ? <span className="badge badge-rx">{s.prescription_id}</span> : <span style={{ color: 'var(--text-muted)' }}>OTC</span>}</td>
                <td>{s.items?.length || 0} item(s)</td>
                <td><span className="badge badge-info">{s.payment_method}</span></td>
                <td><strong style={{ color: 'var(--primary)' }}>Rs. {s.total_amount?.toFixed(2)}</strong></td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn-icon" style={{ width: '28px', height: '28px', display: 'inline-flex' }} onClick={() => setSelectedSale(s)}>
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '420px', fontFamily: 'monospace' }}>
            <div className="modal-header">
              <h3>Invoice: {selectedSale.invoice_number}</h3>
              <button className="btn-icon" onClick={() => setSelectedSale(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div>Customer: {selectedSale.customer_name} ({selectedSale.customer_phone})</div>
              <div>Prescription: {selectedSale.prescription_id || 'None (OTC)'}</div>
              <div style={{ borderTop: '1px dashed #ccc', marginTop: '10px', paddingTop: '8px' }}>
                {selectedSale.items?.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{it.medicine_name} x {it.quantity}</span>
                    <span>Rs. {it.total_price?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px dashed #ccc', marginTop: '10px', paddingTop: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                  <span>TOTAL:</span>
                  <span>Rs. {selectedSale.total_amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedSale(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
