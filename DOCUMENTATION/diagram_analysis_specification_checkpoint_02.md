# System Diagram Analysis Specification — Checkpoint 02

* **Project Name:** General E-Commerce (Computer Accessories E-Commerce)
* **Repository:** `https://github.com/huyhehe-bipbip/computer-accessories-ecommerce`
* **Documentation Artifacts Analyzed:** `UseCase_Checkpoint02` & `UserFlow_Checkpoint02`
* **Technology Stack:** Frontend (`HTML5`, `CSS3`, `JavaScript`) | Backend (`C# .NET Core`) | Database (`SQL Server`)

---

## 1. Use-Case Diagram Analysis (`UseCase_Checkpoint02`)

The **Use-Case Diagram** defines the functional scope, actor permissions, and behavioral dependencies of the **Computer Accessories E-Commerce** platform for Checkpoint 02.

### 1.1. System Boundary & Architectural Zoning
The system boundary encapsulates **21 standardized use cases** (`UC01`–`UC21`), partitioned into two distinct operational zones to enforce clear separation of concerns:
* **Customer Storefront Zone (`UC01`–`UC14`):** Covers public product discovery, session-based and authenticated cart operations, tiered pricing resolution, coupon validation, and simulated order placement.
* **Admin Portal Zone (`UC15`–`UC21`):** Isolates back-office operations across five management modules (Categories, Products & Inventory, Coupons, Orders, and User Accounts).

### 1.2. Actor Hierarchy & Inheritance
* **Guest (`Khách vãng lai`):** Represents an unauthenticated visitor interacting with the storefront via browser session/cookie tracking. Guests can execute `UC01`, `UC02`, `UC05`, `UC06`, `UC07`, `UC09`, and `UC10`.
* **Member (`Thành viên`):** Connected to **Guest** via a UML Generalization arrow (`<<inherits>>`). A Member inherits every browsing, cart, and checkout capability of a Guest while gaining exclusive access to member authentication (`UC03`) and discounted tiered pricing (`UC08`).
* **Admin (`Quản trị viên`):** An independent privileged actor operating exclusively inside the Admin Portal (`UC15`–`UC21`) with no inheritance overlap with customer roles.

### 1.3. Key UML Behavioral Dependencies (`<<include>>` & `<<extend>>`)
* **Optional Extensions (`<<extend>>`):**
  * `UC04 (Recover / Reset Password)` extends `UC03 (Login to Member Account)`, triggered only when a registered user forgets their credentials.
  * `UC11 (Apply & Validate Coupon Code)` extends `UC10 (Checkout & Enter Shipping Info)`, allowing customers to optionally apply promotional discounts without blocking standard checkout.
* **Mandatory Inclusions (`<<include>>`):**
  * `UC10 (Checkout & Enter Shipping Info)` strictly includes both `UC12 (Validate Inventory Stock)` and `UC13 (Simulated Payment & Place Order)` to guarantee that no order is recorded without real-time stock verification.
  * `UC13 (Simulated Payment & Place Order)` includes `UC14 (View Order Confirmation Page)` to provide immediate post-transaction feedback.
  * All administrative management use cases (`UC16` through `UC21`) include `UC15 (Admin Portal Authentication)`, enforcing mandatory credential verification before any CRUD operation is permitted.

---

## 2. User-Flow & Swimlane Execution Analysis (`UserFlow_Checkpoint02`)

The **User-Flow Diagram** models the end-to-end runtime execution, branching logic, exception handling, and database persistence across **three parallel swimlanes**.

### 2.1. Swimlane 1: Customer Interface Flow (Guest & Member)
1. **Entry & Identity Resolution:**
   * Upon visiting the website, routing diverges at the **Select Role / Entry Point** decision node into either the Customer Storefront or the Admin Portal.
   * Within the customer branch, the flow evaluates membership status (`Already a Member?`). Existing members must pass both credential verification and an account status check (`Valid & Active?`), blocking banned or suspended accounts from logging in. Unauthenticated visitors can either register (`INSERT users`) or bypass registration (`Continue as Guest` with `user_id = NULL`).
2. **Catalog Filtering & Tiered Pricing:**
   * Both Guest and Member paths converge at **Browse Visible Categories & Search Products**, which queries only visible categories (`is_visible = 1`) and active products.
   * On the product detail view, the system dynamically resolves unit pricing: Guests receive standard `Guest Price`, whereas logged-in Members unlock `Member Price`.
3. **Cart, Coupon & Two-Stage Gatekeeping:**
   * Users manage quantities in `cart_items` with real-time subtotal calculation.
   * At checkout, if a coupon code is entered (`Apply Coupon Code?`), the system validates its active status and expiration date (`Validate Coupon`) before deducting a percentage (`%`) or fixed discount.
   * After collecting shipping details (Full Name, Phone Number, Shipping Address), the system executes a critical inventory gate (`Sufficient Stock?` checking $\text{stock\_quantity} \ge \text{qty}$). If stock is insufficient, execution loops back via an **Out of Stock Alert** to force cart adjustment.
