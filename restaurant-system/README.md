# 🍽️ Restaurant Management System

A production-ready, full-stack Restaurant POS + ERP system built with modern technologies. Run it in a single command with Docker.

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd restaurant-system

# 2. Copy environment file
cp .env .env.local  # (optional: customize)

# 3. Start everything
docker-compose up --build

# App is ready at:
#   Frontend:  http://localhost:3000
#   Backend:   http://localhost:5000
#   API Docs:  http://localhost:5000/health
```

**Default login credentials (password: `password123`):**

| Role    | Email                        | Access                        |
|---------|------------------------------|-------------------------------|
| Admin   | admin@restaurant.com         | Full system access            |
| Manager | manager@restaurant.com       | All except user management    |
| Waiter  | waiter@restaurant.com        | Orders, tables, POS           |
| Kitchen | kitchen@restaurant.com       | Kitchen display only          |
| Cashier | cashier@restaurant.com       | POS and payments              |

---

## 📦 Tech Stack

| Layer       | Technology               | Reason                                  |
|-------------|--------------------------|------------------------------------------|
| Frontend    | React 18 + Vite          | Fast HMR, component model               |
| Styling     | TailwindCSS              | Utility-first, dark theme               |
| State       | TanStack Query v5        | Server state, caching, invalidation     |
| Real-time   | Socket.IO (client)       | Live order/table updates                |
| Backend     | Node.js + Express        | Non-blocking I/O, fast API              |
| WebSockets  | Socket.IO (server)       | Real-time kitchen/waiter sync           |
| Database    | PostgreSQL 15            | Relational integrity, JSONB support     |
| ORM         | Sequelize 6              | Migrations, associations, scopes        |
| Cache       | Redis 7                  | Session store, pub/sub                  |
| Auth        | JWT + bcrypt             | Stateless, role-based                   |
| DevOps      | Docker + Compose         | One-command startup                     |

---

## 🗂️ Project Structure

```
restaurant-system/
├── docker-compose.yml          # All services orchestration
├── .env                        # Environment variables
├── database/
│   └── init.sql               # Full schema + seed data
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # HTTP + Socket.IO entry
│       ├── app.js              # Express app + middleware
│       ├── config/
│       │   └── database.js     # Sequelize connection
│       ├── models/             # Sequelize models
│       │   ├── index.js        # Model registry + associations
│       │   ├── User.js
│       │   ├── Order.js
│       │   ├── MenuItem.js
│       │   └── ...
│       ├── controllers/        # Business logic
│       │   ├── authController.js
│       │   ├── orderController.js
│       │   ├── kitchenController.js
│       │   └── ...
│       ├── routes/             # Express routers
│       ├── middleware/         # Auth, validation, error handling
│       ├── socket/             # Socket.IO event handlers
│       └── utils/              # Helpers, logger
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx             # Route definitions
        ├── main.jsx            # React entry point
        ├── context/
        │   └── AuthContext.jsx # Global auth state
        ├── services/
        │   ├── api.js          # Axios + all API calls
        │   └── socket.js       # Socket.IO client
        ├── components/
        │   └── common/         # Layout, Modal, Badge, etc.
        └── pages/              # One file per page/feature
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── POSPage.jsx
            ├── KitchenPage.jsx
            ├── OrdersPage.jsx
            ├── TablesPage.jsx
            ├── MenuPage.jsx
            ├── InventoryPage.jsx
            ├── CustomersPage.jsx
            ├── ReservationsPage.jsx
            ├── ReportsPage.jsx
            ├── UsersPage.jsx
            └── SettingsPage.jsx
```

---

## 🧱 Features

### POS System
- Menu browsing with category filtering and search
- Cart management with quantity controls
- Table and customer selection
- Discount, tip, and tax calculation
- Cash, card, and mobile payment simulation
- Change calculation for cash payments
- Receipt generation and print

### Order Management
- Real-time order creation and updates via WebSocket
- Order status workflow: pending → confirmed → preparing → ready → served → paid
- Add/cancel individual items on live orders
- Order notes and kitchen notes
- Filtering by status, type, date

### Kitchen Display System (KDS)
- Real-time order queue display
- Per-item status management (pending → preparing → ready)
- Color-coded urgency indicators (10min → yellow, 20min+ → red)
- Average prep time tracking
- One-click "Mark All Ready"

### Table Management
- Visual table grid with status indicators
- Per-section filtering
- Real-time status updates
- Quick table actions from modal
- Table assignment in POS

### Menu Management
- Category and item CRUD
- Price, cost, margin tracking
- Availability toggle
- Featured item flagging
- Prep time and calorie info

### Inventory
- Stock level tracking with visual indicators
- Low stock alerts (real-time via WebSocket)
- Purchase, consumption, waste, adjustment transactions
- Cost per unit and total value calculation
- Supplier management

### Customer Management
- Customer registry with contact info
- Visit history and total spend tracking
- Loyalty points system
- Full-text search

### Reservations
- Date-based reservation calendar
- Table assignment and conflict detection
- Status management: confirmed → seated → completed
- Special requests and notes

### Reports & Analytics
- Revenue trend (daily/weekly/monthly)
- Top selling items by quantity and revenue
- Staff performance table
- Payment method breakdown
- Hourly revenue distribution

### User & Role Management
- 5 built-in roles: admin, manager, waiter, kitchen, cashier
- Create, edit, deactivate users
- Password reset by admin
- Role-based route protection

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <token>` (except login).

