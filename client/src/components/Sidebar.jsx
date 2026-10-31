import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  Receipt,
  Tags,
  Truck,
  ShieldAlert,
  Database,
  Moon,
  Sun,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ theme, toggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">+</div>
        <div className="brand-info">
          <h2>PharmaCare Pro</h2>
          <span>MERN MANAGEMENT</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">OVERVIEW</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>

        <div className="nav-label">DISPENSARY</div>
        <NavLink to="/medicines" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Pill size={18} />
          <span>Medicines Inventory</span>
        </NavLink>
        <NavLink to="/pos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          <span>Point of Sale (POS)</span>
        </NavLink>
        <NavLink to="/sales" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Receipt size={18} />
          <span>Sales &amp; Invoices</span>
        </NavLink>

        <div className="nav-label">DIRECTORIES</div>
        <NavLink to="/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Tags size={18} />
          <span>Drug Categories</span>
        </NavLink>
        <NavLink to="/suppliers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Truck size={18} />
          <span>Suppliers Directory</span>
        </NavLink>

        <div className="nav-label">SYSTEM &amp; EVALUATION</div>
        <NavLink to="/database" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Database size={18} />
          <span>MongoDB Explorer</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="db-status" style={{ marginBottom: '10px' }}>
          <div className="status-dot"></div>
          <span>MongoDB Atlas / Local</span>
        </div>
        <div style={{ color: '#64748b', fontSize: '10px' }}>
          Student: K.A.H.B. Kuruppu<br />
          Reg: EG/2023/5700
        </div>
      </div>
    </aside>
  );
}
