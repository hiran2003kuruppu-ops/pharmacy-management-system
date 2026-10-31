const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('[Seeder] Connected to MongoDB. Clearing existing collections...');

    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      Supplier.deleteMany(),
      Medicine.deleteMany(),
      Sale.deleteMany()
    ]);

    console.log('[Seeder] Collections cleared. Seeding initial data...');

    // 1. Users
    const admin = await User.create({
      name: 'Dr. K.A.H.B. Kuruppu',
      email: 'admin@pharmacare.lk',
      password: 'admin123',
      role: 'admin'
    });

    const pharmacist = await User.create({
      name: 'Pharmacist Amal Silva',
      email: 'pharmacist@pharmacare.lk',
      password: 'pharma123',
      role: 'pharmacist'
    });

    console.log('[Seeder] Users created: admin@pharmacare.lk / admin123');

    // 2. Categories
    const categories = await Category.insertMany([
      { name: 'Antibiotics & Antimicrobials', description: 'Broad-spectrum and targeted bacterial anti-infectives' },
      { name: 'Analgesics & Antipyretics', description: 'Pain management and fever reduction formulations' },
      { name: 'Cardiovascular & Antihypertensives', description: 'Blood pressure control, statins, and heart therapeutics' },
      { name: 'Antidiabetics & Endocrine', description: 'Oral hypoglycemics and insulin formulations for glucose regulation' },
      { name: 'Antihistamines & Respiratory', description: 'Allergy relief, bronchodilators, and cough syrups' },
      { name: 'Gastrointestinal & Antacids', description: 'Proton pump inhibitors, H2 blockers, and antacids' },
      { name: 'Vitamins & Supplements', description: 'Nutritional wellness, essential minerals, and dietary supplements' }
    ]);

    const catMap = {};
    categories.forEach(c => { catMap[c.name] = c._id; });

    // 3. Suppliers
    const suppliers = await Supplier.insertMany([
      {
        name: 'State Pharmaceuticals Corporation (SPC)',
        contact_person: 'Mr. Sunil Jayasinghe',
        phone: '+94 11 232 0356',
        email: 'procurement@spc.lk',
        address: '75 Sir Baron Jayatilaka Mawatha, Colombo 01'
      },
      {
        name: 'Hemas Pharmaceuticals (Pvt) Ltd',
        contact_person: 'Ms. Dilani Weerasinghe',
        phone: '+94 11 473 1731',
        email: 'orders@hemaspharma.com',
        address: 'Hemas House, 75 Braybrooke Place, Colombo 02'
      },
      {
        name: 'J.L. Morison Son & Jones (Ceylon) PLC',
        contact_person: 'Mr. Rohan Fernando',
        phone: '+94 11 269 7721',
        email: 'info@morisons.lk',
        address: '620 Biyagama Road, Pethiyagoda, Kelaniya'
      },
      {
        name: 'Emerchemie NB (Ceylon) Ltd',
        contact_person: 'Dr. Chathura Perera',
        phone: '+94 11 250 8444',
        email: 'distribution@emerchemie.com',
        address: '46/38 Nawam Mawatha, Colombo 02'
      }
    ]);

    const spcId = suppliers[0]._id;
    const hemasId = suppliers[1]._id;
    const morisonId = suppliers[2]._id;
    const emerId = suppliers[3]._id;

    // 4. Medicines
    const medicines = await Medicine.insertMany([
      {
        sku: 'MED-1001',
        name: 'Amoxicillin Trihydrate',
        generic_name: 'Amoxicillin',
        category: catMap['Antibiotics & Antimicrobials'],
        supplier: spcId,
        dosage_form: 'Capsule',
        strength: '500mg',
        batch_number: 'AMX-2025-04',
        cost_price: 12.00,
        unit_price: 18.50,
        quantity_in_stock: 450,
        min_stock_threshold: 50,
        expiry_date: new Date('2027-08-31'),
        requires_prescription: true,
        description: 'First-line antibiotic indicated for respiratory tract and skin infections.'
      },
      {
        sku: 'MED-1002',
        name: 'Paracetamol BP',
        generic_name: 'Acetaminophen',
        category: catMap['Analgesics & Antipyretics'],
        supplier: morisonId,
        dosage_form: 'Tablet',
        strength: '500mg',
        batch_number: 'PARA-2026-01',
        cost_price: 2.20,
        unit_price: 4.00,
        quantity_in_stock: 1200,
        min_stock_threshold: 200,
        expiry_date: new Date('2028-12-31'),
        requires_prescription: false,
        description: 'Antipyretic and mild-to-moderate pain reliever.'
      },
      {
        sku: 'MED-1003',
        name: 'Atorvastatin Calcium',
        generic_name: 'Atorvastatin',
        category: catMap['Cardiovascular & Antihypertensives'],
        supplier: emerId,
        dosage_form: 'Tablet',
        strength: '20mg',
        batch_number: 'ATR-2024-09',
        cost_price: 28.00,
        unit_price: 45.00,
        quantity_in_stock: 180,
        min_stock_threshold: 30,
        expiry_date: new Date('2027-03-31'),
        requires_prescription: true,
        description: 'HMG-CoA reductase inhibitor for lipid lowering.'
      },
      {
        sku: 'MED-1004',
        name: 'Metformin Hydrochloride',
        generic_name: 'Metformin HCl',
        category: catMap['Antidiabetics & Endocrine'],
        supplier: spcId,
        dosage_form: 'Tablet',
        strength: '500mg',
        batch_number: 'MET-2025-11',
        cost_price: 5.00,
        unit_price: 8.50,
        quantity_in_stock: 550,
        min_stock_threshold: 100,
        expiry_date: new Date('2027-10-31'),
        requires_prescription: true,
        description: 'Biguanide antidiabetic indicated for type-2 diabetes mellitus.'
      },
      {
        sku: 'MED-1005',
        name: 'Cetirizine Dihydrochloride',
        generic_name: 'Cetirizine',
        category: catMap['Antihistamines & Respiratory'],
        supplier: hemasId,
        dosage_form: 'Tablet',
        strength: '10mg',
        batch_number: 'CET-2024-03',
        cost_price: 7.50,
        unit_price: 12.00,
        quantity_in_stock: 320,
        min_stock_threshold: 40,
        expiry_date: new Date('2027-06-30'),
        requires_prescription: false,
        description: 'Second-generation H1-antihistamine for allergic rhinitis and urticaria.'
      },
      {
        sku: 'MED-1006',
        name: 'Omeprazole Gastro-Resistant',
        generic_name: 'Omeprazole',
        category: catMap['Gastrointestinal & Antacids'],
        supplier: morisonId,
        dosage_form: 'Capsule',
        strength: '20mg',
        batch_number: 'OMP-2025-06',
        cost_price: 14.00,
        unit_price: 22.00,
        quantity_in_stock: 8, // Low Stock!
        min_stock_threshold: 25,
        expiry_date: new Date('2027-05-31'),
        requires_prescription: false,
        description: 'Proton pump inhibitor for GERD and acid peptic disorders.'
      },
      {
        sku: 'MED-1007',
        name: 'Azithromycin Dihydrate',
        generic_name: 'Azithromycin',
        category: catMap['Antibiotics & Antimicrobials'],
        supplier: emerId,
        dosage_form: 'Tablet',
        strength: '500mg',
        batch_number: 'AZM-2024-02',
        cost_price: 85.00,
        unit_price: 125.00,
        quantity_in_stock: 0, // Out of Stock!
        min_stock_threshold: 20,
        expiry_date: new Date('2026-11-20'), // Expiring soon!
        requires_prescription: true,
        description: 'Macrolide antibacterial for atypical chest and urogenital infections.'
      },
      {
        sku: 'MED-1008',
        name: 'Losartan Potassium',
        generic_name: 'Losartan',
        category: catMap['Cardiovascular & Antihypertensives'],
        supplier: spcId,
        dosage_form: 'Tablet',
        strength: '50mg',
        batch_number: 'LOS-2025-08',
        cost_price: 18.00,
        unit_price: 28.00,
        quantity_in_stock: 210,
        min_stock_threshold: 30,
        expiry_date: new Date('2027-09-30'),
        requires_prescription: true,
        description: 'Angiotensin II receptor antagonist for essential hypertension.'
      },
      {
        sku: 'MED-1009',
        name: 'Salbutamol Pressurised Inhalation',
        generic_name: 'Salbutamol',
        category: catMap['Antihistamines & Respiratory'],
        supplier: hemasId,
        dosage_form: 'Inhaler',
        strength: '100mcg',
        batch_number: 'SLB-2024-12',
        cost_price: 620.00,
        unit_price: 850.00,
        quantity_in_stock: 35,
        min_stock_threshold: 15,
        expiry_date: new Date('2027-11-30'),
        requires_prescription: true,
        description: 'Short-acting beta2-adrenergic agonist for acute asthma bronchospasm.'
      },
      {
        sku: 'MED-1010',
        name: 'Multivitamin and Mineral Formula',
        generic_name: 'Multivitamins + Zinc',
        category: catMap['Vitamins & Supplements'],
        supplier: morisonId,
        dosage_form: 'Tablet',
        strength: 'Daily Formula',
        batch_number: 'VIT-2024-01',
        cost_price: 9.00,
        unit_price: 15.00,
        quantity_in_stock: 50,
        min_stock_threshold: 20,
        expiry_date: new Date('2026-08-15'), // Expired!
        requires_prescription: false,
        description: 'Essential daily micronutrients and immunological zinc support.'
      }
    ]);

    // 5. Seed an initial sale (links to Amoxicillin and Paracetamol)
    await Sale.create({
      invoice_number: 'INV-0001',
      pharmacist: pharmacist._id,
      customer_name: 'Nimal Jayawardena',
      customer_phone: '0771234567',
      prescription_id: 'SLMC-8812',
      items: [
        {
          medicine: medicines[0]._id, // Amoxicillin
          medicine_name: medicines[0].name,
          sku: medicines[0].sku,
          quantity: 10,
          unit_price: medicines[0].unit_price,
          total_price: medicines[0].unit_price * 10
        },
        {
          medicine: medicines[1]._id, // Paracetamol
          medicine_name: medicines[1].name,
          sku: medicines[1].sku,
          quantity: 20,
          unit_price: medicines[1].unit_price,
          total_price: medicines[1].unit_price * 20
        }
      ],
      subtotal: (18.50 * 10) + (4.00 * 20),
      discount_percent: 0,
      discount_amount: 0,
      total_amount: (18.50 * 10) + (4.00 * 20),
      payment_method: 'Cash'
    });

    console.log('[Seeder] Initial sale record seeded (INV-0001).');
    console.log('[Seeder] All MERN data seeded successfully in Sri Lankan Rupees (Rs.)!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder Error]:', error);
    process.exit(1);
  }
};

seedData();