### Auth
| Method | Endpoint                   | Description       |
|--------|----------------------------|-------------------|
| POST   | /api/auth/login            | Login             |
| GET    | /api/auth/profile          | Get profile       |
| PUT    | /api/auth/profile          | Update profile    |
| PUT    | /api/auth/change-password  | Change password   |

### Orders
| Method | Endpoint                          | Description            |
|--------|-----------------------------------|------------------------|
| GET    | /api/orders                       | List orders (filtered) |
| GET    | /api/orders/active                | Active orders only     |
| GET    | /api/orders/:id                   | Get single order       |
| POST   | /api/orders                       | Create order           |
| PUT    | /api/orders/:id                   | Update order           |
| PATCH  | /api/orders/:id/status            | Update status          |
| POST   | /api/orders/:id/items             | Add item               |
| DELETE | /api/orders/:id/items/:itemId     | Cancel item            |

### Payments
| Method | Endpoint              | Description       |
|--------|-----------------------|-------------------|
| POST   | /api/payments         | Process payment   |
| GET    | /api/payments         | List payments     |
| POST   | /api/payments/:id/refund | Refund payment |

### Kitchen
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| GET    | /api/kitchen                | Kitchen order queue |
| GET    | /api/kitchen/stats          | KDS stats           |
| PATCH  | /api/kitchen/items/:id      | Update item status  |
| PATCH  | /api/kitchen/:id/ready      | Mark order ready    |

### Menu
| Method | Endpoint                        | Description           |
|--------|---------------------------------|-----------------------|
| GET    | /api/menu/categories            | List categories       |
| GET    | /api/menu/items                 | List items (filtered) |
| POST   | /api/menu/items                 | Create item           |
| PUT    | /api/menu/items/:id             | Update item           |
| PATCH  | /api/menu/items/:id/toggle      | Toggle availability   |

---

## ⚙️ Environment Variables

```env
NODE_ENV=development
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=restaurant_db
DB_USER=restaurant_user
DB_PASSWORD=restaurant_pass
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
RESTAURANT_NAME=La Bella Cucina
RESTAURANT_TAX_RATE=0.08
```

---

## 🛠️ Running Without Docker

```bash
# Prerequisites: Node 20+, PostgreSQL 15, Redis 7

# 1. Setup database
psql -U postgres -c "CREATE USER restaurant_user WITH PASSWORD 'restaurant_pass';"
psql -U postgres -c "CREATE DATABASE restaurant_db OWNER restaurant_user;"
psql -U restaurant_user -d restaurant_db -f database/init.sql

# 2. Backend
cd backend
npm install
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## 🔄 Real-time Events (WebSocket)

| Event               | Direction       | Description                    |
|---------------------|-----------------|--------------------------------|
| `order:new`         | Server → Client | New order placed               |
| `order:updated`     | Server → Client | Order status changed           |
| `table:updated`     | Server → Client | Table status changed           |
| `kitchen:item_updated` | Server → Client | Item status changed in kitchen |
| `inventory:low_stock` | Server → Client | Item below reorder point     |
| `kitchen:item_ready` | Client → Server | Kitchen marks item ready      |

---

## 🏗️ Database Schema

Key tables: `roles`, `users`, `sections`, `tables`, `menu_categories`, `menu_items`, `menu_item_modifiers`, `customers`, `orders`, `order_items`, `payments`, `inventory_categories`, `inventory_items`, `inventory_transactions`, `suppliers`, `reservations`, `settings`, `audit_logs`

See `database/init.sql` for full schema with indexes, constraints, and seed data.

---

## 📝 License

MIT — use freely for commercial and personal projects.
