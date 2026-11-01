const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Category = require('./server/models/Category');
const Supplier = require('./server/models/Supplier');
const Medicine = require('./server/models/Medicine');
const User = require('./server/models/User');
const Sale = require('./server/models/Sale');

const connUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pharmacare_db';

async function seed() {
  console.log(`====================================================`);
  console.log(`Connecting to MongoDB at: ${connUri}`);
  await mongoose.connect(connUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
  });
  console.log('MongoDB connected successfully.');

  // 1. Ensure Default Admin & Pharmacist Users exist
  await User.deleteMany({ email: { $in: ['admin@pharmacare.lk', 'pharmacist@pharmacare.lk', 'dispenser@pharmacare.lk'] } });
  
  const adminUser = await User.create({
    name: 'System Administrator',
    email: 'admin@pharmacare.lk',
    password: 'admin123',
    role: 'admin'
  });
  console.log('Configured Admin User: admin@pharmacare.lk / admin123');

  const pharmacistUser = await User.create({
    name: 'Staff Pharmacist',
    email: 'pharmacist@pharmacare.lk',
    password: 'pharma123',
    role: 'pharmacist'
  });
  console.log('Configured Pharmacist User: pharmacist@pharmacare.lk / pharma123');

  // 2. Canonical Therapeutic Categories
  const canonicalCategories = [
    { name: 'Analgesics & Pain Relief', description: 'Medications to relieve pain, inflammation and fever (NSAIDs, antipyretics)' },
    { name: 'Antibiotics & Antimicrobials', description: 'Substances that fight bacterial infections, macrolides, penicillins' },
    { name: 'Cardiovascular & Hypertension', description: 'Drugs for heart disease, cholesterol, and blood pressure regulation' },
    { name: 'Respiratory & Allergy', description: 'Inhalers, antihistamines, and bronchodilators for asthma and allergies' },
    { name: 'Gastrointestinal & Antacids', description: 'Antacids, proton pump inhibitors, and digestive aids' },
    { name: 'Endocrine & Diabetes', description: 'Insulin, metformin, and metabolic hormone regulators' },
    { name: 'Vitamins & Supplements', description: 'Dietary supplements, minerals, and multivitamins' },
    { name: 'Dermatological & Topical', description: 'Creams, ointments, and anti-fungal treatments' },
    { name: 'Ophthalmic & ENT', description: 'Eye and ear drops, nasal sprays, and topical sensory solutions' }
  ];

  // Old duplicate mapping for clean deduplication
  const categoryOldMap = {
    'Analgesics & Antipyretics': 'Analgesics & Pain Relief',
    'Cardiovascular & Antihypertensives': 'Cardiovascular & Hypertension',
    'Antidiabetics & Endocrine': 'Endocrine & Diabetes',
    'Antihistamines & Respiratory': 'Respiratory & Allergy',
    'Gastrointestinal': 'Gastrointestinal & Antacids'
  };

  const catMap = {};
  for (const cat of canonicalCategories) {
    let doc = await Category.findOne({ name: cat.name });
    if (!doc) {
      doc = await Category.create(cat);
      console.log(`Created Category: ${doc.name}`);
    } else {
      await Category.updateOne({ _id: doc._id }, { $set: { description: cat.description } });
    }
    catMap[cat.name] = doc._id;
  }

  // Reconcile and merge legacy duplicate categories
  for (const [oldName, canonicalName] of Object.entries(categoryOldMap)) {
    const oldDoc = await Category.findOne({ name: oldName });
    if (oldDoc && catMap[canonicalName]) {
      const targetId = catMap[canonicalName];
      const remapped = await Medicine.updateMany({ category: oldDoc._id }, { $set: { category: targetId } });
      if (remapped.nModified > 0 || remapped.modifiedCount > 0) {
        console.log(`Remapped medicines from legacy category '${oldName}' to '${canonicalName}'`);
      }
      await Category.deleteOne({ _id: oldDoc._id });
      console.log(`Removed redundant category: '${oldName}'`);
    }
  }

  // 3. Canonical Pharmaceutical Suppliers
  const canonicalSuppliers = [
    {
      name: 'State Pharmaceuticals Corporation (SPC)',
      contact_person: 'Dr. Kamal Perera',
      phone: '+94-11-232-0356',
      email: 'orders@spc.lk',
      address: '75 Sir Baron Jayathilaka Mawatha, Colombo 01'
    },
    {
      name: 'Hemas Pharmaceuticals (Pvt) Ltd',
      contact_person: 'Nimali Fernando',
      phone: '+94-11-473-1000',
      email: 'pharma@hemas.com',
      address: 'Hemas House, 75 Braybrooke Place, Colombo 02'
    },
    {
      name: 'Morison Ltd (Hemas Group)',
      contact_person: 'Rohan Jayasuriya',
      phone: '+94-11-282-4500',
      email: 'supplies@morison.lk',
      address: '620 Biyagama Road, Pethiyagoda, Kelaniya'
    },
    {
      name: 'Emerchemie NB (Ceylon) Ltd',
      contact_person: 'Suresh Mendis',
      phone: '+94-11-472-7900',
      email: 'info@emerchemie.lk',
      address: '108 Barnes Place, Colombo 07'
    },
    {
      name: 'A. Baur & Co. (Pvt) Ltd',
      contact_person: 'Priya Ratnayake',
      phone: '+94-11-472-8700',
      email: 'healthcare@baurs.com',
      address: '62 Jethawana Road, Colombo 14'
    },
    {
      name: 'GlaxoSmithKline Pharmaceuticals (GSK)',
      contact_person: 'Dharshana Wickramasinghe',
      phone: '+94-11-269-5818',
      email: 'customer.service@gsk.com',
      address: '121 Galle Road, Colombo 03'
    }
  ];

  // Old duplicate supplier mapping
  const supplierOldMap = {
    'J.L. Morison Son & Jones (Ceylon) PLC': 'Morison Ltd (Hemas Group)'
  };

  const supMap = {};
  for (const sup of canonicalSuppliers) {
    let doc = await Supplier.findOne({ name: sup.name });
    if (!doc) {
      doc = await Supplier.create(sup);
      console.log(`Created Supplier: ${doc.name}`);
    } else {
      await Supplier.updateOne({ _id: doc._id }, { $set: sup });
    }
    supMap[sup.name] = doc._id;
  }

  // Reconcile and merge legacy duplicate suppliers
  for (const [oldName, canonicalName] of Object.entries(supplierOldMap)) {
    const oldDoc = await Supplier.findOne({ name: oldName });
    if (oldDoc && supMap[canonicalName]) {
      const targetId = supMap[canonicalName];
      await Medicine.updateMany({ supplier: oldDoc._id }, { $set: { supplier: targetId } });
      await Supplier.deleteOne({ _id: oldDoc._id });
      console.log(`Remapped & removed redundant supplier: '${oldName}'`);
    }
  }

  // 4. Calculate Dynamic Expiry Dates for Real-Time Alert Scenarios
  const now = new Date();
  const safeFutureDate1 = new Date(now.getFullYear() + 2, now.getMonth(), 15);
  const safeFutureDate2 = new Date(now.getFullYear() + 1, now.getMonth() + 6, 20);
  const safeFutureDate3 = new Date(now.getFullYear() + 1, now.getMonth() + 10, 10);
  const nearExpiryDate1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12); // Near expiry: 12 days
  const nearExpiryDate2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 25); // Near expiry: 25 days
  const expiredDate1 = new Date(now.getFullYear(), now.getMonth() - 2, 10); // Expired: 2 months ago
  const expiredDate2 = new Date(now.getFullYear(), now.getMonth() - 1, 5);  // Expired: 1 month ago

  // 5. Complete Comprehensive Medicines Catalog (28 Items)
  const medicinesList = [
    {
      sku: 'MED-1001',
      name: 'Amoxicillin Trihydrate',
      generic_name: 'Amoxicillin',
      category: catMap['Antibiotics & Antimicrobials'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Capsule',
      strength: '500mg',
      cost_price: 320.00,
      unit_price: 480.00,
      quantity_in_stock: 150,
      min_stock_threshold: 25,
      expiry_date: safeFutureDate1,
      batch_number: 'AMX-2026-B1',
      requires_prescription: true,
      description: 'Broad-spectrum beta-lactam antibiotic used to treat bacterial respiratory and ear infections.'
    },
    {
      sku: 'MED-1002',
      name: 'Paracetamol Extra (Panadol)',
      generic_name: 'Acetaminophen',
      category: catMap['Analgesics & Pain Relief'],
      supplier: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 35.00,
      unit_price: 60.00,
      quantity_in_stock: 450,
      min_stock_threshold: 50,
      expiry_date: safeFutureDate2,
      batch_number: 'PCM-8841-A',
      requires_prescription: false,
      description: 'Fast-acting fever reducer and mild to moderate pain reliever.'
    },
    {
      sku: 'MED-1003',
      name: 'Ibuprofen Rapid Release',
      generic_name: 'Ibuprofen',
      category: catMap['Analgesics & Pain Relief'],
      supplier: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Tablet',
      strength: '400mg',
      cost_price: 85.00,
      unit_price: 140.00,
      quantity_in_stock: 14, // Low Stock Warning! (< 25)
      min_stock_threshold: 25,
      expiry_date: safeFutureDate1,
      batch_number: 'IBU-9901-C',
      requires_prescription: false,
      description: 'Non-steroidal anti-inflammatory drug (NSAID) for muscular, joint, and dental pain.'
    },
    {
      sku: 'MED-1004',
      name: 'Metformin Hydrochloride',
      generic_name: 'Metformin',
      category: catMap['Endocrine & Diabetes'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Tablet',
      strength: '850mg',
      cost_price: 150.00,
      unit_price: 250.00,
      quantity_in_stock: 95,
      min_stock_threshold: 20,
      expiry_date: safeFutureDate2,
      batch_number: 'MET-2026-09',
      requires_prescription: true,
      description: 'First-line biguanide medication for the management of type 2 diabetes mellitus.'
    },
    {
      sku: 'MED-1005',
      name: 'Amlodipine Besylate',
      generic_name: 'Amlodipine',
      category: catMap['Cardiovascular & Hypertension'],
      supplier: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '5mg',
      cost_price: 120.00,
      unit_price: 210.00,
      quantity_in_stock: 8, // Critical Low stock! (< 20)
      min_stock_threshold: 20,
      expiry_date: nearExpiryDate1, // Near expiry (within 12 days)!
      batch_number: 'AML-4412-X',
      requires_prescription: true,
      description: 'Calcium channel blocker used to treat essential hypertension and chronic stable angina.'
    },
    {
      sku: 'MED-1006',
      name: 'Atorvastatin Calcium (Lipitor)',
      generic_name: 'Atorvastatin',
      category: catMap['Cardiovascular & Hypertension'],
      supplier: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '20mg',
      cost_price: 280.00,
      unit_price: 440.00,
      quantity_in_stock: 80,
      min_stock_threshold: 15,
      expiry_date: safeFutureDate1,
      batch_number: 'ATO-7731-B',
      requires_prescription: true,
      description: 'HMG-CoA reductase inhibitor (statin) to lower LDL cholesterol and reduce cardiovascular events.'
    },
    {
      sku: 'MED-1007',
      name: 'Omeprazole Delayed-Release',
      generic_name: 'Omeprazole',
      category: catMap['Gastrointestinal & Antacids'],
      supplier: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Capsule',
      strength: '20mg',
      cost_price: 180.00,
      unit_price: 310.00,
      quantity_in_stock: 160,
      min_stock_threshold: 30,
      expiry_date: safeFutureDate2,
      batch_number: 'OMP-1102-K',
      requires_prescription: false,
      description: 'Proton pump inhibitor treating gastritis, GERD, acid reflux, and gastric ulcers.'
    },
    {
      sku: 'MED-1008',
      name: 'Salbutamol Inhaler (Ventolin)',
      generic_name: 'Albuterol Sulfate',
      category: catMap['Respiratory & Allergy'],
      supplier: supMap['GlaxoSmithKline Pharmaceuticals (GSK)'],
      dosage_form: 'Inhaler',
      strength: '100mcg/dose',
      cost_price: 950.00,
      unit_price: 1450.00,
      quantity_in_stock: 55,
      min_stock_threshold: 15,
      expiry_date: safeFutureDate3,
      batch_number: 'SLB-5530-V',
      requires_prescription: true,
      description: 'Fast-acting beta-2 adrenergic agonist for rapid relief of asthma bronchospasm.'
    },
    {
      sku: 'MED-1009',
      name: 'Cetirizine Hydrochloride',
      generic_name: 'Cetirizine',
      category: catMap['Respiratory & Allergy'],
      supplier: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Tablet',
      strength: '10mg',
      cost_price: 65.00,
      unit_price: 110.00,
      quantity_in_stock: 240,
      min_stock_threshold: 35,
      expiry_date: nearExpiryDate2, // Near expiry (within 25 days)!
      batch_number: 'CTZ-9021-M',
      requires_prescription: false,
      description: 'Second-generation non-sedating antihistamine for allergic rhinitis, urticaria, and sneezing.'
    },
    {
      sku: 'MED-1010',
      name: 'Azithromycin Monohydrate',
      generic_name: 'Azithromycin',
      category: catMap['Antibiotics & Antimicrobials'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 420.00,
      unit_price: 650.00,
      quantity_in_stock: 0, // OUT OF STOCK!
      min_stock_threshold: 15,
      expiry_date: safeFutureDate1,
      batch_number: 'AZM-3032-Q',
      requires_prescription: true,
      description: 'Broad-spectrum macrolide antibiotic commonly prescribed for acute chest infections.'
    },
    {
      sku: 'MED-1011',
      name: 'Vitamin D3 Cholecalciferol',
      generic_name: 'Cholecalciferol',
      category: catMap['Vitamins & Supplements'],
      supplier: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Capsule',
      strength: '50,000 IU',
      cost_price: 380.00,
      unit_price: 580.00,
      quantity_in_stock: 110,
      min_stock_threshold: 20,
      expiry_date: safeFutureDate2,
      batch_number: 'VTD-8088-S',
      requires_prescription: false,
      description: 'High-potency vitamin D supplement for bone density, calcium absorption, and immunity.'
    },
    {
      sku: 'MED-1012',
      name: 'Ciprofloxacin Eye/Ear Drops',
      generic_name: 'Ciprofloxacin 0.3%',
      category: catMap['Ophthalmic & ENT'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Drops',
      strength: '5ml',
      cost_price: 240.00,
      unit_price: 390.00,
      quantity_in_stock: 12,
      min_stock_threshold: 10,
      expiry_date: expiredDate1, // EXPIRED medication for alert testing!
      batch_number: 'CIP-1288-E',
      requires_prescription: true,
      description: 'Fluoroquinolone antibiotic drops for acute bacterial conjunctivitis and otitis externa.'
    },
    {
      sku: 'MED-1013',
      name: 'Losartan Potassium',
      generic_name: 'Losartan',
      category: catMap['Cardiovascular & Hypertension'],
      supplier: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '50mg',
      cost_price: 130.00,
      unit_price: 220.00,
      quantity_in_stock: 180,
      min_stock_threshold: 25,
      expiry_date: safeFutureDate3,
      batch_number: 'LOS-5521-P',
      requires_prescription: true,
      description: 'Angiotensin II receptor blocker (ARB) used in hypertension and diabetic nephropathy.'
    },
    {
      sku: 'MED-1014',
      name: 'Augmentin (Co-Amoxiclav)',
      generic_name: 'Amoxicillin + Clavulanic Acid',
      category: catMap['Antibiotics & Antimicrobials'],
      supplier: supMap['GlaxoSmithKline Pharmaceuticals (GSK)'],
      dosage_form: 'Tablet',
      strength: '625mg',
      cost_price: 850.00,
      unit_price: 1250.00,
      quantity_in_stock: 65,
      min_stock_threshold: 20,
      expiry_date: safeFutureDate1,
      batch_number: 'AUG-9910-Z',
      requires_prescription: true,
      description: 'Potent combination antibiotic indicated for severe bacterial infections resistant to amoxicillin.'
    },
    {
      sku: 'MED-1015',
      name: 'Gaviscon Double Action Suspension',
      generic_name: 'Sodium Alginate + Antacids',
      category: catMap['Gastrointestinal & Antacids'],
      supplier: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Syrup',
      strength: '150ml',
      cost_price: 1100.00,
      unit_price: 1650.00,
      quantity_in_stock: 35,
      min_stock_threshold: 10,
      expiry_date: safeFutureDate2,
      batch_number: 'GAV-7741-L',
      requires_prescription: false,
      description: 'Forms a protective barrier over stomach contents to soothe heartburn and indigestion.'
    },
    {
      sku: 'MED-1016',
      name: 'Betamethasone Dipropionate Cream',
      generic_name: 'Betamethasone 0.05%',
      category: catMap['Dermatological & Topical'],
      supplier: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Ointment',
      strength: '15g tube',
      cost_price: 210.00,
      unit_price: 340.00,
      quantity_in_stock: 45,
      min_stock_threshold: 15,
      expiry_date: safeFutureDate3,
      batch_number: 'BTM-3112-D',
      requires_prescription: true,
      description: 'Topical corticosteroid for relief of inflammatory and pruritic skin dermatoses.'
    },
    {
      sku: 'MED-1017',
      name: 'Ascorbic Acid (Chewable Vitamin C)',
      generic_name: 'Vitamin C',
      category: catMap['Vitamins & Supplements'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Tablet',
      strength: '500mg',
      cost_price: 20.00,
      unit_price: 45.00,
      quantity_in_stock: 500,
      min_stock_threshold: 60,
      expiry_date: safeFutureDate1,
      batch_number: 'VTC-1049-C',
      requires_prescription: false,
      description: 'Antioxidant vitamin supporting collagen synthesis, wound repair, and immune defence.'
    },
    {
      sku: 'MED-1018',
      name: 'Diclofenac Sodium Gel (Voltaren)',
      generic_name: 'Diclofenac Diethylamine 1%',
      category: catMap['Analgesics & Pain Relief'],
      supplier: supMap['A. Baur & Co. (Pvt) Ltd'],
      dosage_form: 'Ointment',
      strength: '50g tube',
      cost_price: 450.00,
      unit_price: 680.00,
      quantity_in_stock: 5, // Low stock (< 15)
      min_stock_threshold: 15,
      expiry_date: expiredDate2, // Expired medicine for quarantine test
      batch_number: 'DIC-6022-G',
      requires_prescription: false,
      description: 'Topical anti-inflammatory gel for localized joint stiffness, arthritis, and sports sprains.'
    },
    {
      sku: 'MED-1019',
      name: 'Insulin Human 30/70 (Mixtard)',
      generic_name: 'Biphasic Isophane Insulin',
      category: catMap['Endocrine & Diabetes'],
      supplier: supMap['A. Baur & Co. (Pvt) Ltd'],
      dosage_form: 'Injection',
      strength: '100 IU/ml (10ml vial)',
      cost_price: 1450.00,
      unit_price: 2150.00,
      quantity_in_stock: 28,
      min_stock_threshold: 10,
      expiry_date: safeFutureDate2,
      batch_number: 'INS-4091-M',
      requires_prescription: true,
      description: 'Biphasic human insulin for strict glycaemic control in insulin-requiring diabetes.'
    },
    {
      sku: 'MED-1020',
      name: 'Doxycycline Hyclate',
      generic_name: 'Doxycycline',
      category: catMap['Antibiotics & Antimicrobials'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Capsule',
      strength: '100mg',
      cost_price: 180.00,
      unit_price: 290.00,
      quantity_in_stock: 75,
      min_stock_threshold: 20,
      expiry_date: safeFutureDate1,
      batch_number: 'DOX-8821-K',
      requires_prescription: true,
      description: 'Tetracycline antibiotic for leptospirosis prophylaxis, respiratory, and skin infections.'
    },
    {
      sku: 'MED-1021',
      name: 'Clopidogrel Bisulfate (Plavix)',
      generic_name: 'Clopidogrel',
      category: catMap['Cardiovascular & Hypertension'],
      supplier: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Tablet',
      strength: '75mg',
      cost_price: 310.00,
      unit_price: 490.00,
      quantity_in_stock: 90,
      min_stock_threshold: 15,
      expiry_date: safeFutureDate3,
      batch_number: 'CLP-3310-T',
      requires_prescription: true,
      description: 'Potent antiplatelet agent used to prevent thromboembolic events following myocardial infarction.'
    },
    {
      sku: 'MED-1022',
      name: 'Domperidone Maleate (Motilium)',
      generic_name: 'Domperidone',
      category: catMap['Gastrointestinal & Antacids'],
      supplier: supMap['Morison Ltd (Hemas Group)'],
      dosage_form: 'Tablet',
      strength: '10mg',
      cost_price: 55.00,
      unit_price: 95.00,
      quantity_in_stock: 120,
      min_stock_threshold: 25,
      expiry_date: safeFutureDate2,
      batch_number: 'DOM-5514-N',
      requires_prescription: false,
      description: 'Dopamine antagonist antiemetic promoting upper gastrointestinal motility.'
    },
    {
      sku: 'MED-1023',
      name: 'Montelukast Sodium (Singulair)',
      generic_name: 'Montelukast',
      category: catMap['Respiratory & Allergy'],
      supplier: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Tablet',
      strength: '10mg',
      cost_price: 360.00,
      unit_price: 540.00,
      quantity_in_stock: 85,
      min_stock_threshold: 20,
      expiry_date: safeFutureDate1,
      batch_number: 'MON-7120-J',
      requires_prescription: true,
      description: 'Leukotriene receptor antagonist for maintenance therapy of persistent asthma and allergic rhinitis.'
    },
    {
      sku: 'MED-1024',
      name: 'Panadol Baby Paracetamol Syrup',
      generic_name: 'Acetaminophen 120mg/5ml',
      category: catMap['Analgesics & Pain Relief'],
      supplier: supMap['Hemas Pharmaceuticals (Pvt) Ltd'],
      dosage_form: 'Syrup',
      strength: '60ml bottle',
      cost_price: 240.00,
      unit_price: 360.00,
      quantity_in_stock: 65,
      min_stock_threshold: 15,
      expiry_date: safeFutureDate2,
      batch_number: 'PDB-9041-S',
      requires_prescription: false,
      description: 'Gentle sugar-free paediatric analgesic and antipyretic liquid for infants and children.'
    },
    {
      sku: 'MED-1025',
      name: 'Jeevani Oral Rehydration Salts',
      generic_name: 'WHO-formula Oral Electrolytes',
      category: catMap['Gastrointestinal & Antacids'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Other',
      strength: '1 Litre Sachet',
      cost_price: 45.00,
      unit_price: 75.00,
      quantity_in_stock: 250,
      min_stock_threshold: 40,
      expiry_date: safeFutureDate3,
      batch_number: 'ORS-6610-E',
      requires_prescription: false,
      description: 'Official WHO formula oral rehydration salts for electrolyte replenishment in acute dehydration.'
    },
    {
      sku: 'MED-1026',
      name: 'Hydrocortisone 1% Topical Cream',
      generic_name: 'Hydrocortisone 1%',
      category: catMap['Dermatological & Topical'],
      supplier: supMap['Emerchemie NB (Ceylon) Ltd'],
      dosage_form: 'Ointment',
      strength: '15g tube',
      cost_price: 195.00,
      unit_price: 310.00,
      quantity_in_stock: 40,
      min_stock_threshold: 12,
      expiry_date: safeFutureDate1,
      batch_number: 'HYD-2309-R',
      requires_prescription: false,
      description: 'Mild topical corticosteroid for temporary relief of eczema, insect bites, and allergic dermatitis.'
    },
    {
      sku: 'MED-1027',
      name: 'Dexamethasone Eye Drops 0.1%',
      generic_name: 'Dexamethasone Sodium Phosphate',
      category: catMap['Ophthalmic & ENT'],
      supplier: supMap['A. Baur & Co. (Pvt) Ltd'],
      dosage_form: 'Drops',
      strength: '5ml vial',
      cost_price: 290.00,
      unit_price: 460.00,
      quantity_in_stock: 18,
      min_stock_threshold: 10,
      expiry_date: safeFutureDate2,
      batch_number: 'DEX-4491-Y',
      requires_prescription: true,
      description: 'Potent anti-inflammatory corticosteroid ophthalmic solution for non-infectious ocular inflammation.'
    },
    {
      sku: 'MED-1028',
      name: 'Tramadol Hydrochloride',
      generic_name: 'Tramadol',
      category: catMap['Analgesics & Pain Relief'],
      supplier: supMap['State Pharmaceuticals Corporation (SPC)'],
      dosage_form: 'Capsule',
      strength: '50mg',
      cost_price: 340.00,
      unit_price: 520.00,
      quantity_in_stock: 30,
      min_stock_threshold: 10,
      expiry_date: safeFutureDate1,
      batch_number: 'TRM-1010-Z',
      requires_prescription: true,
      description: 'Centrally-acting opioid analgesic strictly regulated under NMRA controlled narcotics schedule.'
    }
  ];

  let addedCount = 0;
  let updatedCount = 0;

  for (const med of medicinesList) {
    const existing = await Medicine.findOne({ sku: med.sku });
    if (existing) {
      await Medicine.updateOne({ sku: med.sku }, { $set: med });
      updatedCount++;
    } else {
      await Medicine.create(med);
      addedCount++;
    }
  }

  // 6. Ensure at least 3 verified Sales Invoices exist with valid medicine references
  const existingSalesCount = await Sale.countDocuments();
  if (existingSalesCount === 0) {
    console.log('Seeding initial verified sales invoices...');
    const panadol = await Medicine.findOne({ sku: 'MED-1002' });
    const amox = await Medicine.findOne({ sku: 'MED-1001' });
    const omep = await Medicine.findOne({ sku: 'MED-1007' });

    if (panadol && amox && omep) {
      await Sale.create([
        {
          invoice_number: 'INV-0001',
          pharmacist: pharmacistUser._id,
          customer_name: 'Nimal Jayawardena',
          customer_phone: '0771234567',
          prescription_id: 'SLMC-8812',
          items: [
            {
              medicine: amox._id,
              medicine_name: amox.name,
              sku: amox.sku,
              quantity: 2,
              unit_price: amox.unit_price,
              total_price: amox.unit_price * 2
            },
            {
              medicine: panadol._id,
              medicine_name: panadol.name,
              sku: panadol.sku,
              quantity: 1,
              unit_price: panadol.unit_price,
              total_price: panadol.unit_price
            }
          ],
          subtotal: (amox.unit_price * 2) + panadol.unit_price,
          discount_percent: 5,
          discount_amount: ((amox.unit_price * 2) + panadol.unit_price) * 0.05,
          total_amount: ((amox.unit_price * 2) + panadol.unit_price) * 0.95,
          payment_method: 'Cash'
        },
        {
          invoice_number: 'INV-0002',
          pharmacist: adminUser._id,
          customer_name: 'Anoma Wickramasinghe',
          customer_phone: '0714567890',
          prescription_id: '',
          items: [
            {
              medicine: omep._id,
              medicine_name: omep.name,
              sku: omep.sku,
              quantity: 1,
              unit_price: omep.unit_price,
              total_price: omep.unit_price
            }
          ],
          subtotal: omep.unit_price,
          discount_percent: 0,
          discount_amount: 0,
          total_amount: omep.unit_price,
          payment_method: 'Card'
        }
      ]);
      console.log('Seeded sample sales invoices successfully.');
    }
  }

  console.log(`\n======================================================`);
  console.log(`✅ Database Seeding & Optimization Complete!`);
  console.log(`   - New Medicines added: ${addedCount}`);
  console.log(`   - Existing Medicines updated: ${updatedCount}`);
  console.log(`   - Total Medicines in catalog: ${await Medicine.countDocuments()}`);
  console.log(`   - Total Therapeutic Categories: ${await Category.countDocuments()}`);
  console.log(`   - Total Suppliers: ${await Supplier.countDocuments()}`);
  console.log(`   - Total Sales Recorded: ${await Sale.countDocuments()}`);
  console.log(`   - Users configured: ${await User.countDocuments()}`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding Error:', err);
  process.exit(1);
});
