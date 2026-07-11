# Personal Income & Expense Tracker

A full-stack mobile application for tracking income, monitoring expenses, setting budgets, and understanding spending habits.

## Tech Stack

| Layer    | Technologies                                              |
| -------- | --------------------------------------------------------- |
| Mobile   | React Native (Expo), NativeWind, React Navigation         |
| Backend  | Node.js, Express.js                                       |
| Database | MongoDB (Mongoose)                                        |
| Auth     | JWT (stored in expo-secure-store)                         |
| Charts   | react-native-chart-kit                                    |

## Project Structure

```
Project/
├── backend/          # Express API + MongoDB
│   └── src/
│       ├── models/   # User, Transaction, Budget, Category
│       ├── routes/   # auth, transactions, budgets, dashboard
│       └── scripts/  # seed.js
└── mobile/           # Expo React Native app
    └── src/
        ├── screens/  # Login, Dashboard, Transactions, etc.
        ├── navigation/
        ├── services/ # API client
        └── context/  # Auth context
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) running locally or a MongoDB Atlas URI
- [Expo Go](https://expo.dev/go) on your phone, or Android/iOS emulator
- Optional: [Docker](https://www.docker.com/) to run MongoDB quickly

### Start MongoDB with Docker

```bash
docker compose up -d
```

This starts MongoDB on `mongodb://localhost:27017/expense-tracker`.

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Edit MONGODB_URI and JWT_SECRET
npm run seed           # Seed default categories
npm run dev            # Starts on http://localhost:5000
```

### API Endpoints

| Method | Endpoint                    | Description                    |
| ------ | --------------------------- | ------------------------------ |
| POST   | `/api/auth/register`        | Register new user              |
| POST   | `/api/auth/login`           | Login, returns JWT             |
| GET    | `/api/transactions`         | List transactions (filterable) |
| POST   | `/api/transactions`         | Create transaction             |
| PUT    | `/api/transactions/:id`     | Update transaction             |
| DELETE | `/api/transactions/:id`     | Delete transaction             |
| GET    | `/api/transactions/export`  | Export as CSV or JSON          |
| GET    | `/api/budgets`              | List budgets with spend status |
| POST   | `/api/budgets`              | Create budget                  |
| PUT    | `/api/budgets/:id`          | Update budget                  |
| DELETE | `/api/budgets/:id`          | Delete budget                  |
| GET    | `/api/dashboard/summary`    | Dashboard aggregates + charts  |
| GET    | `/api/dashboard/categories` | List categories                |

## Mobile App Setup

```bash
cd mobile
npm install
cp .env.example .env   # Set EXPO_PUBLIC_API_URL
npx expo start
```

### Environment Variables

**Backend (`backend/.env`)**

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

**Mobile (`mobile/.env`)**

```
EXPO_PUBLIC_API_URL=http://localhost:5000/api
```

> **Physical device:** Replace `localhost` with your computer's local IP (e.g. `http://192.168.1.10:5000/api`).

## Multi-Account Assets (v1.1)

- Create/manage accounts (name, icon, color, currency, opening balance)
- Total assets dashboard grouped by currency
- Income/expense linked to accounts with overdraft warnings
- Transfers between accounts
- Per-account transaction history
- Legacy transactions (pre-accounts) preserved with badge, excluded from account balances

### New API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/accounts` | List accounts with balances |
| GET | `/api/accounts/summary` | Total assets breakdown |
| GET | `/api/accounts/:id` | Account detail + recent txs |
| POST/PUT/DELETE | `/api/accounts` | Account CRUD |

Run `npm run migrate:accounts` in backend to seed default accounts for existing users (non-destructive).

## Features

- **Auth** — Register/login with email + password; JWT stored in SecureStore
- **Income tracking** — Amount, source, date, note, recurring flag
- **Expense tracking** — Predefined + custom categories
- **Dashboard** — Balance, monthly comparison, pie/bar/line charts
- **Budgets** — Monthly limits per category with 80%/100% warnings
- **Reports** — Filter by date, category, type; export CSV via share sheet

## Seed Data

Run `npm run seed` in the backend to populate default categories:

**Expenses:** Food, Transport, Rent, Bills, Entertainment, Shopping, Health, Education, Other

**Income:** Salary, Freelance, Investment, Gift, Other Income

## Development Notes

- Budget alerts appear on the Dashboard when spending reaches 80% (warning) or 100% (over) of the monthly limit.
- Long-press a transaction or budget to delete it.
- Tap a transaction to edit it.

## License

MIT
