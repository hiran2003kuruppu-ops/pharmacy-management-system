// Medicines Management Module (CRUD, Search, Filter, Sort, Stock Adjust)

const MedicinesModule = (() => {
  let currentMedicines = [];
  let deleteCandidateId = null;
  let deleteCandidateName = '';

  // Filter state
  const state = {
    search: '',
    category_id: '',
    stock_status: '',
    expiry_status: '',
    sort_by: 'name',
    sort_order: 'asc',
    page: 1,
    limit: 15
  };

  function init() {
    bindEvents();
    loadMedicines();
  }

  function bindEvents() {
    // Search input with debounce
    const searchInput = document.getElementById('medSearchInput');
    const clearSearchBtn = document.getElementById('medClearSearchBtn');

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      state.search = e.target.value;
      clearSearchBtn.style.display = state.search ? 'block' : 'none';
      debounceTimer = setTimeout(() => {
        state.page = 1;
        loadMedicines();
      }, 300);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      state.search = '';
      clearSearchBtn.style.display = 'none';
      state.page = 1;
      loadMedicines();
    });

    // Category filter
    document.getElementById('medCategoryFilter').addEventListener('change', (e) => {
      state.category_id = e.target.value;
      state.page = 1;
      loadMedicines();
    });

    // Stock filter
    document.getElementById('medStockFilter').addEventListener('change', (e) => {
      state.stock_status = e.target.value;
      state.page = 1;
      loadMedicines();
    });

    // Expiry filter
    document.getElementById('medExpiryFilter').addEventListener('change', (e) => {
      state.expiry_status = e.target.value;
      state.page = 1;
      loadMedicines();
    });

    // Sort filter
    document.getElementById('medSortFilter').addEventListener('change', (e) => {
      const val = e.target.value;
      const parts = val.split('_');
      state.sort_order = parts.pop();
      state.sort_by = parts.join('_');
      state.page = 1;
      loadMedicines();
    });

    // Reset filters
    document.getElementById('resetMedFiltersBtn').addEventListener('click', resetFilters);

    // Pagination
    document.getElementById('medPrevPageBtn').addEventListener('click', () => {
      if (state.page > 1) {
        state.page--;
        loadMedicines();
      }
    });

    document.getElementById('medNextPageBtn').addEventListener('click', () => {
      state.page++;
      loadMedicines();
    });

    // Add Medicine Modal
    document.getElementById('openAddMedicineModalBtn').addEventListener('click', openAddModal);
    document.getElementById('quickAddMedBtn').addEventListener('click', () => {
      App.switchView('medicines');
      openAddModal();
    });

    document.getElementById('closeMedicineModalBtn').addEventListener('click', closeMedicineModal);
    document.getElementById('cancelMedicineModalBtn').addEventListener('click', closeMedicineModal);

    // Medicine Form Submit (Create or Update)
    document.getElementById('medicineForm').addEventListener('submit', handleMedicineFormSubmit);

    // Stock Modal
    document.getElementById('closeStockModalBtn').addEventListener('click', closeStockModal);
    document.getElementById('cancelStockModalBtn').addEventListener('click', closeStockModal);
    document.getElementById('stockForm').addEventListener('submit', handleStockFormSubmit);

    // Detail Modal
    document.getElementById('closeViewDetailsModalBtn').addEventListener('click', closeViewDetailsModal);
    document.getElementById('closeViewDetailsBtn').addEventListener('click', closeViewDetailsModal);

    // Delete Modal
    document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', executeSafeDelete);

    // Export CSV
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  }

  function resetFilters() {
    document.getElementById('medSearchInput').value = '';
    document.getElementById('medClearSearchBtn').style.display = 'none';
    document.getElementById('medCategoryFilter').value = '';
    document.getElementById('medStockFilter').value = '';
    document.getElementById('medExpiryFilter').value = '';
    document.getElementById('medSortFilter').value = 'name_asc';

    state.search = '';
    state.category_id = '';
    state.stock_status = '';
    state.expiry_status = '';
    state.sort_by = 'name';
    state.sort_order = 'asc';
    state.page = 1;

    loadMedicines();
  }

  async function loadMedicines() {
    const tableBody = document.getElementById('medicinesTableBody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5 text-muted">
          <i class="fa-solid fa-spinner fa-spin"></i> Fetching medicines catalog...
        </td>
      </tr>
    `;

    try {
      const response = await API.getMedicines({
        q: state.search,
        category_id: state.category_id,
        stock_status: state.stock_status,
        expiry_status: state.expiry_status,
        sort_by: state.sort_by,
        sort_order: state.sort_order,
        page: state.page,
        limit: state.limit
      });

      currentMedicines = response.data;
      renderTable(currentMedicines);
      updatePagination(response.pagination);

      // Update sidebar counter
      const totalCount = response.pagination.total;
      document.getElementById('badgeTotalMeds').textContent = totalCount;
      document.getElementById('medTableCount').textContent = `Showing ${currentMedicines.length} of ${totalCount} medicines`;
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-danger">
            <i class="fa-solid fa-triangle-exclamation"></i> Error loading inventory: ${err.message}
          </td>
        </tr>
      `;
      App.showToast('Failed to load medicines.', 'error');
    }
  }

  function renderTable(medicines) {
    const tableBody = document.getElementById('medicinesTableBody');

    if (!medicines || medicines.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5 text-muted">
            <i class="fa-solid fa-box-open" style="font-size: 28px; margin-bottom: 8px; display:block;"></i>
            No medicines match the selected filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = medicines.map(med => {
      // Stock badge
      let stockBadge = '';
      if (med.quantity_in_stock === 0) {
        stockBadge = `<span class="badge badge-danger">Out of Stock (0)</span>`;
      } else if (med.quantity_in_stock <= med.min_stock_threshold) {
        stockBadge = `<span class="badge badge-warning">Low Stock (${med.quantity_in_stock})</span>`;
      } else {
        stockBadge = `<span class="badge badge-success">${med.quantity_in_stock} Units</span>`;
      }

      // Expiry badge
      let expiryBadge = '';
      if (med.expiry_status === 'EXPIRED') {
        expiryBadge = `<span class="badge badge-danger" title="Expired ${Math.abs(med.days_until_expiry)} days ago"><i class="fa-solid fa-calendar-xmark"></i> Expired</span>`;
      } else if (med.expiry_status === 'EXPIRING_SOON') {
        expiryBadge = `<span class="badge badge-warning" title="${med.days_until_expiry} days remaining"><i class="fa-solid fa-clock"></i> Expiring Soon</span>`;
      } else {
        expiryBadge = `<span class="text-muted">${med.expiry_date}</span>`;
      }

      const rxBadge = med.requires_prescription === 1
        ? `<span class="badge badge-rx" title="Prescription Required by Law">Rx</span>`
        : `<span class="badge badge-neutral" title="Over-The-Counter (OTC)">OTC</span>`;

      return `
        <tr data-id="${med.id}">
          <td><code>${med.sku}</code></td>
          <td>
            <span class="table-brand-name">${med.name}</span>
            <span class="table-generic-name">${med.generic_name}</span>
          </td>
          <td>${med.category_name || '<span class="text-muted">Uncategorized</span>'}</td>
          <td>${med.dosage_form} (${med.strength})</td>
          <td><strong>$${med.unit_price.toFixed(2)}</strong></td>
          <td>${stockBadge}</td>
          <td>${expiryBadge}</td>
          <td>${rxBadge}</td>
          <td class="text-right">
            <div class="table-actions">
              <button class="action-btn" onclick="MedicinesModule.viewDetails(${med.id})" title="View Complete Details">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="action-btn" onclick="MedicinesModule.openStockModal(${med.id})" title="Adjust Stock">
                <i class="fa-solid fa-boxes-stacked"></i>
              </button>
              <button class="action-btn" onclick="MedicinesModule.openEditModal(${med.id})" title="Edit Medicine Record">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="action-btn delete-btn" onclick="MedicinesModule.confirmDelete(${med.id}, '${escapeQuotes(med.name)}')" title="Safely Delete Record">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function updatePagination(pagination) {
    const prevBtn = document.getElementById('medPrevPageBtn');
    const nextBtn = document.getElementById('medNextPageBtn');
    const pageBadge = document.getElementById('medCurrentPageNum');
    const infoText = document.getElementById('medPaginationInfo');

    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages || pagination.totalPages === 0;

    pageBadge.textContent = pagination.page;
    infoText.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1} (${pagination.total} total items)`;
  }

  // CREATE / EDIT Modal Logic
  async function openAddModal() {
    clearFormErrors();
    document.getElementById('medicineForm').reset();
    document.getElementById('medFormId').value = '';
    document.getElementById('medicineModalTitle').textContent = 'Add New Medicine';
    document.getElementById('medFormAlert').style.display = 'none';

    // Auto-generate suggested SKU
    const randomSkuNum = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('medFormSku').value = `MED-${randomSkuNum}`;

    // Populate category & supplier selects
    await populateDropdowns();

    document.getElementById('medicineModal').classList.add('active');
  }

  async function openEditModal(id) {
    clearFormErrors();
    document.getElementById('medFormAlert').style.display = 'none';

    try {
      const response = await API.getMedicine(id);
      const med = response.data;

      await populateDropdowns();

      document.getElementById('medFormId').value = med.id;
      document.getElementById('medicineModalTitle').textContent = `Edit Medicine: ${med.name}`;

      document.getElementById('medFormSku').value = med.sku;
      document.getElementById('medFormName').value = med.name;
      document.getElementById('medFormGeneric').value = med.generic_name;
      document.getElementById('medFormCategory').value = med.category_id;
      document.getElementById('medFormSupplier').value = med.supplier_id || '';
      document.getElementById('medFormDosage').value = med.dosage_form;
      document.getElementById('medFormStrength').value = med.strength;
      document.getElementById('medFormBatch').value = med.batch_number;
      document.getElementById('medFormExpiry').value = med.expiry_date;
      document.getElementById('medFormCostPrice').value = med.cost_price;
      document.getElementById('medFormUnitPrice').value = med.unit_price;
      document.getElementById('medFormQty').value = med.quantity_in_stock;
      document.getElementById('medFormMinStock').value = med.min_stock_threshold;
      document.getElementById('medFormRx').checked = med.requires_prescription === 1;
      document.getElementById('medFormDesc').value = med.description || '';

      document.getElementById('medicineModal').classList.add('active');
    } catch (err) {
      App.showToast(`Error retrieving medicine: ${err.message}`, 'error');
    }
  }

  function closeMedicineModal() {
    document.getElementById('medicineModal').classList.remove('active');
  }

  async function populateDropdowns() {
    try {
      const [catRes, supRes] = await Promise.all([API.getCategories(), API.getSuppliers()]);

      const catSelect = document.getElementById('medFormCategory');
      catSelect.innerHTML = '<option value="">Select Category...</option>' +
        catRes.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

      // Also update filter select if empty
      const filterCat = document.getElementById('medCategoryFilter');
      if (filterCat.options.length <= 1) {
        filterCat.innerHTML = '<option value="">All Categories</option>' +
          catRes.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }

      const supSelect = document.getElementById('medFormSupplier');
      supSelect.innerHTML = '<option value="">Select Supplier (Optional)...</option>' +
        supRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    } catch (err) {
      console.error('Error populating dropdowns:', err);
    }
  }

  // Client-side validation + submission
  async function handleMedicineFormSubmit(e) {
    e.preventDefault();
    clearFormErrors();

    const id = document.getElementById('medFormId').value;
    const isEdit = Boolean(id);

    const formData = {
      sku: document.getElementById('medFormSku').value.trim(),
      name: document.getElementById('medFormName').value.trim(),
      generic_name: document.getElementById('medFormGeneric').value.trim(),
      category_id: document.getElementById('medFormCategory').value,
      supplier_id: document.getElementById('medFormSupplier').value || null,
      dosage_form: document.getElementById('medFormDosage').value,
      strength: document.getElementById('medFormStrength').value.trim(),
      batch_number: document.getElementById('medFormBatch').value.trim(),
      expiry_date: document.getElementById('medFormExpiry').value,
      cost_price: parseFloat(document.getElementById('medFormCostPrice').value),
      unit_price: parseFloat(document.getElementById('medFormUnitPrice').value),
      quantity_in_stock: parseInt(document.getElementById('medFormQty').value, 10),
      min_stock_threshold: parseInt(document.getElementById('medFormMinStock').value, 10),
      requires_prescription: document.getElementById('medFormRx').checked ? 1 : 0,
      description: document.getElementById('medFormDesc').value.trim()
    };

    // Client-side Validation Checks
    let hasClientErrors = false;

    if (!formData.sku) {
      showFieldError('sku', 'SKU / Barcode is required.');
      hasClientErrors = true;
    }
    if (!formData.name) {
      showFieldError('name', 'Brand name is required.');
      hasClientErrors = true;
    }
    if (!formData.generic_name) {
      showFieldError('generic_name', 'Generic name is required.');
      hasClientErrors = true;
    }
    if (!formData.category_id) {
      showFieldError('category_id', 'Please select a drug category.');
      hasClientErrors = true;
    }
    if (!formData.strength) {
      showFieldError('strength', 'Strength/Potency is required.');
      hasClientErrors = true;
    }
    if (!formData.batch_number) {
      showFieldError('batch_number', 'Batch number is required.');
      hasClientErrors = true;
    }
    if (!formData.expiry_date) {
      showFieldError('expiry_date', 'Valid expiry date is required.');
      hasClientErrors = true;
    }
    if (isNaN(formData.cost_price) || formData.cost_price < 0) {
      showFieldError('cost_price', 'Cost price must be non-negative.');
      hasClientErrors = true;
    }
    if (isNaN(formData.unit_price) || formData.unit_price < 0) {
      showFieldError('unit_price', 'Selling price must be non-negative.');
      hasClientErrors = true;
    } else if (formData.unit_price < formData.cost_price) {
      showFieldError('unit_price', 'Selling price cannot be less than cost price.');
      hasClientErrors = true;
    }
    if (isNaN(formData.quantity_in_stock) || formData.quantity_in_stock < 0) {
      showFieldError('quantity_in_stock', 'Stock quantity cannot be negative.');
      hasClientErrors = true;
    }
    if (isNaN(formData.min_stock_threshold) || formData.min_stock_threshold < 0) {
      showFieldError('min_stock_threshold', 'Min threshold must be non-negative.');
      hasClientErrors = true;
    }

    if (hasClientErrors) return;

    const saveBtn = document.getElementById('saveMedicineSubmitBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
      if (isEdit) {
        await API.updateMedicine(id, formData);
        App.showToast(`'${formData.name}' was successfully updated.`, 'success');
      } else {
        await API.createMedicine(formData);
        App.showToast(`'${formData.name}' was successfully added to inventory.`, 'success');
      }

      closeMedicineModal();
      loadMedicines();
      DashboardModule.refresh();
    } catch (err) {
      if (err.errors) {
        // Display server-side validation error messages
        Object.entries(err.errors).forEach(([field, msg]) => {
          showFieldError(field, msg);
        });
      }
      const alertBox = document.getElementById('medFormAlert');
      alertBox.textContent = err.message || 'Failed to save record.';
      alertBox.style.display = 'block';
      App.showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  function showFieldError(field, msg) {
    const errorEl = document.getElementById(`err_${field}`);
    if (errorEl) errorEl.textContent = msg;

    const inputEl = document.getElementById(`medForm${capitalize(field)}`);
    if (inputEl) inputEl.classList.add('is-invalid');
  }

  function clearFormErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-control.is-invalid, .form-select.is-invalid').forEach(el => {
      el.classList.remove('is-invalid');
    });
  }

  // VIEW DETAILS MODAL
  async function viewDetails(id) {
    try {
      const response = await API.getMedicine(id);
      const med = response.data;

      document.getElementById('viewDetailName').textContent = med.name;
      document.getElementById('viewDetailGeneric').textContent = `${med.generic_name} • ${med.strength} (${med.dosage_form})`;

      let rxStatus = med.requires_prescription === 1
        ? '<span class="badge badge-rx">Prescription Required (Rx)</span>'
        : '<span class="badge badge-success">Over-the-Counter (OTC)</span>';

      let expiryAlert = med.expiry_status === 'EXPIRED'
        ? '<span class="badge badge-danger">Expired</span>'
        : med.expiry_status === 'EXPIRING_SOON'
        ? '<span class="badge badge-warning">Expiring Soon</span>'
        : '<span class="badge badge-success">Valid</span>';

      const adjustmentsHtml = med.adjustments && med.adjustments.length > 0
        ? med.adjustments.map(a => `
            <tr>
              <td><small>${a.created_at}</small></td>
              <td><span class="badge ${a.quantity > 0 ? 'badge-success' : 'badge-danger'}">${a.type}</span></td>
              <td><strong>${a.quantity > 0 ? `+${a.quantity}` : a.quantity}</strong></td>
              <td>${a.reason || 'N/A'}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="4" class="text-center text-muted">No stock adjustments logged.</td></tr>';

      document.getElementById('viewDetailBody').innerHTML = `
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-item-label">SKU / Barcode</span>
            <span class="detail-item-val"><code>${med.sku}</code></span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Therapeutic Category</span>
            <span class="detail-item-val">${med.category_name || 'N/A'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Unit Selling Price</span>
            <span class="detail-item-val text-primary">$${med.unit_price.toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Acquisition Cost</span>
            <span class="detail-item-val">$${med.cost_price.toFixed(2)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Current Stock on Hand</span>
            <span class="detail-item-val">${med.quantity_in_stock} Units (Min Threshold: ${med.min_stock_threshold})</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Batch & Expiry</span>
            <span class="detail-item-val">${med.batch_number} (Exp: ${med.expiry_date}) ${expiryAlert}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Regulatory Classification</span>
            <span class="detail-item-val">${rxStatus}</span>
          </div>
          <div class="detail-item">
            <span class="detail-item-label">Supplier Partner</span>
            <span class="detail-item-val">${med.supplier_name || 'Direct Procurement'} ${med.supplier_phone ? `(${med.supplier_phone})` : ''}</span>
          </div>
        </div>

        ${med.description ? `
          <div class="mb-3">
            <span class="detail-item-label">Clinical Indication / Description</span>
            <p class="text-muted mt-1">${med.description}</p>
          </div>
        ` : ''}

        <div class="form-section-header mt-3">Audit Trail: Recent Stock Adjustments</div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Units</th>
                <th>Reason / Invoice</th>
              </tr>
            </thead>
            <tbody>
              ${adjustmentsHtml}
            </tbody>
          </table>
        </div>
      `;

      document.getElementById('viewDetailsModal').classList.add('active');
    } catch (err) {
      App.showToast(`Error viewing details: ${err.message}`, 'error');
    }
  }

  function closeViewDetailsModal() {
    document.getElementById('viewDetailsModal').classList.remove('active');
  }

  // QUICK STOCK ADJUSTMENT MODAL
  async function openStockModal(id) {
    try {
      const response = await API.getMedicine(id);
      const med = response.data;

      document.getElementById('stockMedId').value = med.id;
      document.getElementById('stockModalMedName').textContent = `${med.name} (${med.dosage_form})`;
      document.getElementById('stockCurrentDisplay').textContent = `${med.quantity_in_stock} units`;
      document.getElementById('stockAdjQty').value = '';
      document.getElementById('stockAdjReason').value = '';
      document.getElementById('stockAdjType').value = 'Restock';

      document.getElementById('stockModal').classList.add('active');
    } catch (err) {
      App.showToast(`Error opening stock adjustment: ${err.message}`, 'error');
    }
  }

  function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
  }

  async function handleStockFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('stockMedId').value;
    const type = document.getElementById('stockAdjType').value;
    const quantity = parseInt(document.getElementById('stockAdjQty').value, 10);
    const reason = document.getElementById('stockAdjReason').value.trim();

    try {
      const response = await API.adjustStock(id, { type, quantity, reason });
      App.showToast(response.message, 'success');
      closeStockModal();
      loadMedicines();
      DashboardModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  // SAFE DELETE CONFIRMATION MODAL
  function confirmDelete(id, name) {
    deleteCandidateId = id;
    deleteCandidateName = name;
    document.getElementById('deleteTargetText').textContent = `Record ID #${id}: "${name}"`;
    document.getElementById('deleteConfirmModal').classList.add('active');
  }

  function closeDeleteModal() {
    deleteCandidateId = null;
    deleteCandidateName = '';
    document.getElementById('deleteConfirmModal').classList.remove('active');
  }

  async function executeSafeDelete() {
    if (!deleteCandidateId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const origText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking safety & deleting...';

    try {
      const response = await API.deleteMedicine(deleteCandidateId);
      App.showToast(response.message, 'success');
      closeDeleteModal();
      loadMedicines();
      DashboardModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
      closeDeleteModal();
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = origText;
    }
  }

  // EXPORT CURRENT LIST TO CSV
  function exportToCSV() {
    if (!currentMedicines || currentMedicines.length === 0) {
      App.showToast('No medicines available to export.', 'warning');
      return;
    }

    const headers = ['SKU', 'Brand Name', 'Generic Name', 'Category', 'Dosage Form', 'Strength', 'Cost Price', 'Selling Price', 'Stock Level', 'Min Threshold', 'Batch', 'Expiry Date', 'Prescription Required'];

    const rows = currentMedicines.map(m => [
      `"${m.sku}"`,
      `"${m.name}"`,
      `"${m.generic_name}"`,
      `"${m.category_name || ''}"`,
      `"${m.dosage_form}"`,
      `"${m.strength}"`,
      m.cost_price,
      m.unit_price,
      m.quantity_in_stock,
      m.min_stock_threshold,
      `"${m.batch_number}"`,
      m.expiry_date,
      m.requires_prescription ? 'Yes' : 'No'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmaCare_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('Inventory exported to CSV successfully.', 'info');
  }

  // Helper utilities
  function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'");
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {
    init,
    refresh: loadMedicines,
    viewDetails,
    openAddModal,
    openEditModal,
    openStockModal,
    confirmDelete
  };
})();