4. **Atomic Order Recording:**
   * Passing stock validation triggers **Simulated Payment & Order Recording**, writing the order header (`orders` with default status `Pending`), recording line items (`order_items`), deducting purchased quantities from `products`, and terminating at the **Order Confirmation Page**.

### 2.2. Swimlane 2: Admin Portal Flow (5 Operational Modules)
1. **Access Control Gate:** Administrators authenticate via **Admin Login**; invalid credentials trigger an **Access Denied Alert**, while valid credentials grant access to the **Admin Portal Dashboard**.
2. **Module Execution Paths:**
   * **Category Management:** Full CRUD operations plus storefront visibility toggles (`is_visible`).
   * **Product & Inventory Management:** Full CRUD operations, dual-tier price configuration (`guest_price` and `member_price`), stock quantity adjustments, and product availability status updates (`Active`, `Inactive`, `Out of Stock`).
   * **Coupon Code Management:** Creation of promotional codes (`%` or fixed value), expiration date configuration, and lifecycle toggles (`Activate`, `Deactivate`, `Delete`).
   * **Order & Fulfillment Management:** Inspection of both Guest and Member transactions and sequential progression across the 5-stage order lifecycle:
     $$\text{Pending} \longrightarrow \text{Processing} \longrightarrow \text{Shipping} \longrightarrow \text{Completed} \text{ (or } \text{Cancelled}\text{)}$$
   * **User Account Management:** Inspection of registered member profiles and administrative account state control (`Ban`, `Suspend`, or `Reactivate`).

### 2.3. Swimlane 3: SQL Server Database & Entity Relationships (`schema-review.sql`)
The third swimlane maps runtime operations directly onto **7 relational tables** and **7 foreign-key relationships**:

| Relationship | Cardinality | Architectural & Business Rule |
| :--- | :---: | :--- |
| **`categories` $\rightarrow$ `products`** | $1 : N$ | Each category groups multiple products via `category_id`; visibility toggles hide entire product groups without deleting records. |
| **`users` $\rightarrow$ `cart_items`** | $1 : 0..N$ | Supports persistent carts for authenticated Members (`user_id`) and nullable `user_id` (`NULL`) paired with `session_id` for Guests. |
| **`products` $\rightarrow$ `cart_items`** | $1 : 0..N$ | Links cart entries to specific catalog items (`product_id`) for real-time subtotal computation. |
| **`users` $\rightarrow$ `orders`** | $1 : 0..N$ | Associates historical orders with registered Members while permitting `user_id = NULL` for Guest Checkout transactions. |
| **`coupons` $\rightarrow$ `orders`** | $0..1 : 0..N$ | Optional foreign key (`coupon_id`) allowing zero or one validated promotional code per order. |
| **`orders` $\rightarrow$ `order_items`** | $1 : 1..N$ | Enforces that every committed order contains at least one line item. |
| **`products` $\rightarrow$ `order_items`** | $1 : 0..N$ | Captures a historical `unit_price` snapshot at checkout so future price edits do not corrupt past order totals. |

---

## 3. Checkpoint 02 Traceability Matrix

The matrix below links each Use-Case group to its corresponding User-Flow control nodes and SQL Server persistence operations:

| Functional Area | Use Cases | User-Flow Control / Process Nodes | SQL Server CRUD Operations |
| :--- | :--- | :--- | :--- |
| **Authentication & Roles** | `UC01`–`UC04`, `UC15` | `Select Role?`, `Already a Member?`, `Valid & Active?`, `Valid Admin Account?` | `SELECT` / `INSERT` / `UPDATE` on `users` |
| **Catalog & Tiered Pricing** | `UC05`–`UC08` | `Browse Visible Categories`, `View Product Details & Tiered Pricing` | `SELECT` on `categories`, `products` |
| **Cart & Promotions** | `UC09`, `UC11` | `Manage Cart`, `Apply Coupon Code?`, `Validate Coupon` | `CRUD` on `cart_items`; `SELECT` on `coupons` |
| **Checkout & Fulfillment** | `UC10`, `UC12`–`UC14` | `Fill Shipping Info`, `Sufficient Stock?`, `Simulated Payment` | `INSERT` on `orders`, `order_items`; `UPDATE` on `products` |
| **Back-Office Administration** | `UC16`–`UC21` | `Admin Portal Dashboard` $\rightarrow$ `Modules 1–5` | `CRUD` across all 7 tables in `schema-review.sql` |