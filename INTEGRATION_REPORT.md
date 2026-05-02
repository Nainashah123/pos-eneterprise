# POS Enterprise — Integration & QA Report

> Generated: 2026-05-02 | Backend: Railway | Frontend: Vercel | DB: Railway Postgres

---

## HOW TO CHECK NETWORK CALLS (DevTools)

1. Open app → F12 → **Network tab** → filter **Fetch/XHR**
2. Try the action (login, load products, create order, etc.)
3. Click the request → check:
   - **Headers** → Request URL, Method, Authorization header
   - **Payload** → what JSON was sent
   - **Response** → what backend returned (should be `{ success: true, data: {...} }`)
4. Red requests = failed. Click → **Response** tab to see the error message.

---

## ✅ WORKING — API INTEGRATED

| Feature | Endpoint | Notes |
|---------|----------|-------|
| Login | `POST /auth/login` | Stores token in localStorage `pos-auth` |
| Auto token refresh | `POST /auth/refresh` | Fires on 401, retries original request |
| Logout | `POST /auth/logout` | Clears store |
| Dashboard KPIs | `GET /reports/kpis` | Today vs yesterday stats |
| Daily sales chart | `GET /reports/daily-sales` | Date range filter |
| Sales by category | `GET /reports/by-category` | Pie chart data |
| Top products | `GET /reports/top-products` | Top 10 by revenue |
| Products list | `GET /products` | Paginated, searchable |
| Product detail | `GET /products/:id` | |
| Product by barcode | `GET /products/barcode/:barcode` | Used by POS scanner |
| Create product | `POST /products` | ADMIN/MANAGER only |
| Update product | `PATCH /products/:id` | ADMIN/MANAGER only |
| Delete product | `DELETE /products/:id` | ADMIN/MANAGER only |
| Orders list | `GET /orders` | Status filter + pagination |
| Order detail | `GET /orders/:id` | |
| Create order | `POST /orders` | Full POS checkout |
| Update order status | `PATCH /orders/:id/status` | ADMIN/MANAGER only |
| Customers list | `GET /customers` | Paginated, searchable |
| Customer detail | `GET /customers/:id` | |
| Customer history | `GET /customers/:id/history` | Purchase history |
| Create customer | `POST /customers` | |
| Update customer | `PATCH /customers/:id` | |
| Delete customer | `DELETE /customers/:id` | |
| Inventory list | `GET /inventory` | Full inventory |
| Low stock alert | `GET /inventory/low-stock` | |
| Stock movements | `GET /inventory/movements` | Filter by productId |
| Adjust stock | `POST /inventory/:productId/adjust` | ADMIN/MANAGER only |
| Users list | `GET /users` | ADMIN/MANAGER only |
| AI chat | `POST /ai/chat` | Send `{ message: "string" }` |
| AI predictions | `GET /ai/sales-prediction` | 7-day forecast |
| AI recommendations | `GET /ai/recommendations` | |
| AI fraud detection | `GET /ai/fraud-detection` | |

---

## ⚠️ STILL USING MOCK DATA

| Feature | File | What's Mocked | Fix Needed |
|---------|------|---------------|------------|
| AI Insights panel | `src/features/dashboard/components/AiInsights.tsx` | `mockReply()` hardcoded responses | Wire to `POST /ai/chat` |
| AI Prediction chart | `src/features/dashboard/components/AiPredictionChart.tsx` | `AI_PREDICTION_DATA` static array | Wire to `GET /ai/sales-prediction` |
| Notifications bell | `src/components/layout/TopBar.tsx` | Static `NOTIFICATIONS` array | No backend endpoint exists |
| Payment processing | `src/features/pos/components/PaymentModal.tsx` | 1200ms fake delay | Wire to `POST /payments/order/:orderId/process` |
| Stripe card form | `src/features/pos/components/StripeCardForm.tsx` | 1500ms fake delay | Wire real Stripe SDK |
| Tenant switcher | `src/data/tenants.ts` | `MOCK_TENANTS` | Multi-tenant feature, not critical |

---

## ❌ MISSING FEATURES

### 1. Forgot Password / Reset Password
**Impact: HIGH — users locked out if they forget password**

- `src/app/login/page.tsx` line ~151 — "Forgot password?" button exists but no `onClick`
- No `src/app/forgot-password/` page
- No `src/app/reset-password/` page
- No backend endpoints (`/auth/forgot-password`, `/auth/reset-password`)
- No email sending setup (would need SendGrid/Resend)

**Quick workaround:** Admin can change password via `PATCH /users/:id` in Settings → Users.

