import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import Dashboard from './pages/Dashboard';
import Medicines from './pages/Medicines';
import Pos from './pages/Pos';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Sales from './pages/Sales';
import Login from './pages/Login';
import DatabaseExplorer from './pages/DatabaseExplorer';

function Layout({ children, theme, toggleTheme }) {
  const location = useLocation();

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/dashboard': return 'Executive Inventory & Performance Dashboard';
      case '/medicines': return 'Pharmaceutical Catalog & Stock Control';
      case '/pos': return 'Point of Sale (POS) & Counter Dispensation';
      case '/categories': return 'Therapeutic Drug Classification Registry';
      case '/suppliers': return 'Pharmaceutical Distributors & Supply Chain';
      case '/sales': return 'Dispensation Invoices & Financial Audit Log';
      case '/database': return 'MongoDB Collections & Document Inspector';
      case '/login': return 'Portal Authentication';
      default: return 'PharmaCare Pro Management Suite';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar theme={theme} toggleTheme={toggleTheme} />
      <div className="main-wrapper">
        <Topbar
          title={getPageTitle(location.pathname)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}

function MainApp() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <Router>
      <Layout theme={theme} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/pos" element={<Pos />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/database" element={<DatabaseExplorer />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
