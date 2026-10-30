// Sales Invoices Viewer & Main App Controller

const SalesModule = (() => {
  let sales = [];
  let filterDate = '';
  let searchQuery = '';

  function init() {
    bindEvents();
    loadSales();
  }

  function bindEvents() {
    const searchInput = document.getElementById('salesSearchInput');
    let timer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timer);
      searchQuery = e.target.value;
      timer = setTimeout(() => loadSales(), 300);
    });

    const dateFilter = document.getElementById('salesDateFilter');
    dateFilter.addEventListener('change', (e) => {
      filterDate = e.target.value;
      loadSales();
    });

    document.getElementById('salesResetFilterBtn').addEventListener('click', () => {
      searchInput.value = '';
      dateFilter.value = '';
      searchQuery = '';
      filterDate = '';
      loadSales();
    });
  }

  async function loadSales() {
    const tbody = document.getElementById('salesTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-5 text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading sales invoices...</td></tr>';

    try {
      const response = await API.getSales({ q: searchQuery, date: filterDate, limit: 50 });
      sales = response.data;
      renderTable(sales);
      document.getElementById('salesTableCount').textContent = `${sales.length} Invoices`;
    } catch (err) {
      tbody.innerHTML = `<tr class="text-danger"><td colspan="8" class="text-center py-4">Failed to load sales: ${err.message}</td></tr>`;
    }
  }

  function renderTable(list) {
    const tbody = document.getElementById('salesTableBody');

    if (!list || list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5 text-muted">
            <i class="fa-solid fa-receipt" style="font-size:28px; display:block; margin-bottom:8px;"></i>
            No sales transactions found matching query.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td><code>${s.invoice_number}</code></td>
        <td><small>${s.created_at}</small></td>
        <td>
          <strong>${s.customer_name}</strong>
          ${s.customer_phone ? `<div class="text-muted text-sm">${s.customer_phone}</div>` : ''}
        </td>
        <td>${s.doctor_prescription_id ? `<span class="badge badge-rx">${s.doctor_prescription_id}</span>` : '<span class="text-muted">None (OTC)</span>'}</td>
        <td><span class="badge badge-info">${s.payment_method}</span></td>
        <td>${s.item_count} items (${s.total_units} units)</td>
        <td><strong>Rs. ${s.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> ${s.discount_percent > 0 ? `<small class="text-success">(-${s.discount_percent}%)</small>` : ''}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-outline" onclick="SalesModule.viewReceipt(${s.id})">
            <i class="fa-solid fa-file-invoice-dollar"></i> View Receipt
          </button>
        </td>
      </tr>
    `).join('');
  }

  async function viewReceipt(id) {
    try {
      const res = await API.getSale(id);
      PosModule.showReceipt(res.data);
    } catch (err) {
      App.showToast(`Error viewing receipt: ${err.message}`, 'error');
    }
  }

  return {
    init,
    refresh: loadSales,
    viewReceipt
  };
})();

// ==============================================================
// Global Application Controller (Router, Theme, Toasts)
// ==============================================================
const App = (() => {
  const views = {
    dashboard: { title: 'Dashboard', sub: 'Overview of pharmacy inventory, metrics and alerts' },
    medicines: { title: 'Medicines Inventory', sub: 'Complete database catalogue with search, filter, sort and CRUD controls' },
    pos: { title: 'Point of Sale (POS)', sub: 'Fast dispensing counter, prescription validation, cart & instant receipt generation' },
    sales: { title: 'Sales & Invoices', sub: 'Accounting audit logs and historical transactions' },
    categories: { title: 'Drug Categories', sub: 'Therapeutic classifications & organized medical specialties' },
    suppliers: { title: 'Suppliers Directory', sub: 'Authorized pharmaceutical distributors and vendor partners' },
    reports: { title: 'Audit & Compliance', sub: 'Quarantine expired medicines, inspect near-expiry batches and print audit logs' }
  };

  let currentView = 'dashboard';

  function init() {
    setupNavigation();
    setupThemeToggle();
    setupMobileSidebar();

    // Initialize Sub-Modules
    DashboardModule.init();
    MedicinesModule.init();
    PosModule.init();
    SalesModule.init();
    CategoriesModule.init();
    SuppliersModule.init();

    // Show initial welcome toast
    setTimeout(() => {
      showToast('PharmaCare Pro System ready. Connected to persistent SQLite database.', 'success');
    }, 400);
  }

  function setupNavigation() {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        if (targetView) switchView(targetView);
      });
    });
  }

  function switchView(viewName) {
    if (!views[viewName]) return;

    currentView = viewName;

    // Update active nav button
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      if (btn.getAttribute('data-view') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update main header title & subtitle
    document.getElementById('pageHeadingTitle').textContent = views[viewName].title;
    document.getElementById('pageHeadingSubtitle').textContent = views[viewName].sub;

    // Toggle panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    const activePanel = document.getElementById(`view${capitalize(viewName)}`);
    if (activePanel) {
      activePanel.classList.add('active');
    }

    // Close mobile sidebar if open
    document.getElementById('sidebar').classList.remove('mobile-open');

    // Trigger view-specific refreshes
    if (viewName === 'dashboard') DashboardModule.refresh();
    if (viewName === 'medicines') MedicinesModule.refresh();
    if (viewName === 'pos') PosModule.loadCatalog();
    if (viewName === 'sales') SalesModule.refresh();
    if (viewName === 'categories') CategoriesModule.refresh();
    if (viewName === 'suppliers') SuppliersModule.refresh();
    if (viewName === 'reports') DashboardModule.refresh();
  }

  function setupThemeToggle() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const root = document.documentElement;

    const savedTheme = localStorage.getItem('pharmacare_theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nextTheme);
      localStorage.setItem('pharmacare_theme', nextTheme);
      updateThemeIcon(nextTheme);

      // Refresh charts with theme-matching background colors
      DashboardModule.refresh();
    });

    function updateThemeIcon(theme) {
      if (theme === 'dark') {
        themeIcon.className = 'fa-solid fa-sun';
        themeBtn.title = 'Switch to Light Mode';
      } else {
        themeIcon.className = 'fa-solid fa-moon';
        themeBtn.title = 'Switch to Dark Mode';
      }
    }
  }

  function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('mobileMenuBtn');
    const closeBtn = document.getElementById('mobileCloseBtn');

    openBtn.addEventListener('click', () => sidebar.classList.add('mobile-open'));
    closeBtn.addEventListener('click', () => sidebar.classList.remove('mobile-open'));
  }

  // Toast Notification System
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    let titleText = 'Notice';

    if (type === 'success') {
      iconClass = 'fa-circle-check';
      titleText = 'Success';
    } else if (type === 'error') {
      iconClass = 'fa-triangle-exclamation';
      titleText = 'Error';
    } else if (type === 'warning') {
      iconClass = 'fa-circle-exclamation';
      titleText = 'Warning';
    }

    toast.innerHTML = `
      <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
      <div class="toast-content">
        <div class="toast-title">${titleText}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss toast"><i class="fa-solid fa-xmark"></i></button>
    `;

    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('.toast-close').addEventListener('click', dismiss);
    container.appendChild(toast);

    setTimeout(dismiss, duration);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {
    init,
    switchView,
    showToast
  };
})();

// Boot application upon DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
