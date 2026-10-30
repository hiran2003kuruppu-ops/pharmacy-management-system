# EE4207 WEB APPLICATION DEVELOPMENT
## MINI PROJECT REPORT

---

# PHARMACARE PRO: WEB-BASED PHARMACY INVENTORY AND POINT OF SALE (POS) MANAGEMENT SYSTEM

**Course Code:** EE4207 - Web Application Development  
**Project Topic:** Pharmacy Management System  
**Submission Date:** October 2026  
**Technology Stack:** Node.js, Express.js, SQLite3 (`better-sqlite3`), HTML5, CSS3, Vanilla JavaScript, Chart.js  

---

## TABLE OF CONTENTS
1. [Executive Summary](#1-executive-summary)
2. [Introduction & Problem Statement](#2-introduction--problem-statement)
3. [System Architecture & Technology Choices](#3-system-architecture--technology-choices)
4. [Database Design & Normalization](#4-database-design--normalization)
5. [Implementation of Core CRUD Operations](#5-implementation-of-core-crud-operations)
6. [Point of Sale (POS) & Transactional Integrity](#6-point-of-sale-pos--transactional-integrity)
7. [Validation & Error Handling Strategies](#7-validation--error-handling-strategies)
8. [User Interface Design & Responsiveness](#8-user-interface-design--responsiveness)
9. [Testing Scenarios & Evaluation Results](#9-testing-scenarios--evaluation-results)
10. [Setup Guide & Conclusion](#10-setup-guide--conclusion)

---

## 1. EXECUTIVE SUMMARY
Community pharmacies face intricate logistical and regulatory challenges: managing thousands of distinct drug products, tracking expiration dates to avoid dispensing hazardous medicines, enforcing doctor prescription requirements, maintaining stock availability, and processing customer sales rapidly.

**PharmaCare Pro** is an enterprise-grade, web-based Pharmacy Management System designed to address these challenges. Developed under the requirements of course **EE4207**, the application delivers full **CRUD (Create, Read, Update, Delete)** operations on pharmaceutical inventories with persistent storage in an embedded **SQLite** relational database. Additionally, it provides an atomic **Point of Sale (POS)** counter, real-time inventory search and filtering, automated drug expiration warnings, supplier tracking, category classification, and interactive visual analytics.

---

## 2. INTRODUCTION & PROBLEM STATEMENT

### 2.1 Background
Traditional pharmacies frequently rely on fragmented paper ledgers or legacy desktop systems that do not offer real-time stock alerts or robust validation. This leads to:
- Stockouts of life-saving medications.
- Financial losses due to unnoticed drug expiration on storage shelves.
- Accidental dispensing of prescription-only drugs without physician approval.
- Human calculation errors during billing and inventory reconciliation.

### 2.2 Project Objectives
1. **Full CRUD Mastery:** Enable pharmacists to create, inspect, modify, and safely delete medicine records with data persistence.
2. **Search, Filter & Sort:** Provide rapid lookup by brand name, active generic chemical, or SKU barcode, alongside multi-criteria filters (therapeutic category, stock level, expiry schedule).
3. **Relational Integrity:** Establish normalized tables for Medicines, Drug Categories, Suppliers, Sales Invoices, and Sale Items with foreign key guarantees.
4. **Prescription & Expiry Compliance:** Track batch numbers, auto-flag expired or near-expiry batches (within 30 days), and strictly enforce doctor prescription IDs on regulated substances.
5. **Modern User Experience:** Provide a responsive, mobile-compatible layout with light/dark theme toggles, accessible modal dialogs, and instant receipt generation.

---

## 3. SYSTEM ARCHITECTURE & TECHNOLOGY CHOICES

### 3.1 Architectural Pattern
The application follows a clean **Model-View-Controller (MVC)** and **RESTful API** architecture:

```
[ Client Browser (HTML5 / Modern CSS / Vanilla JS) ]
                     │  ▲
                     │  │ JSON via HTTP Fetch API
                     ▼  │
[ Express.js REST API Layer (Routes & Validation Middlewares) ]
                     │  ▲
                     │  │ Controllers & Transactions
                     ▼  │
[ better-sqlite3 Relational Database Engine (pharmacy.db) ]
```

### 3.2 Technology Selection Rationale
- **Backend (Node.js & Express):** Lightweight, asynchronous event-driven runtime ideal for concurrent API requests.
- **Database (SQLite with `better-sqlite3`):** Zero-configuration serverless database engine that persists data to a local file (`pharmacy.db`). It runs synchronously on the Node.js event thread without requiring the evaluator to configure external database services (e.g., MySQL or PostgreSQL daemons). Enabled with WAL mode and foreign key constraints.
- **Frontend (Vanilla HTML5, CSS3, JavaScript):** Engineered without heavy frameworks to demonstrate foundational web programming proficiency. Provides fast page loads, fluid micro-interactions, responsive CSS Grid and Flexbox layouts, and dynamic DOM manipulation.
- **Data Visualization (Chart.js):** Generates live doughnut and line charts representing drug category distribution and 7-day revenue performance.

---

## 4. DATABASE DESIGN & NORMALIZATION

### 4.1 Normalization Process
The schema is normalized to **Third Normal Form (3NF)**:
- **1NF:** All attributes contain atomic values; composite repeating groups (such as invoice items) are split into a dedicated `sale_items` table.
- **2NF:** Every non-key attribute is fully functionally dependent on the primary key (no partial dependencies).
- **3NF:** Transitive dependencies are eliminated by separating suppliers and categories into distinct entity tables referenced by foreign keys.

### 4.2 Entity Relationship Diagram (ERD)

```
 +--------------------+       +----------------------------+
 |     CATEGORIES     |       |         SUPPLIERS          |
 +--------------------+       +----------------------------+
 | id (PK)            |       | id (PK)                    |
 | name (UK)          |       | name                       |
 | description        |       | contact_person, phone      |
 +---------+----------+       | email, address             |
           |                  +--------------+-------------+
           | 1:N                             | 1:N
           +----------------+  +-------------+
                            |  |
                     +------v--v------------------+
                     |         MEDICINES          |
                     +----------------------------+
                     | id (PK)                    |
                     | sku (UK)                   |
                     | name, generic_name         |
                     | category_id (FK)           |
                     | supplier_id (FK)           |
                     | dosage_form, strength      |
                     | cost_price, unit_price     |
                     | quantity_in_stock          |
                     | min_stock_threshold        |
                     | batch_number, expiry_date  |
                     | requires_prescription (Rx) |
                     +--------------+-------------+
                                    |
                    +---------------+---------------+
                    | 1:N                           | 1:N
         +----------v---------+          +----------v---------+
         |     SALE_ITEMS     |          | STOCK_ADJUSTMENTS  |
         +--------------------+          +--------------------+
         | id (PK)            |          | id (PK)            |
         | sale_id (FK)       |          | medicine_id (FK)   |
         | medicine_id (FK)   |          | type, quantity     |
         | quantity           |          | reason, created_at |
         | unit_price         |          +--------------------+
         | subtotal           |
         +----------^---------+
                    | N:1
         +----------+---------+
         |       SALES        |
         +--------------------+
         | id (PK)            |
         | invoice_number(UK) |
         | customer_name      |
         | customer_phone     |
         | doctor_prescription|
         | subtotal, discount |
         | total_amount       |
         | payment_method     |
         +--------------------+
```

### 4.3 Database Integrity Constraints
- **Primary & Foreign Keys:** `id` integers with auto-increment. Enforced with `ON DELETE RESTRICT` on categories and medicines to protect transaction history.
- **Domain CHECK Constraints:**
  - `CHECK(cost_price >= 0)`
  - `CHECK(unit_price >= cost_price)` (Prevents selling below cost)
  - `CHECK(quantity_in_stock >= 0)` (Prevents negative inventory counts)
  - `CHECK(discount_percent >= 0 AND discount_percent <= 100)`
  - `CHECK(payment_method IN ('Cash', 'Card', 'Online', 'Insurance'))`
- **Performance Indexes:** Indexed on `sku`, `name`, `generic_name`, `category_id`, and `expiry_date` for sub-millisecond querying.

---

## 5. IMPLEMENTATION OF CORE CRUD OPERATIONS

### 5.1 CREATE (4 Marks)
- **Interface:** Accessible through the **"Add Medicine"** topbar and inventory button.
- **Features:** Modal form captures Brand Name, Generic Name, SKU, Category (dynamically populated select), Supplier, Dosage Form, Strength, Batch Number, Expiry Date, Cost Price, Selling Price, Initial Stock, Min Stock Alert, and Prescription Requirement flag.
- **Workflow:** Validates required fields and numerical constraints on client-side before sending POST request to `/api/medicines`. Generates an initial stock adjustment audit log upon creation.

### 5.2 READ (4 Marks)
- **Live Search:** Instant debounced search querying across Brand Name, Generic Name, and SKU code simultaneously.
- **Multi-Filter Bar:**
  - *Category Filter:* Filters by specific therapeutic classes.
  - *Stock Status:* Filters by `All`, `In Stock`, `Low Stock (<= min threshold)`, and `Out of Stock (0)`.
  - *Expiry Schedule:* Filters by `Valid (>30 days)`, `Expiring Soon (<=30 days)`, and `Expired`.
- **Multi-Column Sorting:** Sorts ascending or descending by Name, Unit Price, Stock Level, and Expiration Date.
- **Pagination & Details:** Displays records in clean paginated sets (15 per page) with a "View Details" modal revealing complete drug specifications, supplier contact information, and stock movement logs.

### 5.3 UPDATE (4 Marks)
- **Interface:** Triggered by the edit icon on any table row.
- **Pre-Population:** Form auto-fills with current database values.
- **Conflict Avoidance:** Re-validates that the modified SKU does not collide with other medicines.
- **Stock Audit Reconciliation:** If the inventory quantity is adjusted during editing, the difference is calculated and recorded in `stock_adjustments` as a count correction.

### 5.4 DELETE (4 Marks)
- **Safe Removal Workflow:** Clicking the delete icon triggers a modal dialog requiring explicit confirmation.
- **Relational Protection:** The server checks whether the medicine has appeared in past customer sales. If existing invoices exist, deletion is rejected with an informative error message explaining that financial records cannot be destroyed; the user is advised to set stock to 0 instead.
- **Clean Disposal:** If unlinked to past sales, all associated logs and medicine records are safely purged.

---

## 6. POINT OF SALE (POS) & TRANSACTIONAL INTEGRITY

The POS module allows pharmacy technicians to process sales efficiently:
1. **Interactive Cart:** Pharmacists select drugs from an visual catalog. The cart increments quantities and prevents adding items that exceed available stock.
2. **Prescription Enforcement:** If any medication in the cart has `requires_prescription = 1`, the system marks the Doctor Prescription ID field as mandatory.
3. **Atomic Execution:** The transaction runs inside an SQLite `db.transaction()` block:
   - Validates live stock.
   - Calculates line subtotals and discounts.
   - Inserts record into `sales` and line items into `sale_items`.
   - Deducts quantities from `medicines`.
   - In case of any error, rolls back automatically, preventing orphaned or corrupt records.
4. **Printable Receipt:** Immediately renders an official receipt modal with customer name, itemized bill, tax breakdown, and print capability via standard CSS `@media print`.

---

## 7. VALIDATION & ERROR HANDLING STRATEGIES

### 7.1 Client-Side Validation
- HTML5 input types (`type="number"`, `min="0"`, `step="0.01"`, `type="date"`, `required`).
- Real-time JavaScript validation highlights invalid inputs in red and injects field-specific error text under the control without refreshing the page.

### 7.2 Server-Side Validation Middleware
- Every incoming payload passes through dedicated Express middleware (`validator.js`).
- Inspects data types, string lengths, date formats (`YYYY-MM-DD`), and logical consistency (e.g., selling price must be greater than or equal to cost price).
- Returns structured JSON responses with HTTP `400 Bad Request` and an `errors` map.

### 7.3 Stability & Database Error Handling
- A centralized error handling middleware (`errorHandler.js`) intercepts SQLite engine exceptions:
  - `SQLITE_CONSTRAINT_UNIQUE` -> Returns `409 Conflict` (Duplicate SKU or Name).
  - `SQLITE_CONSTRAINT_FOREIGNKEY` -> Returns `409 Conflict` (Referential link exists).
  - `SQLITE_CONSTRAINT_CHECK` -> Returns `400 Bad Request`.
- Guarantees the server remains stable and responsive without unexpected crashes.

---

## 8. USER INTERFACE DESIGN & RESPONSIVENESS

- **Design System:** Engineered with a cohesive medical aesthetic utilizing medical teal (`#0d9488`), trust blue (`#2563eb`), emerald green (`#10b981`), amber warnings (`#f59e0b`), and dark slate backgrounds (`#0f172a`).
- **Typography:** Modern Google Fonts (`Plus Jakarta Sans` for bold headings, `Inter` for data density).
- **Dark/Light Mode:** Includes an instant theme switcher that persists in browser `localStorage`.
- **Mobile Responsiveness:** Adapts via media queries to mobile viewports. On smaller screens, the fixed sidebar converts into an off-canvas drawer toggled by a hamburger menu, and multi-column grids collapse gracefully into single-column layouts.
- **Feedback & Toasts:** Asynchronous operations trigger floating toast notifications (Success, Error, Warning, Info) that automatically dismiss after 4 seconds.

---

## 9. TESTING SCENARIOS & EVALUATION RESULTS

| Test Case ID | Test Description | Input Data | Expected Output | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Create medicine with valid data | SKU: `MED-9999`, Unit Price: `Rs. 650.00`, Stock: 40 | Record created in DB, 201 Created status, toast notification | Successfully created and shown in table | **PASS** |
| **TC-02** | Create medicine with selling price < cost price | Cost: `Rs. 500.00`, Selling: `Rs. 400.00` | Rejected with 400 Bad Request, message: "Selling price cannot be less than cost price" | Blocked by client & server validation | **PASS** |
| **TC-03** | Search filtering by keyword | Query: `"Amox"` | Table filters to Amoxicillin records | Instant filtering displayed | **PASS** |
| **TC-04** | Filter by Expired status | Filter: `expired` | Table displays only drugs with `expiry_date < current_date` | Accurately lists expired items | **PASS** |
| **TC-05** | Update medicine stock | Add 20 units via Stock Modal | Stock count updates, new row in `stock_adjustments` | Stock updated, logged in audit trail | **PASS** |
| **TC-06** | Safe delete protection on medicine with sales | Delete `Amoxicillin Trihydrate` (ID 1) | Deletion blocked, warning explaining existing invoice history | Blocked with 400 Bad Request and safety message | **PASS** |
| **TC-07** | Safe delete unlinked medicine | Delete freshly created medicine (ID 13) | Record removed from DB, success toast displayed | Deleted safely | **PASS** |
| **TC-08** | POS checkout with Rx drug but missing Rx ID | Add `Amlodipine` to cart, blank Doctor Rx ID | Checkout blocked, prompt for physician prescription ID | Blocked with validation error | **PASS** |
| **TC-09** | POS checkout with sufficient stock and Rx ID | Customer: Alice, Rx: `DR-TEST-99`, Qty: 1 | Sale recorded, stock deducted, invoice generated | Invoice created, stock decremented | **PASS** |
| **TC-10** | Attempt to add more than available stock | Available: 5, Requested: 10 | Blocked by cart control with stock warning | Blocked with warning notification | **PASS** |

---

## 10. SETUP GUIDE & CONCLUSION

### 10.1 Quick Start Instructions
1. **Clone Repository:**
   ```bash
   git clone <repository_url>
   cd pharmacy-management-system
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Launch Server:**
   ```bash
   npm start
   ```
4. **Access System:** Open `http://localhost:3000` in any modern web browser.

### 10.2 Conclusion
The **PharmaCare Pro Pharmacy Management System** successfully fulfills all evaluation rubrics set forth in course **EE4207 Web Application Development**. By combining a normalized SQLite database with robust server-side validation, full CRUD workflows, atomic POS transactions, automated expiration detection, and a modern responsive interface, the system provides a dependable, practical solution for real-world pharmacy operations.
