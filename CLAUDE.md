@AGENTS.md

# Project: POS Enterprise Monorepo

## Working Directory
```
C:\Users\YELLOW STAR\Documents\pos-enterprise
```

## Structure
```
pos-enterprise/          ← root (frontend, Next.js 16)
├── src/                 ← Next.js app source
├── backend/             ← NestJS API server
│   ├── src/
│   ├── prisma/
│   └── .env             ← copy from .env.example, fill DATABASE_URL
└── docker-compose.yml   ← Postgres 16 + Redis 7
```

---

## How to Run — Backend (NestJS on port 3001)

### Step 1: Start database (pick one)

**Option A — Docker (fastest):**
```powershell
cd "C:\Users\YELLOW STAR\Documents\pos-enterprise"
docker compose up -d
```

**Option B — winget install Postgres (no Docker):**
```powershell
winget install PostgreSQL.PostgreSQL.17
# then create DB: psql -U postgres -c "CREATE DATABASE pos_enterprise;"
```

**Option C — Free cloud (Supabase):**
- supabase.com → New project → copy connection string into `backend/.env`

### Step 2: Configure env
```powershell
cd "C:\Users\YELLOW STAR\Documents\pos-enterprise\backend"
copy .env.example .env
# Edit .env — set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
```

### Step 3: Migrate + seed
```powershell
cd "C:\Users\YELLOW STAR\Documents\pos-enterprise\backend"
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

### Step 4: Start backend dev server
```powershell
cd "C:\Users\YELLOW STAR\Documents\pos-enterprise\backend"
npm run start:dev
```
Server: http://localhost:3001
Swagger: http://localhost:3001/api/docs

---

## How to Run — Frontend (Next.js on port 3000)

```powershell
cd "C:\Users\YELLOW STAR\Documents\pos-enterprise"
npm run dev
```
App: http://localhost:3000

---

## Default Login (after seed)
| Role    | Email                  | Password     | Store ID      |
|---------|------------------------|--------------|---------------|
| Admin   | admin@posapp.com       | Admin@123    | store-default |
| Manager | manager@posapp.com     | Manager@123  | store-default |
| Cashier | cashier@posapp.com     | Cashier@123  | store-default |

---

## Backend API Base
```
http://localhost:3001/api/v1
```
Auth header: `Authorization: Bearer <accessToken>`

All routes require storeId from JWT — set via login response, stored in token.

---

## Monorepo Scripts (from root)
```powershell
npm run dev                # frontend dev server
npm run backend:dev        # backend dev server
npm run backend:migrate    # run prisma migrations
npm run backend:seed       # seed default data
npm run backend:studio     # open Prisma Studio (DB browser)
```

---

## Key Env Vars (backend/.env)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_enterprise
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me-too
PORT=3001
FRONTEND_URL=http://localhost:3000
```
Redis is optional — app degrades gracefully if Redis is offline.

---

## Frontend–Backend Integration

### Architecture
```
src/store/authStore.ts      ← Zustand + persist: stores accessToken, refreshToken, user
src/lib/api/http.ts         ← Base fetch client: injects Bearer header, auto-refresh on 401
src/lib/api/client.ts       ← All API calls + response mappers (backend → frontend types)
```

### How auth works
1. `useAuthStore.login(email, password)` → `POST /api/v1/auth/login` → stores tokens in localStorage (`pos-auth`)
2. Every `apiFetch()` call attaches `Authorization: Bearer <accessToken>`
3. On 401 → `POST /api/v1/auth/refresh` with stored refreshToken → retries original request
4. On refresh failure → clears store → redirects to `/login`
5. Dashboard layout guard: redirects to `/login` if no `accessToken` in store

### Standard backend response wrapper
Every backend endpoint wraps its response:
```json
{
  "success": true,
  "data": <actual payload>,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```
`apiFetch<T>()` automatically unwraps and returns `json.data` as `T`.

