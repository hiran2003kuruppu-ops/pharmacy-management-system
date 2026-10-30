# Demonstration Video Presentation Script (Max 5 Minutes)
## Course: EE4207 Web Application Development
### Topic: PharmaCare Pro - Pharmacy Management System

> **Important Reminders for Recording:**
> - Keep the video duration **under 5 minutes** (penalties apply if exceeded).
> - Ensure your **webcam/camera is turned on** showing your face throughout the presentation.
> - Rename the recorded video file using your **index number** before submitting.

---

### Timing Breakdown Table

| Timestamp | Section | Key Talking Points & Actions to Show |
| :--- | :--- | :--- |
| **0:00 - 0:45** | **1. Introduction & Overview** | Introduce yourself, index number, and project topic. Present the Dashboard KPIs and live Chart.js charts. |
| **0:45 - 1:45** | **2. Create & Read (CRUD)** | Navigate to Medicines Inventory. Demonstrate live search, category filter, and add a new drug with form validation. |
| **1:45 - 2:45** | **3. Update, Restock & Safe Delete** | Open medicine details, adjust stock (+20 units), edit pricing, and showcase safe deletion protection. |
| **2:45 - 3:45** | **4. POS, Rx Check & Billing** | Go to Point of Sale (POS). Add medications to cart. Show prescription validation requirement and generate official receipt. |
| **3:45 - 4:30** | **5. Database & UI Responsiveness** | Highlight SQLite 3NF relational schema, dark/light mode toggle, and mobile responsive layout. |
| **4:30 - 5:00** | **6. Conclusion & Wrap-up** | Summarize how all rubric criteria were satisfied. Thank the evaluator. |

---

### Word-For-Word Presentation Script

#### **[0:00 - 0:45] 1. Introduction & Dashboard Overview**
*(Look directly into the camera with camera turned on)*
> "Hello everyone and respected evaluator. My name is **[Your Name]**, student index number **[Your Index Number]**, and this is my submission for the EE4207 Web Application Development Mini Project.
> 
> My project topic is **PharmaCare Pro**, a full-stack Pharmacy Inventory and Point of Sale Management System built using **Node.js, Express, SQLite (`better-sqlite3`), and vanilla HTML5, CSS3, and JavaScript**.
> 
> As you can see on the screen, we start on the **Dashboard**. It provides real-time KPI metrics: total medicine items, inventory retail valuation, out-of-stock items, and low-stock warnings. Below, we have two live Chart.js charts visualizing drug category breakdown and 7-day sales revenue trends, alongside an attention table highlighting items nearing expiration or requiring immediate restocking."

---

#### **[0:45 - 1:45] 2. Inventory Read & Create Operations**
*(Click 'Medicines Inventory' in the sidebar)*
> "Now let's examine the core **Read** functionality in our inventory catalogue. 
> Notice how typing into the search box—for example, searching for *'Amox'*—instantly filters the table in real-time. We can also filter by therapeutic category, stock status, or expiry timeline, and sort by price, name, or stock levels with full pagination.
> 
> Next, let's demonstrate the **Create** operation. I'll click **'Add Medicine'**. 
> The modal form features full client and server-side validation. If I attempt to enter a selling price lower than the cost price, the system immediately flags the error.
> 
> Let's add a valid new medicine: SKU `MED-8850`, Brand Name *'Cefixime Oral Suspension'*, Generic *'Cefixime'*, Category *'Antibiotics'*, Dosage *'Syrup'*, Strength *'100mg/5ml'*, Batch `CFX-2026-A`, Cost `Rs. 350.00`, Selling `Rs. 520.00`, and initial quantity of 50 units.
> 
> Upon saving, a success toast notification appears, the database record is created, and it appears immediately in the table."

---

#### **[1:45 - 2:45] 3. Details, Update, Stock Adjustment & Safe Deletion**
> "For the **Update** operation, we can click the edit icon on any medicine. The form pre-populates current values. Let's adjust the selling price from `Rs. 520.00` to `Rs. 550.00` and save. The record updates persistently in the SQLite database.
> 
> We also have a dedicated **Stock Adjustment** modal for quick restocking or recording damaged units, which maintains an audit log.
> 
> Now, let's look at the **Delete** operation and our relational integrity safety check. 
> If I try to delete *'Amoxicillin Trihydrate'*, which has existing sales invoices recorded in the system, our confirmation modal and backend foreign key protection block the action, informing the user that financial records cannot be corrupted.
> 
> Conversely, if we select an unlinked medicine—like the test item we just added—we can click delete, confirm in the safety modal, and it is safely removed from the database."

---

#### **[2:45 - 3:45] 4. Point of Sale (POS), Prescription Check & Receipt**
*(Click 'Point of Sale (POS)' in the sidebar)*
> "Next is our **Point of Sale** counter. Pharmacists can click any medication card to add it to the cart. 
> 
> If we add a regulated drug that requires a prescription, the system automatically marks the **Doctor Prescription ID** field as required. Attempting to check out without an Rx reference displays a clear error.
> 
> Let's enter the customer name *'David Clark'*, phone number, enter prescription ID *'DR-9921'*, apply a 5% discount, and choose payment by Card.
> 
> When I click **'Complete Dispensation'**, the system executes an atomic transaction: it verifies stock availability, deducts inventory units, saves the invoice, and immediately renders this official printable receipt with invoice numbers and itemized tax calculations."

---

#### **[3:45 - 4:30] 5. Database Architecture & UI/UX Responsiveness**
*(Click theme toggle icon, then resize or open Category/Supplier views)*
> "Under the hood, the system is backed by a fully normalized **3NF SQLite database** with tables for Categories, Suppliers, Medicines, Sales Invoices, Sale Items, and Audit Logs. Foreign keys and domain check constraints ensure zero invalid data can enter the system.
> 
> On the frontend, we feature a sleek medical design with an instant **Dark Mode / Light Mode** toggle, smooth glassmorphism, accessible modal dialogs, and comprehensive mobile responsiveness with an off-canvas drawer navigation for tablets and smartphones."

---

#### **[4:30 - 5:00] 6. Conclusion**
*(Look into camera)*
> "In summary, PharmaCare Pro satisfies all evaluation rubric requirements: full CRUD operations on persistent database entities, robust validation, relational database design, sleek responsive UI/UX, and complete documentation.
> 
> Thank you very much for your time and evaluation!"
