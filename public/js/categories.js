// Categories Management Module (CRUD)

const CategoriesModule = (() => {
  let categories = [];

  function init() {
    bindEvents();
    loadCategories();
  }

  function bindEvents() {
    document.getElementById('openAddCategoryModalBtn').addEventListener('click', openAddModal);
    document.getElementById('closeCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategoryModalBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('categoryForm').addEventListener('submit', handleSubmit);
  }

  async function loadCategories() {
    const container = document.getElementById('categoryCardsGrid');
    container.innerHTML = '<div class="text-center py-5 text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading drug categories...</div>';

    try {
      const response = await API.getCategories();
      categories = response.data;
      renderCards(categories);
    } catch (err) {
      container.innerHTML = `<div class="text-danger py-4 text-center">Failed to load categories: ${err.message}</div>`;
    }
  }

  function renderCards(list) {
    const container = document.getElementById('categoryCardsGrid');

    if (!list || list.length === 0) {
      container.innerHTML = '<div class="text-muted text-center py-5">No categories found. Click "Add New Category" to create one.</div>';
      return;
    }

    container.innerHTML = list.map(c => `
      <div class="cat-card">
        <div>
          <div class="cat-header">
            <div>
              <h4 class="cat-title">${c.name}</h4>
              <span class="badge badge-info mt-1"><i class="fa-solid fa-pills"></i> ${c.total_medicines} Registered Drugs</span>
            </div>
            <div class="table-actions">
              <button class="action-btn" onclick="CategoriesModule.openEditModal(${c.id})" title="Edit Category">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="action-btn delete-btn" onclick="CategoriesModule.deleteCategory(${c.id}, '${escapeQuotes(c.name)}')" title="Delete Category">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
          <p class="text-muted text-sm">${c.description || 'No description provided.'}</p>
        </div>
        <div class="cat-stats">
          <span><strong>${c.total_stock}</strong> Total Units in Stock</span>
          <span>Created: ${c.created_at ? c.created_at.slice(0, 10) : 'N/A'}</span>
        </div>
      </div>
    `).join('');
  }

  function openAddModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryFormId').value = '';
    document.getElementById('categoryModalTitle').textContent = 'Add Drug Category';
    document.getElementById('categoryModal').classList.add('active');
  }

  async function openEditModal(id) {
    try {
      const res = await API.request ? await API.request(`/categories/${id}`) : await fetch(`/api/categories/${id}`).then(r => r.json());
      const cat = res.data;

      document.getElementById('categoryFormId').value = cat.id;
      document.getElementById('categoryModalTitle').textContent = `Edit Category: ${cat.name}`;
      document.getElementById('categoryFormName').value = cat.name;
      document.getElementById('categoryFormDesc').value = cat.description || '';

      document.getElementById('categoryModal').classList.add('active');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('categoryFormId').value;
    const isEdit = Boolean(id);

    const name = document.getElementById('categoryFormName').value.trim();
    const description = document.getElementById('categoryFormDesc').value.trim();

    if (!name) {
      App.showToast('Category name is required.', 'warning');
      return;
    }

    try {
      if (isEdit) {
        await API.updateCategory(id, { name, description });
        App.showToast(`Category '${name}' updated successfully.`, 'success');
      } else {
        await API.createCategory({ name, description });
        App.showToast(`Category '${name}' created successfully.`, 'success');
      }
      closeCategoryModal();
      loadCategories();
      MedicinesModule.refresh();
      DashboardModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }

  async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"?\n\nIf any medicines are assigned to this category, deletion will be blocked.`)) {
      return;
    }

    try {
      const res = await API.deleteCategory(id);
      App.showToast(res.message, 'success');
      loadCategories();
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
    refresh: loadCategories,
    openEditModal,
    deleteCategory
  };
})();
