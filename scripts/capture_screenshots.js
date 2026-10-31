const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_DIR = path.join(__dirname, '..', 'public', 'assets');
const DOCS_DIR = path.join(__dirname, '..', 'docs', 'assets');

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function capture() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768'],
    defaultViewport: { width: 1280, height: 750 }
  });

  const page = await browser.newPage();

  // Helper to save to both public/assets and docs/assets
  async function takeShot(filename) {
    const pubPath = path.join(TARGET_DIR, filename);
    const docPath = path.join(DOCS_DIR, filename);
    await page.screenshot({ path: pubPath, type: 'png' });
    fs.copyFileSync(pubPath, docPath);
    console.log(`Saved screenshot: ${filename}`);
  }

  try {
    // 1. Dashboard
    console.log('Capturing 1. Dashboard...');
    await page.goto('http://localhost:3000/#dashboard', { waitUntil: 'networkidle0' });
    await sleep(1500); // Chart.js render
    await takeShot('fig5_dashboard.png');

    // 2. Inventory Catalog
    console.log('Capturing 2. Inventory Catalog...');
    await page.evaluate(() => App.switchView('medicines'));
    await sleep(800);
    await takeShot('fig6_inventory.png');

    // 3. Search filtered inventory
    console.log('Capturing 3. Search Filtered Inventory...');
    await page.type('#medSearchInput', 'Amox');
    await sleep(600);
    await takeShot('fig6_search.png');
    // Clear search
    await page.evaluate(() => {
      document.getElementById('medSearchInput').value = '';
      MedicinesModule.refresh();
    });
    await sleep(500);

    // 4. View Details Modal
    console.log('Capturing 4. Medicine Details Modal...');
    await page.evaluate(() => MedicinesModule.viewDetails(1));
    await sleep(800);
    await takeShot('fig7_details.png');
    // Close modal
    await page.evaluate(() => {
      const modal = document.getElementById('viewDetailsModal');
      if (modal) modal.classList.remove('active');
    });
    await sleep(400);

    // 5. Add Medicine Form
    console.log('Capturing 5. Add Medicine Form...');
    await page.evaluate(() => MedicinesModule.openAddModal());
    await sleep(800);
    await takeShot('fig8_addmed.png');
    // Close modal
    await page.evaluate(() => {
      const modal = document.getElementById('medModal');
      if (modal) modal.classList.remove('active');
    });
    await sleep(400);

    // 6. Stock Adjustment Modal
    console.log('Capturing 6. Stock Adjustment Modal...');
    await page.evaluate(() => MedicinesModule.openStockModal(1));
    await sleep(800);
    await takeShot('fig8_stockadj.png');
    // Close modal
    await page.evaluate(() => {
      const modal = document.getElementById('stockModal');
      if (modal) modal.classList.remove('active');
    });
    await sleep(400);

    // 7. Point of Sale (POS) Counter
    console.log('Capturing 7. POS Counter...');
    await page.evaluate(() => App.switchView('pos'));
    await sleep(800);
    // Add two items to cart by clicking the catalog cards
    await page.evaluate(() => {
      const addBtns = document.querySelectorAll('.pos-catalog-card');
      if (addBtns.length > 0) addBtns[0].click();
      if (addBtns.length > 1) addBtns[1].click();
    });
    await sleep(600);
    await takeShot('fig9_pos.png');

    // 8. Receipt Modal
    console.log('Capturing 8. Receipt Modal...');
    await page.evaluate(() => {
      const rxInput = document.getElementById('posPrescriptionId');
      if (rxInput) rxInput.value = 'SLMC-94218';
      const custInput = document.getElementById('posCustomerName');
      if (custInput) custInput.value = 'Nimal Perera';
      const phoneInput = document.getElementById('posCustomerPhone');
      if (phoneInput) phoneInput.value = '0771234567';
      const btn = document.getElementById('posCheckoutBtn');
      if (btn) btn.click();
    });
    await sleep(1500);
    await takeShot('fig10_receipt.png');
    // Close modal
    await page.evaluate(() => {
      const modal = document.getElementById('receiptModal');
      if (modal) modal.classList.remove('active');
    });
    await sleep(400);

    // 9. Categories Directory
    console.log('Capturing 9. Categories Directory...');
    await page.evaluate(() => App.switchView('categories'));
    await sleep(800);
    await takeShot('fig11_categories.png');

    // 10. Suppliers Directory
    console.log('Capturing 10. Suppliers Directory...');
    await page.evaluate(() => App.switchView('suppliers'));
    await sleep(800);
    await takeShot('fig11_suppliers.png');

    // 11. Sales & Invoices History
    console.log('Capturing 11. Sales History...');
    await page.evaluate(() => App.switchView('sales'));
    await sleep(800);
    await takeShot('fig12_sales.png');

    // 12. Dark Mode View
    console.log('Capturing 12. Dark Mode View...');
    await page.evaluate(() => {
      App.switchView('dashboard');
      document.getElementById('themeToggleBtn').click();
    });
    await sleep(1200);
    await takeShot('fig13_darkmode.png');

    console.log('ALL 12 REAL SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

capture();