### Paginated response shape
```json
{
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```
Frontend `PaginatedResponse<T>` uses `pageSize` — `mapPage()` in `client.ts` maps `limit` → `pageSize`.

### Auth endpoints (public, no Bearer required)
```
POST /api/v1/auth/login
Body:  { "email": "admin@posapp.com", "password": "Admin@123", "storeId": "store-default" }
Returns: { accessToken, refreshToken, user: { id, email, name, role, storeId } }

POST /api/v1/auth/refresh
Body:  { "refreshToken": "<token>" }
Returns: { accessToken, refreshToken }

POST /api/v1/auth/logout     ← requires Bearer
```

### All API endpoints (require Bearer)
```
GET    /api/v1/products               ?search=&page=&limit=
GET    /api/v1/products/:id
GET    /api/v1/products/sku/:sku
GET    /api/v1/products/barcode/:barcode
POST   /api/v1/products               ADMIN, MANAGER only
PATCH  /api/v1/products/:id           ADMIN, MANAGER only
DELETE /api/v1/products/:id           ADMIN, MANAGER only

GET    /api/v1/orders                 ?search=&page=&limit=&status=
GET    /api/v1/orders/:id
POST   /api/v1/orders
PATCH  /api/v1/orders/:id/status      ADMIN, MANAGER only

GET    /api/v1/customers              ?search=&page=&limit=
GET    /api/v1/customers/:id
GET    /api/v1/customers/:id/history
POST   /api/v1/customers
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id

GET    /api/v1/inventory
GET    /api/v1/inventory/low-stock
GET    /api/v1/inventory/movements    ?productId=
POST   /api/v1/inventory/:productId/adjust   ADMIN, MANAGER only

GET    /api/v1/reports/kpis
GET    /api/v1/reports/daily-sales    ?from=&to=
GET    /api/v1/reports/monthly-revenue
GET    /api/v1/reports/top-products   ?limit=
GET    /api/v1/reports/by-category

GET    /api/v1/users                  ADMIN, MANAGER only
GET    /api/v1/users/:id              ADMIN, MANAGER only
POST   /api/v1/users                  ADMIN only
PATCH  /api/v1/users/:id              ADMIN only
PATCH  /api/v1/users/:id/toggle       ADMIN only

GET    /api/v1/ai/sales-prediction
GET    /api/v1/ai/recommendations
GET    /api/v1/ai/fraud-detection
POST   /api/v1/ai/chat
Body:  { "message": "string" }
```

### Create order body
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2, "discount": 10 }
  ],
  "customerId": "uuid",
  "discountPct": 5,
  "paymentMethod": "CASH",
  "cashGiven": 500,
  "notes": "optional"
}
```
`paymentMethod` must be UPPER_CASE: `CASH | CARD | UPI | STRIPE`

### Type mapping rules (backend → frontend)
| Backend field | Frontend field | Note |
|---|---|---|
| `inventory.quantity` | `stock` | Flattened from nested object |
| `inventory.minQuantity` | `minStock` | Flattened from nested object |
| `category.name` (string) | `category` (enum) | Normalized: "Beverages" → "beverages", "Food & Snacks" → "food" |
| `price` (Decimal) | `price` (number) | `Number(p.price)` |
| `status` (UPPER_CASE) | `status` (lowercase) | `"COMPLETED"` → `"completed"` |
| `paymentMethod` (UPPER_CASE) | `paymentMethod` (lowercase) | `"CASH"` → `"cash"` |
| `notes` | `note` | Field rename |
| `cashier.name` | `cashierName` | Flattened |
| `customer.name` | `customerName` | Flattened |

### storeId
Never passed in request body or query. Extracted from JWT payload by `@StoreId()` decorator on every backend controller. All DB queries are scoped to this storeId automatically.

### Token lifetimes
- Access token: 15 minutes
- Refresh token: 7 days (hashed + stored in DB, presence flag in Redis)
