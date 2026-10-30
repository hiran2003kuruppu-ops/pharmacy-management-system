// Dashboard Module (KPI Cards, Charts, Critical Alerts, Audit Tables)

const DashboardModule = (() => {
  let categoryChartInstance = null;
  let salesTrendChartInstance = null;

  function init() {
    bindEvents();
    loadDashboard();
  }

  function bindEvents() {
    document.getElementById('dashViewAllMedsBtn').addEventListener('click', () => {
      App.switchView('medicines');
    });
  }

  async function loadDashboard() {
    try {
      const response = await API.getDashboard();
      const { inventory, sales, categoryBreakdown, criticalAlerts, recentSales } = response.data;

      // 1. Populate KPI Metrics
      document.getElementById('kpiTotalMedicines').textContent = inventory.total_medicines || 0;
      document.getElementById('kpiTotalUnits').textContent = `${(inventory.total_units || 0).toLocaleString()} units in warehouse`;

      document.getElementById('kpiInventoryValue').textContent = `$${(inventory.total_retail_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('kpiInventoryCost').textContent = `Cost: $${(inventory.total_cost_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      document.getElementById('kpiLowStock').textContent = inventory.low_stock_count || 0;
      document.getElementById('kpiOutOfStock').textContent = inventory.out_of_stock_count || 0;

      const totalAlertExpiry = (inventory.expired_count || 0) + (inventory.near_expiry_count || 0);
      document.getElementById('kpiExpiredCount').textContent = totalAlertExpiry;
      document.getElementById('kpiNearExpiryHint').textContent = `${inventory.near_expiry_count || 0} expiring within 30 days (${inventory.expired_count || 0} expired)`;

      document.getElementById('kpiTodayRevenue').textContent = `$${(sales.today_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      document.getElementById('kpiTodayOrders').textContent = `${sales.today_orders || 0} sales recorded today`;

      // 2. Render Charts
      renderCategoryChart(categoryBreakdown);
      renderSalesChart(recentSales);

      // 3. Render Critical Attention Alerts Table
      renderAlertsTable(criticalAlerts);

      // 4. Also refresh Expiry & Quarantine View tables
      renderExpiryComplianceTables();
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
    }
  }

  function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (categoryChartInstance) {
      categoryChartInstance.destroy();
    }

    if (!data || data.length === 0) {
      return;
    }

    const labels = data.map(d => d.category_name);
    const counts = data.map(d => d.medicine_count);

    const colors = [
      '#0d9488', '#2563eb', '#8b5cf6', '#f59e0b',
      '#10b981', '#ec4899', '#06b6d4', '#64748b'
    ];

    categoryChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: counts,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 11 },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#475569'
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  function renderSalesChart(data) {
    const ctx = document.getElementById('salesTrendChart').getContext('2d');

    if (salesTrendChartInstance) {
      salesTrendChartInstance.destroy();
    }

    // Default 7 days data if empty
    const labels = (data && data.length > 0)
      ? data.map(d => d.sale_date)
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const totals = (data && data.length > 0)
      ? data.map(d => d.daily_total)
      : [35, 60, 42, 85, 95, 120, 110];

    salesTrendChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue ($)',
          data: totals,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `$${value}`,
              font: { family: 'Inter', size: 11 },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
            },
            grid: {
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#334155' : '#f1f5f9'
            }
          },
          x: {
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b'
            },
            grid: { display: false }
          }
        }
      }
    });
  }

  function renderAlertsTable(alerts) {
    const tbody = document.getElementById('dashAlertsTableBody');

    if (!alerts || alerts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-success">
            <i class="fa-solid fa-circle-check"></i> All inventory stock levels and expiry schedules are in good standing!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = alerts.map(med => {
      let alertBadge = '';
      if (med.alert_reason === 'EXPIRED') {
        alertBadge = `<span class="badge badge-danger"><i class="fa-solid fa-calendar-xmark"></i> Expired</span>`;
      } else if (med.alert_reason === 'OUT_OF_STOCK') {
        alertBadge = `<span class="badge badge-danger"><i class="fa-solid fa-ban"></i> Out of Stock</span>`;
      } else if (med.alert_reason === 'EXPIRING_SOON') {
        alertBadge = `<span class="badge badge-warning"><i class="fa-solid fa-clock"></i> Expiring Soon</span>`;
      } else {
        alertBadge = `<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Low Stock</span>`;
      }

      return `
        <tr>
          <td><code>${med.sku}</code></td>
          <td><strong>${med.name}</strong></td>
          <td class="text-muted">${med.generic_name}</td>
          <td><strong>${med.quantity_in_stock}</strong> / ${med.min_stock_threshold} min</td>
          <td>${med.expiry_date}</td>
          <td>${alertBadge}</td>
          <td>
            <button class="btn btn-sm btn-outline" onclick="MedicinesModule.openStockModal(${med.id})">
              <i class="fa-solid fa-boxes-stacked"></i> Restock
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function renderExpiryComplianceTables() {
    try {
      const [expiredRes, nearExpiryRes] = await Promise.all([
        API.getMedicines({ expiry_status: 'expired', limit: 20 }),
        API.getMedicines({ expiry_status: 'near_expiry', limit: 20 })
      ]);

      const expiredTable = document.getElementById('expiredTableBody');
      if (expiredRes.data.length === 0) {
        expiredTable.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-success"><i class="fa-solid fa-circle-check"></i> No expired items detected in pharmacy.</td></tr>';
      } else {
        expiredTable.innerHTML = expiredRes.data.map(m => `
          <tr>
            <td><code>${m.sku}</code></td>
            <td><strong>${m.name}</strong></td>
            <td>${m.batch_number}</td>
            <td class="text-danger font-weight-bold">${m.expiry_date}</td>
            <td><span class="badge badge-danger">${Math.abs(m.days_until_expiry)} days expired</span></td>
            <td><strong>${m.quantity_in_stock} units</strong></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="MedicinesModule.openStockModal(${m.id})">
                <i class="fa-solid fa-ban"></i> Quarantine Stock
              </button>
            </td>
          </tr>
        `).join('');
      }

      const nearExpiryTable = document.getElementById('expiringSoonTableBody');
      if (nearExpiryRes.data.length === 0) {
        nearExpiryTable.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-success"><i class="fa-solid fa-circle-check"></i> No items expiring within the next 30 days.</td></tr>';
      } else {
        nearExpiryTable.innerHTML = nearExpiryRes.data.map(m => `
          <tr>
            <td><code>${m.sku}</code></td>
            <td><strong>${m.name}</strong></td>
            <td>${m.category_name || 'N/A'}</td>
            <td>${m.batch_number}</td>
            <td>${m.expiry_date}</td>
            <td><span class="badge badge-warning">${m.days_until_expiry} days left</span></td>
            <td><strong>${m.quantity_in_stock} units</strong></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="MedicinesModule.viewDetails(${m.id})">
                <i class="fa-solid fa-eye"></i> View
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Error rendering compliance tables:', err);
    }
  }

  return {
    init,
    refresh: loadDashboard
  };
})();
