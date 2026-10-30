// Point of Sale (POS) & Dispensation Module

const PosModule = (() => {
  let cart = []; // Array of { medicine, quantity }
  let availableCatalog = [];
  let currentCategory = '';
  let searchQuery = '';

  function init() {
    bindEvents();
  }

  function bindEvents() {
    // Quick POS Button
    document.getElementById('quickPosBtn').addEventListener('click', () => {
      App.switchView('pos');
    });

    // POS Search
    const posSearch = document.getElementById('posSearchInput');
    let debounce;
    posSearch.addEventListener('input', (e) => {
      clearTimeout(debounce);
      searchQuery = e.target.value.toLowerCase();
      debounce = setTimeout(() => filterAndRenderCatalog(), 250);
    });

    // Clear Cart Button
    document.getElementById('posClearCartBtn').addEventListener('click', clearCart);

    // Discount percentage change
    document.getElementById('posDiscountInput').addEventListener('input', calculateTotals);

    // Checkout button
    document.getElementById('posCheckoutBtn').addEventListener('click', handleCheckout);

    // Receipt Modal Close & Print
    document.getElementById('closeReceiptModalBtn').addEventListener('click', closeReceiptModal);
    document.getElementById('closeReceiptBtn').addEventListener('click', closeReceiptModal);
    document.getElementById('printReceiptBtn').addEventListener('click', () => window.print());
  }

  async function loadCatalog() {
    try {
      const response = await API.getMedicines({ limit: 100 });
      availableCatalog = response.data;

      // Populate Category Pills
      const catRes = await API.getCategories();
      const pillsContainer = document.getElementById('posCategoryPills');
      pillsContainer.innerHTML = `<button class="pill-btn ${currentCategory === '' ? 'active' : ''}" data-cat="">All</button>` +
        catRes.data.map(c => `
          <button class="pill-btn ${currentCategory == c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
        `).join('');

      pillsContainer.querySelectorAll('.pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          pillsContainer.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentCategory = btn.getAttribute('data-cat');
          filterAndRenderCatalog();
        });
      });

      filterAndRenderCatalog();
    } catch (err) {
      console.error('Error loading POS catalog:', err);
    }
  }

  function filterAndRenderCatalog() {
    const grid = document.getElementById('posItemsGrid');

    let filtered = availableCatalog;

    if (currentCategory) {
      filtered = filtered.filter(m => String(m.category_id) === String(currentCategory));
    }

    if (searchQuery) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(searchQuery) ||
        m.generic_name.toLowerCase().includes(searchQuery) ||
        m.sku.toLowerCase().includes(searchQuery)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          No drugs match your search query.
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(med => {
      const isOutOfStock = med.quantity_in_stock <= 0;
      const isRx = med.requires_prescription === 1;

      return `
        <div class="pos-item-card ${isOutOfStock ? 'out-of-stock' : ''}" onclick="PosModule.addToCart(${med.id})">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="pos-item-sku">${med.sku}</span>
              ${isRx ? '<span class="badge badge-rx" style="padding:1px 5px; font-size:10px;">Rx</span>' : ''}
            </div>
            <div class="pos-item-name">${med.name}</div>
            <div class="pos-item-generic">${med.dosage_form} • ${med.strength}</div>
          </div>
          <div class="pos-item-footer">
            <span class="pos-item-price">$${med.unit_price.toFixed(2)}</span>
            <span class="pos-item-stock-tag ${isOutOfStock ? 'text-danger' : ''}">
              ${isOutOfStock ? 'Out of stock' : `${med.quantity_in_stock} in stock`}
            </span>
          </div>
        </div>
      `;
    }).join('');
  }

  function addToCart(medId) {
    const medicine = availableCatalog.find(m => m.id === medId);
    if (!medicine) return;

    if (medicine.quantity_in_stock <= 0) {
      App.showToast(`Cannot add '${medicine.name}' - zero stock available.`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.medicine.id === medId);
    if (existingIndex > -1) {
      if (cart[existingIndex].quantity + 1 > medicine.quantity_in_stock) {
        App.showToast(`Only ${medicine.quantity_in_stock} unit(s) available in stock.`, 'warning');
        return;
      }
      cart[existingIndex].quantity++;
    } else {
      cart.push({ medicine, quantity: 1 });
    }

    renderCart();
  }

  function updateItemQuantity(medId, delta) {
    const item = cart.find(i => i.medicine.id === medId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(medId);
      return;
    }

    if (newQty > item.medicine.quantity_in_stock) {
      App.showToast(`Cannot add more than ${item.medicine.quantity_in_stock} available units.`, 'warning');
      return;
    }

    item.quantity = newQty;
    renderCart();
  }

  function removeFromCart(medId) {
    cart = cart.filter(i => i.medicine.id !== medId);
    renderCart();
  }

  function clearCart() {
    cart = [];
    document.getElementById('posCustomerName').value = '';
    document.getElementById('posCustomerPhone').value = '';
    document.getElementById('posDoctorRx').value = '';
    document.getElementById('posDiscountInput').value = '0';
    renderCart();
  }

  function renderCart() {
    const container = document.getElementById('posCartItemsList');
    const checkoutBtn = document.getElementById('posCheckoutBtn');

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="empty-cart-state">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>Cart is currently empty.</p>
          <span class="text-muted">Select medicines from the catalog to dispense.</span>
        </div>
      `;
      checkoutBtn.disabled = true;
      calculateTotals();
      return;
    }

    checkoutBtn.disabled = false;

    // Check if any cart item requires a prescription
    const hasRxItem = cart.some(i => i.medicine.requires_prescription === 1);
    const rxLabel = document.getElementById('rxLabel');
    if (hasRxItem) {
      rxLabel.classList.add('required');
    } else {
      rxLabel.classList.remove('required');
    }

    container.innerHTML = cart.map(item => {
      const med = item.medicine;
      const subtotal = med.unit_price * item.quantity;

      return `
        <div class="cart-row">
          <div class="cart-item-info">
            <div class="cart-item-title">${med.name} ${med.requires_prescription ? '<span class="badge badge-rx" style="padding:1px 4px; font-size:9px;">Rx</span>' : ''}</div>
            <div class="cart-item-meta">$${med.unit_price.toFixed(2)} each</div>
          </div>
          <div class="cart-qty-controls">
            <button class="qty-btn" onclick="PosModule.updateItemQuantity(${med.id}, -1)">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="PosModule.updateItemQuantity(${med.id}, 1)">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div class="cart-item-total">$${subtotal.toFixed(2)}</div>
          <button class="cart-item-remove" onclick="PosModule.removeFromCart(${med.id})" title="Remove item">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
    }).join('');

    calculateTotals();
  }

  function calculateTotals() {
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.medicine.unit_price * item.quantity;
    });

    const discountInput = document.getElementById('posDiscountInput');
    let discountPct = parseFloat(discountInput.value) || 0;
    if (discountPct < 0) discountPct = 0;
    if (discountPct > 100) discountPct = 100;

    const discountAmount = (subtotal * discountPct) / 100;
    const grandTotal = Math.max(0, subtotal - discountAmount);

    document.getElementById('posSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('posGrandTotal').textContent = `$${grandTotal.toFixed(2)}`;

    return { subtotal, discountPct, discountAmount, grandTotal };
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      App.showToast('Please add medicines to the cart before checkout.', 'warning');
      return;
    }

    const customerName = document.getElementById('posCustomerName').value.trim();
    if (!customerName) {
      App.showToast('Customer name is required for dispensary records.', 'warning');
      document.getElementById('posCustomerName').focus();
      return;
    }

    const customerPhone = document.getElementById('posCustomerPhone').value.trim();
    const doctorRx = document.getElementById('posDoctorRx').value.trim();
    const paymentMethod = document.getElementById('posPaymentMethod').value;
    const discountPercent = parseFloat(document.getElementById('posDiscountInput').value) || 0;

    // Check if Rx item present without Rx ID
    const hasRxItem = cart.some(i => i.medicine.requires_prescription === 1);
    if (hasRxItem && !doctorRx) {
      App.showToast('Prescription ID is required for prescription-only medications.', 'error');
      document.getElementById('posDoctorRx').focus();
      return;
    }

    const checkoutBtn = document.getElementById('posCheckoutBtn');
    const origText = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Transaction...';

    const payload = {
      customer_name: customerName,
      customer_phone: customerPhone,
      doctor_prescription_id: doctorRx,
      discount_percent: discountPercent,
      payment_method: paymentMethod,
      items: cart.map(item => ({
        medicine_id: item.medicine.id,
        quantity: item.quantity
      }))
    };

    try {
      const response = await API.createSale(payload);
      App.showToast('Sale transaction completed successfully!', 'success');

      // Show Official Printable Receipt
      showReceipt(response.data);

      // Reset cart and reload catalog stock
      clearCart();
      await loadCatalog();
      DashboardModule.refresh();
      MedicinesModule.refresh();
      SalesModule.refresh();
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = origText;
    }
  }

  function showReceipt(saleData) {
    document.getElementById('receiptInvoiceNum').textContent = saleData.invoice_number;

    const receiptDate = new Date().toLocaleString();

    document.getElementById('receiptPrintArea').innerHTML = `
      <div class="receipt-box">
        <div class="receipt-header">
          <div class="receipt-logo">🏥 PHARMACARE PRO</div>
          <div>Licensed Community Pharmacy</div>
          <div>100 Health Science Avenue, City</div>
          <div>Phone: +1 (555) 0199 • Tax ID: PH-992144</div>
          <div style="margin-top: 8px;"><strong>DISPENSATION RECEIPT / INVOICE</strong></div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom: 8px;">
          <div>
            <div><strong>Invoice:</strong> ${saleData.invoice_number}</div>
            <div><strong>Customer:</strong> ${saleData.customer_name}</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Date:</strong> ${receiptDate}</div>
            <div><strong>Payment:</strong> ${saleData.payment_method}</div>
            ${saleData.doctor_prescription_id ? `<div><strong>Prescription Rx:</strong> ${saleData.doctor_prescription_id}</div>` : ''}
          </div>
        </div>

        <table class="receipt-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${saleData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">$${item.unit_price.toFixed(2)}</td>
                <td style="text-align:right;">$${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="receipt-totals">
          <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
            <span>Subtotal:</span>
            <span>$${saleData.subtotal.toFixed(2)}</span>
          </div>
          ${saleData.discount_percent > 0 ? `
            <div style="display:flex; justify-content:space-between; margin-bottom: 4px; color: green;">
              <span>Discount (${saleData.discount_percent}%):</span>
              <span>-$${((saleData.subtotal * saleData.discount_percent) / 100).toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display:flex; justify-content:space-between; font-size: 15px; font-weight: 800; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px;">
            <span>TOTAL PAID:</span>
            <span>$${saleData.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div style="text-align:center; font-size:10px; margin-top: 20px; color: #4b5563; border-top: 1px dashed #d1d5db; padding-top: 10px;">
          <div>Keep this receipt for your records and health insurance claims.</div>
          <div>Thank you for choosing PharmaCare! Get well soon!</div>
        </div>
      </div>
    `;

    document.getElementById('receiptModal').classList.add('active');
  }

  function closeReceiptModal() {
    document.getElementById('receiptModal').classList.remove('active');
  }

  return {
    init,
    loadCatalog,
    addToCart,
    updateItemQuantity,
    removeFromCart,
    showReceipt
  };
})();
