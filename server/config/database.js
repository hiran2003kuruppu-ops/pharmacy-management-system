const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pharmacy.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency and integrity
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers table
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Medicines table
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      generic_name TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      dosage_form TEXT NOT NULL,
      strength TEXT NOT NULL,
      cost_price REAL NOT NULL CHECK(cost_price >= 0),
      unit_price REAL NOT NULL CHECK(unit_price >= cost_price),
      quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK(quantity_in_stock >= 0),
      min_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK(min_stock_threshold >= 0),
      expiry_date DATE NOT NULL,
      batch_number TEXT NOT NULL,
      requires_prescription INTEGER NOT NULL DEFAULT 0 CHECK(requires_prescription IN (0, 1)),
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      doctor_prescription_id TEXT,
      subtotal REAL NOT NULL CHECK(subtotal >= 0),
      discount_percent REAL NOT NULL DEFAULT 0 CHECK(discount_percent >= 0 AND discount_percent <= 100),
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('Cash', 'Card', 'Online', 'Insurance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale items table
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      unit_price REAL NOT NULL CHECK(unit_price >= 0),
      subtotal REAL NOT NULL CHECK(subtotal >= 0)
    );

    -- Stock adjustments log table
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('Restock', 'Damaged', 'Expired', 'Correction')),
      quantity INTEGER NOT NULL,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance optimization
    CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
    CREATE INDEX IF NOT EXISTS idx_medicines_generic ON medicines(generic_name);
    CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category_id);
    CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
    CREATE INDEX IF NOT EXISTS idx_medicines_sku ON medicines(sku);
    CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
  `);

  seedInitialData();
}

function seedInitialData() {
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount > 0) return; // Already seeded

  console.log('Seeding initial pharmacy management data...');

  const insertCategory = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)');
  const categories = [
    ['Analgesics & Pain Relief', 'Medications to relieve pain, inflammation and fever'],
    ['Antibiotics & Antimicrobials', 'Substances that fight bacterial infections'],
    ['Cardiovascular & Hypertension', 'Drugs for heart disease, cholesterol, and blood pressure'],
    ['Respiratory & Allergy', 'Inhalers, antihistamines, and bronchodilators'],
    ['Gastrointestinal', 'Antacids, proton pump inhibitors, and digestive aids'],
    ['Endocrine & Diabetes', 'Insulin, metformin, and hormone regulation'],
    ['Vitamins & Supplements', 'Dietary supplements, minerals, and multivitamins']
  ];

  const catMap = {};
  for (const [name, desc] of categories) {
    const info = insertCategory.run(name, desc);
    catMap[name] = info.lastInsertRowid;
  }

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, contact_person, phone, email, address)
    VALUES (?, ?, ?, ?, ?)
  `);

  const suppliers = [
    ['Apex Pharmaceuticals Ltd', 'Dr. Sarah Connor', '+1-555-0142', 'orders@apexpharma.com', '124 Industrial Parkway, Chicago, IL'],
    ['BioHealth Distributors', 'Marcus Vance', '+1-555-0198', 'mvance@biohealth.org', '78 Health Science Blvd, Boston, MA'],
    ['MedLine Global Supplies', 'Elena Rostova', '+1-555-0233', 'sales@medlineglobal.com', '500 Logistics Way, Atlanta, GA'],
    ['Zenith Therapeutics', 'David Kim', '+1-555-0371', 'dkim@zeniththera.com', '32 Innovation Court, San Diego, CA']
  ];

  const supMap = {};
  for (const [name, contact, phone, email, addr] of suppliers) {
    const info = insertSupplier.run(name, contact, phone, email, addr);
    supMap[name] = info.lastInsertRowid;
  }

  const insertMedicine = db.prepare(`
    INSERT INTO medicines (
      sku, name, generic_name, category_id, supplier_id,
      dosage_form, strength, cost_price, unit_price,
      quantity_in_stock, min_stock_threshold, expiry_date,
      batch_number, requires_prescription, description
    ) VALUES (
      @sku, @name, @generic_name, @category_id, @supplier_id,
      @dosage_form, @strength, @cost_price, @unit_price,
      @quantity_in_stock, @min_stock_threshold, @expiry_date,
      @batch_number, @requires_prescription, @description
    )
  `);

  // Target date calculations: some current, some near expiry (within 30 days), some safe
  const now = new Date();
  const formatIsoDate = (d) => d.toISOString().split('T')[0];

  const safeDate1 = new Date(now.getFullYear() + 2, now.getMonth(), 15);
  const safeDate2 = new Date(now.getFullYear() + 1, now.getMonth() + 6, 20);
  const nearExpiryDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14); // in 14 days
  const nearExpiryDate2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 28); // in 28 days
  const expiredDate1 = new Date(now.getFullYear(), now.getMonth() - 2, 10); // 2 months ago

  const medicinesData = [
    {
      sku: 'MED-1001',
      name: 'Amoxicillin Trihydrate',
      generic_name: 'Amoxicillin',
      category_id: catMap['Antibiotics & Antimicrobials'],
      supplier_id: supMap['Apex Pharmaceuticals Ltd'],
      dosage_form: 'Capsule',
      strength: '500mg',
      cost_price: 12.00,
      unit_price: 18.50,
      quantity_in_stock: 120,
      min_stock_threshold: 25,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'AMX-2026-B1',
      requires_prescription: 1,
      description: 'Broad-spectrum beta-lactam antibiotic used to treat bacterial infections.'
    },
    {
      sku: 'MED-1002',
      name: 'Paracetamol Extra',
      generic_name: 'Acetaminophen',
      category_id: catMap['Analgesics & Pain Relief'],
      supplier_id: supMap['BioHealth Distributors'],
      dosage_form: 'Tablet',
      strength: '650mg',
      cost_price: 3.50,
      unit_price: 6.00,
      quantity_in_stock: 350,
      min_stock_threshold: 50,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'PCM-8841-A',
      requires_prescription: 0,
      description: 'Fast-acting fever reducer and mild to moderate pain reliever.'
    },
    {
      sku: 'MED-1003',
      name: 'Ibuprofen Rapid Release',
      generic_name: 'Ibuprofen',
      category_id: catMap['Analgesics & Pain Relief'],
      supplier_id: supMap['BioHealth Distributors'],
      dosage_form: 'Tablet',
      strength: '400mg',
      cost_price: 4.20,
      unit_price: 8.00,
      quantity_in_stock: 18, // Low stock! Below 20
      min_stock_threshold: 25,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'IBU-9901-C',
      requires_prescription: 0,
      description: 'Non-steroidal anti-inflammatory drug (NSAID) for headache and muscular pain.'
    },
    {
      sku: 'MED-1004',
      name: 'Metformin Hydrochloride',
      generic_name: 'Metformin',
      category_id: catMap['Endocrine & Diabetes'],
      supplier_id: supMap['Zenith Therapeutics'],
      dosage_form: 'Tablet',
      strength: '850mg',
      cost_price: 8.50,
      unit_price: 14.00,
      quantity_in_stock: 85,
      min_stock_threshold: 20,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'MET-2025-09',
      requires_prescription: 1,
      description: 'First-line medication for the treatment of type 2 diabetes mellitus.'
    },
    {
      sku: 'MED-1005',
      name: 'Amlodipine Besylate',
      generic_name: 'Amlodipine',
      category_id: catMap['Cardiovascular & Hypertension'],
      supplier_id: supMap['Apex Pharmaceuticals Ltd'],
      dosage_form: 'Tablet',
      strength: '5mg',
      cost_price: 6.00,
      unit_price: 11.50,
      quantity_in_stock: 6, // Critical Low stock!
      min_stock_threshold: 20,
      expiry_date: formatIsoDate(nearExpiryDate1), // Near expiry!
      batch_number: 'AML-4412-X',
      requires_prescription: 1,
      description: 'Calcium channel blocker used to treat high blood pressure and coronary artery disease.'
    },
    {
      sku: 'MED-1006',
      name: 'Atorvastatin Calcium',
      generic_name: 'Atorvastatin',
      category_id: catMap['Cardiovascular & Hypertension'],
      supplier_id: supMap['Zenith Therapeutics'],
      dosage_form: 'Tablet',
      strength: '20mg',
      cost_price: 14.00,
      unit_price: 22.00,
      quantity_in_stock: 65,
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'ATO-7731-B',
      requires_prescription: 1,
      description: 'Statin medication to prevent cardiovascular disease and manage abnormal lipid levels.'
    },
    {
      sku: 'MED-1007',
      name: 'Omeprazole Delayed-Release',
      generic_name: 'Omeprazole',
      category_id: catMap['Gastrointestinal'],
      supplier_id: supMap['MedLine Global Supplies'],
      dosage_form: 'Capsule',
      strength: '20mg',
      cost_price: 9.00,
      unit_price: 15.50,
      quantity_in_stock: 140,
      min_stock_threshold: 30,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'OMP-1102-K',
      requires_prescription: 0,
      description: 'Proton pump inhibitor treating gastroesophageal reflux disease (GERD) and stomach ulcers.'
    },
    {
      sku: 'MED-1008',
      name: 'Salbutamol Inhaler (Ventolin)',
      generic_name: 'Albuterol Sulfate',
      category_id: catMap['Respiratory & Allergy'],
      supplier_id: supMap['MedLine Global Supplies'],
      dosage_form: 'Inhaler',
      strength: '100mcg/dose',
      cost_price: 18.00,
      unit_price: 28.00,
      quantity_in_stock: 45,
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'SLB-5530-V',
      requires_prescription: 1,
      description: 'Fast-acting bronchodilator for asthma bronchospasm relief and COPD.'
    },
    {
      sku: 'MED-1009',
      name: 'Cetirizine Hydrochloride',
      generic_name: 'Cetirizine',
      category_id: catMap['Respiratory & Allergy'],
      supplier_id: supMap['BioHealth Distributors'],
      dosage_form: 'Tablet',
      strength: '10mg',
      cost_price: 5.00,
      unit_price: 9.50,
      quantity_in_stock: 210,
      min_stock_threshold: 35,
      expiry_date: formatIsoDate(nearExpiryDate2), // Near expiry
      batch_number: 'CTZ-9021-M',
      requires_prescription: 0,
      description: 'Second-generation antihistamine used for hay fever, allergies, and urticaria.'
    },
    {
      sku: 'MED-1010',
      name: 'Azithromycin Monohydrate',
      generic_name: 'Azithromycin',
      category_id: catMap['Antibiotics & Antimicrobials'],
      supplier_id: supMap['Apex Pharmaceuticals Ltd'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 16.50,
      unit_price: 26.00,
      quantity_in_stock: 0, // Out of stock!
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'AZM-3032-Q',
      requires_prescription: 1,
      description: 'Macrolide antibiotic commonly prescribed for respiratory and ear infections.'
    },
    {
      sku: 'MED-1011',
      name: 'Vitamin D3 Cholecalciferol',
      generic_name: 'Cholecalciferol',
      category_id: catMap['Vitamins & Supplements'],
      supplier_id: supMap['BioHealth Distributors'],
      dosage_form: 'Softgel',
      strength: '50,000 IU',
      cost_price: 7.20,
      unit_price: 13.00,
      quantity_in_stock: 95,
      min_stock_threshold: 20,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'VTD-8088-S',
      requires_prescription: 0,
      description: 'Essential fat-soluble vitamin crucial for bone health and calcium absorption.'
    },
    {
      sku: 'MED-1012',
      name: 'Ciprofloxacin Drops',
      generic_name: 'Ciprofloxacin 0.3%',
      category_id: catMap['Antibiotics & Antimicrobials'],
      supplier_id: supMap['Apex Pharmaceuticals Ltd'],
      dosage_form: 'Drops',
      strength: '5ml',
      cost_price: 8.00,
      unit_price: 14.50,
      quantity_in_stock: 12,
      min_stock_threshold: 10,
      expiry_date: formatIsoDate(expiredDate1), // Expired drug for testing filtering/alerts!
      batch_number: 'CIP-1288-E',
      requires_prescription: 1,
      description: 'Fluoroquinolone antibiotic ophthalmic/otic solution for ocular or ear infections.'
    }
  ];

  const medInsertTx = db.transaction((meds) => {
    for (const med of meds) {
      insertMedicine.run(med);
    }
  });
  medInsertTx(medicinesData);

  // Seed sample past sales
  const insertSale = db.prepare(`
    INSERT INTO sales (invoice_number, customer_name, customer_phone, doctor_prescription_id, subtotal, discount_percent, total_amount, payment_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, medicine_id, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?)
  `);

  const seedSalesTx = db.transaction(() => {
    // Sale 1
    const s1 = insertSale.run('INV-20261028-001', 'John Doe', '+1-555-8821', 'RX-99120', 37.00, 5, 35.15, 'Card', '2026-10-28 14:22:00');
    insertSaleItem.run(s1.lastInsertRowid, 1, 2, 18.50, 37.00);

    // Sale 2
    const s2 = insertSale.run('INV-20261029-002', 'Sarah Jenkins', '+1-555-9014', null, 25.50, 0, 25.50, 'Cash', '2026-10-29 10:15:00');
    insertSaleItem.run(s2.lastInsertRowid, 2, 1, 6.00, 6.00);
    insertSaleItem.run(s2.lastInsertRowid, 9, 1, 9.50, 9.50);
    insertSaleItem.run(s2.lastInsertRowid, 3, 1, 8.00, 8.00);

    // Sale 3
    const s3 = insertSale.run('INV-20261030-003', 'Robert Miller', '+1-555-3419', 'RX-44812', 50.00, 10, 45.00, 'Online', '2026-10-30 09:40:00');
    insertSaleItem.run(s3.lastInsertRowid, 6, 1, 22.00, 22.00);
    insertSaleItem.run(s3.lastInsertRowid, 8, 1, 28.00, 28.00);
  });
  seedSalesTx();

  console.log('Seeding completed successfully.');
}

// Initialize on module load
initializeDatabase();

module.exports = db;