---

### 2. Backend Endpoints Not Wired in Frontend

| Backend Endpoint | Status |
|-----------------|--------|
| `GET /payments` | Backend exists, frontend not using |
| `GET /payments/summary` | Backend exists, frontend not using |
| `POST /payments/order/:orderId/process` | Backend exists, PaymentModal uses fake delay |
| `PATCH /payments/:id/refund` | Backend exists, no UI |
| `GET /reports/monthly-revenue` | Backend exists, not shown in Reports page |
| `GET /categories` | Backend exists, not listed in Categories UI |
| `POST /categories` | Backend exists, no UI to create |
| `GET /stores` | Backend exists, not shown in Settings |
| `PATCH /stores/:id` | Backend exists, Settings form may not call it |

---

### 3. Auth Token in Every Request
**How to verify in DevTools:**
- Open Network tab → click any API request after login
- Headers → look for: `Authorization: Bearer eyJ...`
- If missing → auth store not loaded → check localStorage for key `pos-auth`

---

## 🔍 HOW TO TEST EACH SECTION

### Login
```
Network: POST https://pos-eneterprise-production.up.railway.app/api/v1/auth/login
Payload: { "email": "admin@posapp.com", "password": "Admin@123", "storeId": "store-default" }
Expect:  { "success": true, "data": { "accessToken": "...", "refreshToken": "...", "user": {...} } }
```

### Dashboard KPIs
```
Network: GET /api/v1/reports/kpis
Expect:  { "success": true, "data": { "todayRevenue": 0, "totalOrders": 0, ... } }
```

### Products
```
Network: GET /api/v1/products?page=1&limit=20
Expect:  { "success": true, "data": { "data": [...], "total": 12, "page": 1, "limit": 20, "totalPages": 1 } }
```

### Create Order (POS checkout)
```
Network: POST /api/v1/orders
Payload: {
  "items": [{ "productId": "uuid", "quantity": 2, "discount": 0 }],
  "paymentMethod": "CASH",
  "cashGiven": 500,
  "discountPct": 0
}
Expect:  { "success": true, "data": { "id": "...", "orderNumber": "ORD-001", "total": 299.98 } }
```

### Inventory Adjust
```
Network: POST /api/v1/inventory/:productId/adjust
Payload: { "quantity": 10, "type": "PURCHASE", "note": "Restocked" }
Expect:  { "success": true, "data": { "quantity": 110 } }
```

---

## 🐛 KNOWN ISSUES TO FIX

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | "Forgot password?" button non-functional | `src/app/login/page.tsx` | Add page or disable button |
| 2 | AI chat uses hardcoded replies | `AiInsights.tsx` | Call `POST /ai/chat` |
| 3 | Payment modal uses fake 1.2s delay | `PaymentModal.tsx` | Call `POST /payments/order/:orderId/process` |
| 4 | Monthly revenue not shown in Reports | `src/features/reports/` | Add chart calling `GET /reports/monthly-revenue` |
| 5 | Categories not manageable in UI | Settings or Products | Add UI calling `/categories` CRUD |
| 6 | Store settings not saved | `src/app/(dashboard)/settings/` | Wire `PATCH /stores/:id` |
| 7 | Refund button has no backend call | Orders detail page | Call `PATCH /payments/:id/refund` |

---

## 📋 DEPLOYMENT URLS

| Service | URL |
|---------|-----|
| Frontend | https://pos-eneterprise-91vp.vercel.app |
| Backend API | https://pos-eneterprise-production.up.railway.app/api/v1 |
| Swagger Docs | https://pos-eneterprise-production.up.railway.app/api/docs |
| Database | Railway Postgres (tramway.proxy.rlwy.net:24908) |

---

## 🔐 DEFAULT CREDENTIALS (after seed)

| Role | Email | Password | Store ID |
|------|-------|----------|----------|
| Admin | admin@posapp.com | Admin@123 | store-default |
| Manager | manager@posapp.com | Manager@123 | store-default |
| Cashier | cashier@posapp.com | Cashier@123 | store-default |

---

## PRIORITY ORDER TO FIX NEXT

1. **Wire PaymentModal to real backend** — currently fake delay, no actual payment recorded
2. **Wire AI chat to `POST /ai/chat`** — currently hardcoded mockReply
3. **Wire Store settings form to `PATCH /stores/:id`** — settings not saved
4. **Add Monthly Revenue chart** — endpoint exists, not displayed
5. **Add Categories management UI** — CRUD endpoints exist, no UI
6. **Forgot password page** — needs backend email setup (SendGrid/Resend) first
