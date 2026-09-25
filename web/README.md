# PB Mobiles & Repairing Lab — Website

E-commerce + repair website for PB Mobiles. Full plan, status and client requirements: [`../docs/PROJECT_PLAN.md`](../docs/PROJECT_PLAN.md).

## Quick start

```bash
npm install
cp .env.example .env      # already present in dev
npx prisma db push
npx prisma db seed
npm run dev
```

## Structure

```
prisma/schema.prisma      Full data model (inventory, orders, payments, repairs, loyalty, Care Card, staff, audit)
prisma/seed.ts            Demo catalogue + 7 staff accounts + Care Card visit slots
src/app/(store)/          Customer-facing pages
src/app/api/              Orders, payment callback, repairs, chat, contact, account, social proof
src/components/three/     PhoneModel (procedural, explodable), HeroCanvas (scroll story), ProductViewer
src/lib/                  inventory (stock + movements), orders (finalise, loyalty, Care Card), payments (gateway abstraction), audit, auth, settings
```

## Key rules implemented

- Prices and stock are always re-read server-side at checkout.
- Stock is committed only after verified payment (or confirmed COD); every change writes a `StockMovement` and an `AuditLog`.
- Unsigned or forged payment callbacks are rejected and logged, never applied.
- Loyalty points and Care Cards are granted only on paid orders.
- Social proof shows only real paid orders with privacy-safe labels.
