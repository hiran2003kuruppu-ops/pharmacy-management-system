# REST API Documentation
## Pharmacy Management System (PharmaCare Pro)

Base URL: `http://localhost:3000/api`

---

### 1. Medicines Endpoints (`/api/medicines`)

#### **GET `/api/medicines`**
Lists medicines with search, category filtering, stock & expiry status filtering, sorting, and pagination.

- **Query Parameters:**
  - `q` (string): Search query matching `name`, `generic_name`, or `sku`.
  - `category_id` (integer): Filter by category ID.
  - `supplier_id` (integer): Filter by supplier ID.
  - `stock_status` (string): `all` | `in_stock` | `low` | `out`.
  - `expiry_status` (string): `all` | `valid` | `near_expiry` (<= 30 days) | `expired`.
  - `sort_by` (string): `name` | `unit_price` | `quantity_in_stock` | `expiry_date` | `created_at`.
  - `sort_order` (string): `asc` | `desc`.
  - `page` (integer): Page number (default: 1).
  - `limit` (integer): Items per page (default: 50).

- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "MED-1001",
      "name": "Amoxicillin Trihydrate",
      "generic_name": "Amoxicillin",
      "category_id": 2,
      "supplier_id": 1,
      "dosage_form": "Capsule",
      "strength": "500mg",
      "cost_price": 12.0,
      "unit_price": 18.5,
      "quantity_in_stock": 120,
      "min_stock_threshold": 25,
      "expiry_date": "2028-10-15",
      "batch_number": "AMX-2026-B1",
      "requires_prescription": 1,
      "category_name": "Antibiotics & Antimicrobials",
      "supplier_name": "Apex Pharmaceuticals Ltd",
      "stock_status": "IN_STOCK",
      "expiry_status": "VALID",
      "days_until_expiry": 715
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

#### **GET `/api/medicines/:id`**
Retrieves detailed information for a single medicine, including supplier contacts, sales statistics, and audit adjustments.

- **Sample Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "MED-1001",
    "name": "Amoxicillin Trihydrate",
    "generic_name": "Amoxicillin",
    "supplier_name": "Apex Pharmaceuticals Ltd",
    "supplier_phone": "+1-555-0142",
    "adjustments": [
      {
        "id": 1,
        "type": "Restock",
        "quantity": 120,
        "reason": "Initial Inventory Setup",
        "created_at": "2026-10-30 05:00:00"
      }
    ],
    "salesStats": {
      "total_sales": 1,
      "total_units_sold": 2
    }
  }
}
```

#### **POST `/api/medicines`**
Creates a new medicine record in inventory.

- **Request Body (JSON):**
```json
{
  "sku": "MED-2040",
  "name": "Ibuprofen Liquid Gel",
  "generic_name": "Ibuprofen",
  "category_id": 1,
  "supplier_id": 2,
  "dosage_form": "Capsule",
  "strength": "200mg",
  "cost_price": 4.50,
  "unit_price": 7.50,
  "quantity_in_stock": 75,
  "min_stock_threshold": 20,
  "expiry_date": "2028-04-30",
  "batch_number": "IBU-2026-LQ",
  "requires_prescription": 0,
  "description": "Rapid pain relief for headache and inflammation."
}
```

- **Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed. Please correct the highlighted errors.",
  "errors": {
    "unit_price": "Unit selling price cannot be less than cost price.",
    "expiry_date": "Valid expiry date in YYYY-MM-DD format is required."
  }
}
```

#### **PUT `/api/medicines/:id`**
Updates an existing medicine record. Performs unique SKU check against other items and logs any stock level discrepancy as an audit adjustment.

#### **DELETE `/api/medicines/:id`**
Safely deletes a medicine. If the medicine is linked to existing completed sales invoices, deletion is blocked with a 400 Bad Request to prevent corrupting historical records.

#### **POST `/api/medicines/:id/stock`**
Performs a quick stock adjustment:
```json
{
  "type": "Restock", // "Restock" | "Damaged" | "Expired" | "Correction"
  "quantity": 50,
  "reason": "Received shipment invoice PO-9912"
}
```

---

### 2. Point of Sale & Sales Endpoints (`/api/sales`)

#### **POST `/api/sales`**
Executes a multi-item sale transaction atomically within an SQLite transaction:
- Verifies stock quantity availability.
- Enforces physician prescription ID if any medicine has `requires_prescription = 1`.
- Deducts inventory units immediately.
- Calculates subtotal, discount, and final amount.
- Generates official invoice number.

- **Request Body:**
```json
{
  "customer_name": "Sarah Connor",
  "customer_phone": "+1-555-8822",
  "doctor_prescription_id": "RX-88419",
  "discount_percent": 10,
  "payment_method": "Card",
  "items": [
    { "medicine_id": 1, "quantity": 2 },
    { "medicine_id": 2, "quantity": 1 }
  ]
}
```

- **Sample Response (201 Created):**
```json
{
  "success": true,
  "message": "Sale transaction processed successfully.",
  "data": {
    "id": 4,
    "invoice_number": "INV-20261030-4025",
    "customer_name": "Sarah Connor",
    "subtotal": 43.00,
    "discount_percent": 10,
    "total_amount": 38.70,
    "payment_method": "Card",
    "items": [
      {
        "medicine_id": 1,
        "name": "Amoxicillin Trihydrate",
        "quantity": 2,
        "unit_price": 18.50,
        "subtotal": 37.00
      }
    ]
  }
}
```

#### **GET `/api/sales`**
Lists completed sales invoices with date and keyword filters.

#### **GET `/api/sales/:id`**
Retrieves complete invoice data for receipt reprinting.

---

### 3. Categories Endpoints (`/api/categories`)
- `GET /api/categories`: Lists all categories with drug count & stock totals.
- `POST /api/categories`: Creates a new category.
- `PUT /api/categories/:id`: Updates an existing category.
- `DELETE /api/categories/:id`: Deletes category (blocked if drugs are attached).

---

### 4. Suppliers Endpoints (`/api/suppliers`)
- `GET /api/suppliers`: Lists all pharmaceutical suppliers with product counts.
- `POST /api/suppliers`: Registers a new supplier with contact profile.
- `PUT /api/suppliers/:id`: Updates supplier details.
- `DELETE /api/suppliers/:id`: Deletes supplier (sets `supplier_id` to `NULL` on related medicines).

---

### 5. Analytics & Dashboard (`/api/stats/dashboard`)
Returns comprehensive operational aggregates:
- Inventory valuation (retail and cost)
- Low stock and out-of-stock counts
- Expired and near-expiry counts
- Today's sales revenue and transaction counts
- Category breakdown for donut charts
- Critical attention items requiring urgent pharmacist action
- 7-day sales revenue trend
