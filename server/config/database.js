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
    ['State Pharmaceuticals Corporation (SPC)', 'Dr. Kamal Perera', '+94-11-232-0356', 'orders@spc.lk', '75 Sir Baron Jayathilaka Mawatha, Colombo 01'],
    ['Hemas Pharmaceuticals (Pvt) Ltd', 'Nimali Fernando', '+94-11-473-1000', 'pharma@hemas.com', 'Hemas House, 75 Braybrooke Place, Colombo 02'],
    ['Morison Ltd (Hemas Group)', 'Rohan Jayasuriya', '+94-11-282-4500', 'supplies@morison.lk', '620 Biyagama Road, Pethiyagoda, Kelaniya'],
    ['Emerchemie NB (Ceylon) Ltd', 'Suresh Mendis', '+94-11-472-7900', 'info@emerchemie.lk', '108 Barnes Place, Colombo 07']
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
      supplier_id: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Capsule',
      strength: '500mg',
      cost_price: 320.00,
      unit_price: 480.00,
      quantity_in_stock: 120,
      min_stock_threshold: 25,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'AMX-2026-B1',
      requires_prescription: 1,
      description: 'Broad-spectrum beta-lactam antibiotic used to treat bacterial infections.'
    },
    {
      sku: 'MED-1002',
      name: 'Paracetamol Extra (Panadol)',
      generic_name: 'Acetaminophen',
      category_id: catMap['Analgesics & Pain Relief'],
      supplier_id: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 35.00,
      unit_price: 60.00,
      quantity_in_stock: 450,
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
      supplier_id: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Tablet',
      strength: '400mg',
      cost_price: 85.00,
      unit_price: 140.00,
      quantity_in_stock: 18, // Low stock! Below 20
      min_stock_threshold: 25,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'IBU-9901-C',
      requires_prescription: 0,
      description: 'Non-steroidal anti-inflammatory drug (NSAID) for muscular and joint pain.'
    },
    {
      sku: 'MED-1004',
      name: 'Metformin Hydrochloride',
      generic_name: 'Metformin',
      category_id: catMap['Endocrine & Diabetes'],
      supplier_id: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Tablet',
      strength: '850mg',
      cost_price: 150.00,
      unit_price: 250.00,
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
      supplier_id: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '5mg',
      cost_price: 120.00,
      unit_price: 210.00,
      quantity_in_stock: 6, // Critical Low stock!
      min_stock_threshold: 20,
      expiry_date: formatIsoDate(nearExpiryDate1), // Near expiry!
      batch_number: 'AML-4412-X',
      requires_prescription: 1,
      description: 'Calcium channel blocker used to treat high blood pressure and angina.'
    },
    {
      sku: 'MED-1006',
      name: 'Atorvastatin Calcium (Lipitor)',
      generic_name: 'Atorvastatin',
      category_id: catMap['Cardiovascular & Hypertension'],
      supplier_id: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '20mg',
      cost_price: 280.00,
      unit_price: 440.00,
      quantity_in_stock: 65,
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'ATO-7731-B',
      requires_prescription: 1,
      description: 'Statin medication to manage high cholesterol and prevent heart disease.'
    },
    {
      sku: 'MED-1007',
      name: 'Omeprazole Delayed-Release',
      generic_name: 'Omeprazole',
      category_id: catMap['Gastrointestinal'],
      supplier_id: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Capsule',
      strength: '20mg',
      cost_price: 180.00,
      unit_price: 310.00,
      quantity_in_stock: 140,
      min_stock_threshold: 30,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'OMP-1102-K',
      requires_prescription: 0,
      description: 'Proton pump inhibitor treating gastritis, acid reflux, and peptic ulcers.'
    },
    {
      sku: 'MED-1008',
      name: 'Salbutamol Inhaler (Ventolin)',
      generic_name: 'Albuterol Sulfate',
      category_id: catMap['Respiratory & Allergy'],
      supplier_id: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Inhaler',
      strength: '100mcg/dose',
      cost_price: 950.00,
      unit_price: 1450.00,
      quantity_in_stock: 45,
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'SLB-5530-V',
      requires_prescription: 1,
      description: 'Fast-acting bronchodilator for asthma bronchospasm and COPD.'
    },
    {
      sku: 'MED-1009',
      name: 'Cetirizine Hydrochloride',
      generic_name: 'Cetirizine',
      category_id: catMap['Respiratory & Allergy'],
      supplier_id: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Tablet',
      strength: '10mg',
      cost_price: 65.00,
      unit_price: 110.00,
      quantity_in_stock: 210,
      min_stock_threshold: 35,
      expiry_date: formatIsoDate(nearExpiryDate2), // Near expiry
      batch_number: 'CTZ-9021-M',
      requires_prescription: 0,
      description: 'Antihistamine used for allergic rhinitis, sneezing, and skin allergy.'
    },
    {
      sku: 'MED-1010',
      name: 'Azithromycin Monohydrate',
      generic_name: 'Azithromycin',
      category_id: catMap['Antibiotics & Antimicrobials'],
      supplier_id: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 420.00,
      unit_price: 650.00,
      quantity_in_stock: 0, // Out of stock!
      min_stock_threshold: 15,
      expiry_date: formatIsoDate(safeDate1),
      batch_number: 'AZM-3032-Q',
      requires_prescription: 1,
      description: 'Macrolide antibiotic commonly prescribed for respiratory infections.'
    },
    {
      sku: 'MED-1011',
      name: 'Vitamin D3 Cholecalciferol',
      generic_name: 'Cholecalciferol',
      category_id: catMap['Vitamins & Supplements'],
      supplier_id: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Softgel',
      strength: '50,000 IU',
      cost_price: 380.00,
      unit_price: 580.00,
      quantity_in_stock: 95,
      min_stock_threshold: 20,
      expiry_date: formatIsoDate(safeDate2),
      batch_number: 'VTD-8088-S',
      requires_prescription: 0,
      description: 'Essential vitamin for bone mineralization and immune health.'
    },
    {
      sku: 'MED-1012',
      name: 'Ciprofloxacin Eye/Ear Drops',
      generic_name: 'Ciprofloxacin 0.3%',
      category_id: catMap['Antibiotics & Antimicrobials'],
      supplier_id: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Drops',
      strength: '5ml',
      cost_price: 240.00,
      unit_price: 390.00,
      quantity_in_stock: 12,
      min_stock_threshold: 10,
      expiry_date: formatIsoDate(expiredDate1), // Expired drug for alert test!
      batch_number: 'CIP-1288-E',
      requires_prescription: 1,
      description: 'Antibiotic drops for bacterial eye or ear infections.'
    }
  ];

  const medInsertTx = db.transaction((meds) => {
    for (const med of meds) {
      insertMedicine.run(med);
    }
  });
  medInsertTx(medicinesData);

  // Seed sample past sales in Sri Lankan Rupees
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
    const s1 = insertSale.run('INV-20261028-001', 'Sunil Perera', '+94-77-123-4567', 'RX-SL-9912', 960.00, 5, 912.00, 'Card', '2026-10-28 14:22:00');
    insertSaleItem.run(s1.lastInsertRowid, 1, 2, 480.00, 960.00);

    // Sale 2
    const s2 = insertSale.run('INV-20261029-002', 'Anoma Wickramasinghe', '+94-71-456-7890', null, 310.00, 0, 310.00, 'Cash', '2026-10-29 10:15:00');
    insertSaleItem.run(s2.lastInsertRowid, 2, 1, 60.00, 60.00);
    insertSaleItem.run(s2.lastInsertRowid, 9, 1, 110.00, 110.00);
    insertSaleItem.run(s2.lastInsertRowid, 3, 1, 140.00, 140.00);

    // Sale 3
    const s3 = insertSale.run('INV-20261030-003', 'Dr. Dinesh Silva', '+94-76-889-0123', 'RX-SL-4481', 1890.00, 10, 1701.00, 'Online', '2026-10-30 09:40:00');
    insertSaleItem.run(s3.lastInsertRowid, 6, 1, 440.00, 440.00);
    insertSaleItem.run(s3.lastInsertRowid, 8, 1, 1450.00, 1450.00);
  });
  seedSalesTx();

  console.log('Seeding completed successfully.');
}

// Initialize on module load
initializeDatabase();

module.exports = db;
