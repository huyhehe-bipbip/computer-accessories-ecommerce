# System Analysis Specification — Computer Accessories E-Commerce

## 1. Problem Statement & Stakeholder Analysis

The **Computer Accessories E-Commerce** system addresses a core friction point in online retail: forcing mandatory account registration leads to high cart abandonment rates, whereas lacking membership incentives reduces repeat customer loyalty. The architecture resolves this trade-off through frictionless **Guest Checkout** paired with an exclusive **Tiered Pricing** model:

* **Guest:** Unauthenticated visitors who can browse visible categories, inspect product details, manage a session-based shopping cart (`session_id`), and complete checkout without registering. Guests are billed at the standard `Guest Price`.
* **Member:** Registered target customers (such as university students, office workers, and general consumers) who log in to unlock discounted `Member Price` rates, persistent cart storage tied to `user_id`, and account-linked order records.
* **Administrator (Admin):** System operators who manage store operations via a dedicated **Admin Portal** covering five core modules: Categories, Products & Inventory, Coupons, Orders, and User Accounts.

---

## 2. Business Process & Logic Analysis

### 2.1. Tiered Pricing & Session Transition Logic

* **Dual-Price Display:** Both the product catalog and product detail pages display `Guest Price` and `Member Price` side by side to encourage natural member registration.
* **Dynamic Price Resolution:** The backend evaluates the user's authentication state during cart calculation and checkout:
  * When `user_id` is `NULL` (unauthenticated Guest session), line items use `guest_price`.
  * When authenticated with an `Active` member account, line items automatically switch to `member_price`.

### 2.2. Coupon & Two-Layer Inventory Validation

* **Coupon Verification:** When a discount code is submitted at checkout, the system validates three rules against the `coupons` table: code existence, `Active` status, and non-expired `expiry_date`. Valid coupons deduct either a percentage (`%`) or a fixed monetary amount (`Fixed Amount`) from the provisional subtotal.
* **Two-Layer Stock Validation:**
  * *UI Layer (Preventive):* Products with `stock_quantity = 0` or status `Out of Stock` / `Inactive` disable the "Add to Cart" action on the storefront.
  * *Transaction Layer (Authoritative):* Immediately before committing an order to SQL Server, the backend re-verifies `stock_quantity >= quantity` for every cart item to prevent overselling.

### 2.3. Simulated Payment & Order Lifecycle State Machine

* **Simulated Payment Execution:** Rather than integrating an external payment gateway, submitting a valid checkout form executes an atomic database transaction that inserts the header into `orders` with default status `Pending`, writes line items into `order_items`, and deducts purchased quantities from `products.stock_quantity`.
* **Order Lifecycle Progression:** Administrators advance fulfillment stages sequentially in the Admin Portal:

$$\text{Pending} \longrightarrow \text{Processing} \longrightarrow \text{Shipping} \longrightarrow \text{Completed} \text{ (or } \text{Cancelled}\text{)}$$

---

## 3. Core Use-Case Specifications

| Use Case ID | Use Case Name | Primary Actor | Preconditions | Main Flow & Exception Handling |
| --- | --- | --- | --- | --- |
| **UC01** | Browse & Search Products | Guest, Member | Category visibility is enabled and product status is `Active`. | User filters by category or enters search keywords; the system queries SQL Server and renders matching items with tiered pricing. *Exception:* Displays an empty-state message if no items match. |
| **UC02** | Manage Shopping Cart | Guest, Member | Product has available stock (`stock_quantity > 0`). | User adds items, updates quantities, or removes entries in `cart_items`, triggering real-time subtotal recalculation. *Exception:* Quantity increments are capped at current `stock_quantity`. |
| **UC03** | Apply Coupon Code | Guest, Member | Cart contains at least one item. | User enters a promo code at checkout; the system validates status and expiration date and applies the `%` or fixed discount. *Exception:* Displays an invalid/expired alert and leaves the total unchanged. |
| **UC04** | Checkout & Simulated Order | Guest, Member | Valid shipping details (Full Name, Phone, Address) and sufficient inventory. | System validates stock, records `orders` (`Pending`) and `order_items`, deducts `stock_quantity`, and renders the order confirmation page. *Exception:* Aborts order creation and prompts cart update if stock runs out. |
| **UC05** | Manage Products & Inventory | Admin | Authenticated Admin session in Admin Portal. | Admin performs CRUD operations on products, sets `Guest Price` and `Member Price`, adjusts `stock_quantity`, and toggles `Active` / `Inactive` / `Out of Stock` statuses. |
| **UC06** | Manage Orders & Accounts | Admin | Authenticated Admin session in Admin Portal. | Admin inspects Guest and Member orders, filters and updates order statuses, views registered member profiles, and bans, suspends, or reactivates user accounts. |

---

## 4. Database Schema & Data Integrity Analysis (SQL Server)

The SQL Server database comprises **7 core entities** (`users`, `categories`, `products`, `cart_items`, `coupons`, `orders`, `order_items`) structured around three integrity rules:

1. **Unified Guest & Member Storage (`Nullable Foreign Keys`):**
   * Both `cart_items` (`1 : 0..N` from `users`) and `orders` (`1 : 0..N` from `users`) define `user_id` as nullable (`NULL` for Guests).
   * Guest carts are isolated via `session_id`, while guest orders capture recipient name, phone number, and shipping address directly in `orders` so Admin fulfillment workflows remain identical for all transactions.
2. **Historical Price Preservation (`Price Snapshot`):**
   * `order_items` (`1 : 1..N` from `orders`, `1 : 0..N` from `products`) stores `unit_price` at the moment of purchase. Future updates by Admins to `guest_price` or `member_price` in `products` will not alter historical order totals.
3. **Non-Destructive Visibility Control:**
   * Categories use visibility toggles and products use `Active` / `Inactive` flags so Admins can hide items from the storefront without breaking foreign-key references in historical `order_items`.

---

## 5. Frontend UI & Client-Side Validation Specifications (HTML5 / CSS3 / JS)

To keep frontend implementation aligned with the C# .NET Core backend and SQL Server schema:

* **Segregated Interfaces:** Implement separate layout shells for the **Customer Interface** (navigation bar, category sidebar, responsive product grid, cart drawer/page) and the **Admin Portal** (sidebar navigation across 5 modules with CRUD data tables and modals).
* **Client-Side JavaScript Validation:**
  * Enforce non-empty recipient name, valid phone number format, and shipping address fields on the checkout form before submitting order requests.
  * Constrain cart quantity selectors (`-` / `+`) between `1` and the product's available `stock_quantity`.
* **Status & Pricing Visual Cues:** Render distinct status badges for order lifecycle stages (`Pending`, `Processing`, `Shipping`, `Completed`, `Cancelled`) and highlight `Member Price` savings on product cards and detail views to drive conversions.
