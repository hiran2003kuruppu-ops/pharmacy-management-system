// Suppliers Directory Module (CRUD)

const SuppliersModule = (() => {
  let suppliers = [];

  function init() {
    bindEvents();
    loadSuppliers();
  }

  function bindEvents() {
    document.getElementById('openAddSupplierModalBtn').addEventListener('click', openAddModal);
    document.getElementById('closeSupplierModalBtn').addEventListener('click', closeSupplierModal);
    document.getElementById('cancelSupplierModalBtn').addEventListener('click', closeSupplierModal);
    document.getElementById('supplierForm').addEventListener('submit', handleSubmit);
  }

  async function loadSuppliers() {
    const container = document.getElementById('suppliersCardsGrid');
    container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading suppliers directory...</div>';

    try {
      const response = await API.getSuppliers();
      suppliers = response.data;
      renderCards(suppliers);
    } catch (err) {
      container.innerHTML = `<div class="text-danger py-4 text-center">Failed to load suppliers: ${err.message}</div>`;
    }
  }

  function renderCards(list) {
    const container = document.getElementById('suppliersCardsGrid');

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-muted text-center py-5">No suppliers registered. Click "Add New Supplier" to add one.</div>';
      return;
    }

    container.innerHTML = list.map(s => `
      <div class="sup-card">
        <div>
          <div class="sup-header">
            <div>
              <h4 class="sup-title">${s.name}</h4>
              <span class="badge badge-teal mt-1"><i class="fa-solid fa-boxes-packing"></i> ${s.total_products_supplied} Active Products</span>
            </div>
            <div class="table-actions">
              <button class="action-btn" onclick="SuppliersModule.openEditModal(${s.id})" title="Edit Supplier">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="action-btn delete-btn" onclick="SuppliersModule.deleteSupplier(${s.id}, '${escapeQuotes(s.name)}')" title="Delete Supplier">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <div class="mt-2 text-sm">
            ${s.contact_person ? `<div><i class="fa-solid fa-user-tie text-muted"></i> <strong>Contact:</strong> ${s.contact_person}</div>` : ''}
            <div><i class="fa-solid fa-phone text-muted"></i> <strong>Phone:</strong> <a href="tel:${s.phone}">${s.phone}</a></div>
            ${s.email ? `<div><i class="fa-solid fa-envelope text-muted"></i> <strong>Email:</strong> <a href="mailto:${s.email}">${s.email}</a></div>` : ''}
            ${s.address ? `<div class="text-muted mt-1"><i class="fa-solid fa-location-dot"></i> ${s.address}</div>` : ''}
          </div>
        </div>
        <div class="sup-stats">
          <span>Registered: ${s.created_at ? s.created_at.slice(0, 10) : 'N/A'}</span>
        </div>
      </div>
    `).join('');
  }

  function openAddModal() {
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierFormId').value = '';
    document.getElementById('supplierModalTitle').textContent = 'Add Pharmaceutical Supplier';
    document.getElementById('supplierModal').classList.add('active');
  }

  async function openEditModal(id) {
    try {
      const res = await API.getSupplier(id);
      const sup = res.data;

      document.getElementById('supplierFormId').value = sup.id;
      document.getElementById('supplierModalTitle').textContent = `Edit Supplier: ${sup.name}`;
      document.getElementById('supplierFormName').value = sup.name;
      document.getElementById('supplierFormContact').value = sup.contact_person || '';
      document.getElementById('supplierFormPhone').value = sup.phone || '';
      document.getElementById('supplierFormEmail').value = sup.email || '';
      document.getElementById('supplierFormAddress').value = sup.address || '';

      document.getElementById('supplierModal').classList.add('active');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  function closeSupplierModal() {
    document.getElementById('supplierModal').classList.remove('active');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('supplierFormId').value;
    const isEdit = Boolean(id);

    const formData = {
      name: document.getElementById('supplierFormName').value.trim(),
      contact_person: document.getElementById('supplierFormContact').value.trim(),
      phone: document.getElementById('supplierFormPhone').value.trim(),
      email: document.getElementById('supplierFormEmail').value.trim(),
      address: document.getElementById('supplierFormAddress').value.trim()
    };

    if (!formData.name) {
      App.showToast('Supplier company name is required.', 'warning');
      return;
    }
    if (!formData.phone) {
      App.showToast('Contact phone number is required.', 'warning');
      return;
    }

    try {
      if (isEdit) {
        await API.updateSupplier(id, formData);
        App.showToast(`Supplier '${formData.name}' updated successfully.`, 'success');
      } else {
        await API.createSupplier(formData);
        App.showToast(`Supplier '${formData.name}' added successfully.`, 'success');
      }
      closeSupplierModal();
      loadSuppliers();
      MedicinesModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  async function deleteSupplier(id, name) {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?\n\nAny medicines linked to this supplier will have supplier set to None without being deleted.`)) {
      return;
    }

    try {
      const res = await API.deleteSupplier(id);
      App.showToast(res.message, 'success');
      loadSuppliers();
      MedicinesModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  function escapeQuotes(str) {
    return (str || '').replace(/'/g, "\\'");
  }

  return {
    init,
    refresh: loadSuppliers,
    openEditModal,
    deleteSupplier
  };
})();
