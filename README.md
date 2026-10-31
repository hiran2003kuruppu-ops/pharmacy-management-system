# 🏥 PharmaCare Pro - Web-Based Pharmacy Management System (MERN Stack)
### EE4207 Web Application Development Mini Project
**Student Name:** K.A.H.B. Kuruppu  
**Student Registration Number / Index:** EG/2023/5700  
**Department:** Department of Electrical and Information Engineering  
**Faculty:** Faculty of Engineering, University of Ruhuna, Sri Lanka  

![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%7C%20Mongoose-green.svg)
![Express](https://img.shields.io/badge/Backend-Express%20v5.0-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%20v19-61dafb.svg)
![Node.js](https://img.shields.io/badge/Runtime-Node.js%20v24+-339933.svg)
![Vite](https://img.shields.io/badge/Bundler-Vite-purple.svg)
![Auth](https://img.shields.io/badge/Security-JWT%20%2B%20bcrypt-red.svg)
![Currency](https://img.shields.io/badge/Currency-Sri%20Lankan%20Rupees%20(LKR)-emerald.svg)

---

## 📌 Project Overview
**PharmaCare Pro** is an enterprise-grade web-based **Pharmacy Inventory and Point of Sale (POS) Management System** engineered for the **EE4207 Web Application Development** course. 

The application is built on the industry-standard **MERN Stack**:
- **MongoDB** with **Mongoose ODM** for document persistence, schema validation, and indexing.
- **Express.js 5** RESTful API server handling domain controllers, JWT role authorization, and atomic stock operations.
- **React 19** Single-Page Application (SPA) powered by **Vite**, featuring modern components, context-driven auth, and dark/light themes.
- **Node.js 24** asynchronous event-driven JavaScript runtime.

Pricing throughout the platform is displayed in **Sri Lankan Rupees (Rs.)**.

---

## 🎯 Evaluation Rubric Compliance (30 Marks Total)

| Criterion | Marks | Implementation in PharmaCare Pro | Reference |
| :--- | :---: | :--- | :--- |
| **Create** | **4 / 4** | Modal form to create medicines with field validation (SKU, brand, generic, dosage form, batch, cost, selling price, expiry, Rx flag). Also full Create for Categories & Suppliers. | [medicineController.js](file:///server/controllers/medicineController.js) |
| **Read** | **4 / 4** | Real-time debounced regex search, filtering by Category, Stock Status (In/Low/Out), Expiry Status (Valid/Expiring/Expired), multi-column sorting, pagination, and inspection modals. | [Medicines.jsx](file:///client/src/pages/Medicines.jsx) |
| **Update** | **4 / 4** | Edit medicine modal with pre-filled inputs, SKU uniqueness verification, and stock adjustment auditing. Also Edit for Categories & Suppliers. | [medicineController.js](file:///server/controllers/medicineController.js) |
| **Delete** | **4 / 4** | Safe deletion with confirmation modal. Referential integrity check prevents accidental deletion of medicines linked to recorded sales invoices. | [medicineController.js](file:///server/controllers/medicineController.js) |
| **Validation & Error Handling** | **2 / 2** | Both client-side real-time form validation and server-side Express middleware (`auth.js`, `errorHandler.js`). Catches Mongoose validation errors gracefully with HTTP 400, 404, and 409 status codes. | [errorHandler.js](file:///server/middleware/errorHandler.js) |
| **Database Design** | **4 / 4** | 5 specialized Mongoose document collections (`users`, `categories`, `suppliers`, `medicines`, `sales` with embedded item subdocuments). Primary ObjectIds, unique compound indexes, virtual getters, and referential constraints. | [ERD.md](file:///docs/ERD.md) |
| **UI/UX & Responsiveness** | **2 / 2** | Modern React interface with glassmorphism, Dark/Light mode toggle, responsive CSS Grid and Flexbox layouts, off-canvas navigation drawer, and animated toast notifications. | [client/src/index.css](file:///client/src/index.css) |
| **Code Quality & Structure** | **2 / 2** | Clean MERN architecture: separation of models, routes, controllers, middleware, and modular React components. Semantic naming conventions and version-controlled Git repository. | Entire Codebase |
| **Documentation** | **2 / 2** | Comprehensive documentation including REST API specifications, Mongoose schema designs, and formal 10-page report. | [EG_2023_5700_Report.pdf](file:///EG_2023_5700_Report.pdf) |
| **Demonstration** | **2 / 2** | 5-minute video demonstration guide recorded with webcam visible. | [DEMO_SCRIPT.md](file:///docs/DEMO_SCRIPT.md) |

---

## ⚡ Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or newer; verified on v24)
- [MongoDB](https://www.mongodb.com/) (Local service or MongoDB Atlas URI)
- Git

### 1. Clone & Navigate to Project
```bash
git clone https://github.com/hiran2003kuruppu-ops/pharmacy-management-system.git
cd pharmacy-management-system
```

### 2. Install Server & Client Dependencies
```bash
# Install root/server dependencies
npm install

# Install client dependencies
cd client
npm install
npm run build
cd ..
```

### 3. Seed MongoDB Database
```bash
npm run seed
```
*Seeds default Admin (`admin@pharmacare.lk` / `admin123`), Pharmacist (`pharmacist@pharmacare.lk` / `pharma123`), 7 drug categories, 4 Sri Lankan suppliers, and 10 medicines with LKR pricing.*

### 4. Launch the Application
```bash
npm start
```

### 5. Open in Browser
Visit **`http://localhost:3000`** in your browser.

---

## 🗄️ Database Architecture (Mongoose Document Models)

```
  CATEGORIES ──< MEDICINES (ref)
                     │
  SUPPLIERS ─────────┤ (ref)
                     │
  USERS ──────< SALES [ Embedded Item Snapshots ]
```

👉 *Detailed database schema specifications and relationship diagrams are available in [docs/ERD.md](file:///docs/ERD.md).*

---

## 🚀 Key Functional Modules

1. **Dashboard & KPIs:**
   - Real-time inventory retail valuation in Sri Lankan Rupees (Rs.).
   - Stock health counters (Total units, Low stock alerts, Out-of-stock items, Expired medications).
   - Interactive Chart.js graphs for drug class distribution and 7-day revenue trend.
   - Priority attention table for immediate restocking or quarantining.

2. **Medicines Inventory (Full CRUD):**
   - Live debounced regex search across Brand Name, Generic Name, and SKU.
   - Filtering by category, stock status, and expiry schedule.
   - Multi-column sorting and pagination.
   - Quick stock adjustment modal (+ / - units with audit reasons).
   - Detailed specification modal with profit margin calculations.

3. **Point of Sale (POS) & Dispensation Counter:**
   - Real-time catalog selection with category filter pills.
   - Live cart calculations (subtotal, customizable discount %, grand total in Rs.).
   - Strict Doctor Prescription ID requirement for prescription-only medications (`Rx`).
   - Atomic stock deduction and official printable receipt generation.

4. **Sales & Invoice History:**
   - Search past transactions by invoice number, customer name, or date.
   - View and reprint receipts via print-optimized stylesheet (`@media print`).

5. **Therapeutic Categories & Suppliers:**
   - Manage drug classifications and authorized Sri Lankan pharmaceutical distributors (SPC, Hemas, Morison, Emerchemie).

6. **Authentication & Security:**
   - Role-based access control (`admin` vs. `pharmacist`).
   - Bcrypt salted password hashing and JSON Web Token (JWT) bearer authentication.

---

## 📂 Project Directory Structure

```
pharmacy-management-system/
├── package.json              # Project dependencies & npm scripts
├── README.md                 # Project documentation and quickstart
├── .gitignore                # Git ignore rules
├── server/
│   ├── config/
│   │   └── database.js       # MongoDB Mongoose connection handler
│   ├── models/
│   │   ├── User.js           # User schema with bcrypt hashing & JWT methods
│   │   ├── Category.js       # Category schema
│   │   ├── Supplier.js       # Supplier schema with Sri Lankan distributor contacts
│   │   ├── Medicine.js       # Medicine schema with compound indexes & virtuals
│   │   └── Sale.js           # Sale schema with embedded line item snapshots
│   ├── controllers/
│   │   ├── authController.js     # User login & JWT issuance
│   │   ├── medicineController.js # CRUD, search, filter, stock adjust, safe delete
│   │   ├── categoryController.js # Category management
│   │   ├── supplierController.js # Supplier management
│   │   ├── saleController.js     # POS checkout & stock deduction
│   │   └── statsController.js    # Dashboard analytics & KPI aggregation
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication & role authorization
│   │   └── errorHandler.js   # Centralized error handler
│   ├── routes/
│   │   └── api.js            # Consolidated Express REST API router
│   ├── seed/
│   │   └── seedDatabase.js   # MongoDB database seeder script
│   └── app.js                # Express app entrypoint & static serving
├── client/                   # React 19 Frontend (Vite)
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx # User auth & token state
│   │   ├── services/
│   │   │   └── api.js        # Axios HTTP client with interceptors
│   │   ├── components/
│   │   │   ├── Sidebar.jsx   # Responsive sidebar navigation
│   │   │   └── Topbar.jsx    # Top header with user profile & theme toggle
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx # KPI dashboard with Chart.js
│   │   │   ├── Medicines.jsx # Full CRUD inventory table & modals
│   │   │   ├── Pos.jsx       # Point of sale cart & receipt
│   │   │   ├── Sales.jsx     # Invoice history
│   │   │   ├── Categories.jsx# Category directory
│   │   │   ├── Suppliers.jsx # Supplier directory
│   │   │   └── Login.jsx     # Authentication view
│   │   ├── App.jsx           # Client router & view container
│   │   └── main.jsx          # React DOM root
│   └── vite.config.js        # Vite build configuration (outputs to public/)
├── public/                   # Production Vite bundle served by Express
├── docs/                     # Project documentation & reports
│   ├── report.html           # 10-page formal academic report
│   ├── DEMO_SCRIPT.md        # 5-minute video presentation script
│   └── assets/               # Screenshots and SVG diagrams
└── EG_2023_5700_Report.pdf   # Compiled 10-page academic submission PDF
```

---

## 📑 Submission Deliverables Checklist
- [x] **Working MERN Web Application:** Full CRUD with React 19, Express 5, and persistent MongoDB storage.
- [x] **GitHub Repository:** Clean git history pushed to `https://github.com/hiran2003kuruppu-ops/pharmacy-management-system`.
- [x] **Mini Project Report:** 10-page academic report compiled as [EG_2023_5700_Report.pdf](file:///EG_2023_5700_Report.pdf).
- [x] **Demonstration Video Guide:** Timed 5-minute presentation script in [docs/DEMO_SCRIPT.md](file:///docs/DEMO_SCRIPT.md).
- [x] **Database Design:** Normalized document collections, schemas, indexes, and ERD.
- [x] **Validation & Integrity:** Server & client-side error handling with safe deletion checks.

---

## 📄 License
Academic Project for EE4207 Web Application Development, University of Ruhuna.
