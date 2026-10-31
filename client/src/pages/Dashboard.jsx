import React, { useState, useEffect } from 'react';
import { StatsService } from '../services/api';
import {
  Pill,
  Coins,
  AlertTriangle,
  Ban,
  CalendarX,
  Receipt,
  ArrowRight,
  TrendingUp,
  Boxes
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StatsService.getDashboard()
      .then(res => {
        if (res.success) setStats(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        Loading dashboard metrics from MongoDB...
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const categories = stats?.category_breakdown || [];
  const trend = stats?.sales_trend || [];
  const attention = stats?.priority_attention || [];

  return (
    <div>
      {/* 6 KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <Pill size={22} />
          </div>
          <div className="kpi-info">
            <h4>Total Medicines</h4>
            <div className="kpi-value">{kpis.total_medicines || 0}</div>
            <span className="sub">{(kpis.total_units || 0).toLocaleString()} units in MongoDB</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#d1fae5', color: '#059669' }}>
            <Coins size={22} />
          </div>
          <div className="kpi-info">
            <h4>Inventory Retail Value</h4>
            <div className="kpi-value">Rs. {(kpis.total_retail_value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            <span className="sub">Cost: Rs. {(kpis.total_cost_value || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <AlertTriangle size={22} />
          </div>
          <div className="kpi-info">
            <h4>Low Stock Items</h4>
            <div className="kpi-value">{kpis.low_stock_count || 0}</div>
            <span className="sub">Below reorder threshold</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#fee2e2', color: '#dc2626' }}>
            <Ban size={22} />
          </div>
          <div className="kpi-info">
            <h4>Out of Stock</h4>
            <div className="kpi-value">{kpis.out_of_stock_count || 0}</div>
            <span className="sub">Immediate reorder required</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#ede9fe', color: '#7c3aed' }}>
            <CalendarX size={22} />
          </div>
          <div className="kpi-info">
            <h4>Expired / Near Expiry</h4>
            <div className="kpi-value">{(kpis.expired_count || 0) + (kpis.expiring_soon_count || 0)}</div>
            <span className="sub">{kpis.expired_count || 0} expired, {kpis.expiring_soon_count || 0} &le;30d</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box" style={{ background: '#ccfbf1', color: '#0d9488' }}>
            <Receipt size={22} />
          </div>
          <div className="kpi-info">
            <h4>Today's Sales Revenue</h4>
            <div className="kpi-value">Rs. {(kpis.today_revenue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
            <span className="sub">{kpis.today_orders || 0} transaction(s) today</span>
          </div>
        </div>
      </div>

      {/* Analytics Visualizations Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Category Breakdown Bar Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inventory by Category</span>
            <span className="badge badge-info">MongoDB Distribution</span>
          </div>
          <div className="card-body">
            {categories.map((c, idx) => (
              <div key={idx} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600 }}>{c.category_name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{c.count} items</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-page)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min((c.count / (kpis.total_medicines || 1)) * 100, 100)}%`,
                      background: 'var(--primary)',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Revenue Trend Line */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">7-Day Sales Trend (Rs.)</span>
            <span className="badge badge-success">Live Cashflow</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '170px', paddingTop: '20px' }}>
              {trend.map((t, idx) => {
                const maxVal = Math.max(...trend.map(x => x.daily_revenue), 1000);
                const heightPercent = Math.max((t.daily_revenue / maxVal) * 100, 8);
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {t.daily_revenue > 0 ? `Rs. ${t.daily_revenue.toFixed(0)}` : '0'}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s'
                      }}
                    />
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {t.sale_date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Attention Items Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#f59e0b" />
            Priority Attention Items
          </span>
          <Link to="/medicines" className="btn btn-outline btn-sm">
            View All Medicines <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Medicine Name</th>
                <th>Generic Name</th>
                <th>Current Stock</th>
                <th>Expiry Date</th>
                <th>Alert Status</th>
              </tr>
            </thead>
            <tbody>
              {attention.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    All medicines have healthy stock and valid shelf-life.
                  </td>
                </tr>
              ) : (
                attention.map((item, idx) => (
                  <tr key={idx}>
                    <td><code>{item.sku}</code></td>
                    <td><strong>{item.name}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.generic_name}</td>
                    <td>
                      {item.stock === 0 ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : (
                        <span className="badge badge-warning">{item.stock} Units</span>
                      )}
                    </td>
                    <td>{item.expiry_date}</td>
                    <td>
                      {item.alert_type === 'EXPIRED' && (
                        <span className="badge badge-danger">EXPIRED</span>
                      )}
                      {item.alert_type === 'OUT_OF_STOCK' && (
                        <span className="badge badge-danger">OUT OF STOCK</span>
                      )}
                      {item.alert_type === 'LOW_STOCK' && (
                        <span className="badge badge-warning">LOW STOCK</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
