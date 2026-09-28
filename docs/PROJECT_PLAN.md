# PB Mobiles & Repairing Lab — Build Status, Requirements & Open Questions

## Updated Master Developer Requirements (final version) — implemented

| Brief § | Requirement | Where / status |
|---|---|---|
| §1, §18 | Homepage: "Create your repair note" CTA (old "Visit note" wording removed), dedicated **Used phones** tile, Tablets, Accessories, repair CTA, Passport, featured rows, reviews, broadcast bar, chat; strong CTAs (Shop Phones / Used / Tablets / Accessories / Create your repair note) | `/` ✅ |
| §2 | Tablets with **New + Used** filters | `/tablets` ✅ |
| §3 | **Separate installment section** on the homepage — no buy/apply/checkout button; store visit + CNIC notice; admin add/edit/remove/**reorder**; model, regular price, installment total, interest, down payment, duration/plan, availability | `/#installments`, Admin → Installments ✅ |
| §4 | **Care Card removed completely** (tables dropped by `scripts/remove-care-card.mjs`). **Phone Passport**: 10 pts/repair, 20/new phone, 15/used phone; rewards 100 = phone case, 200 = AirPods, 500 = 50% off repairs excl. parts; **six-month expiry per earning event**; expired points can't be redeemed; Super Admin edits rewards/points/exclusions/expiry, all audited | `/loyalty`, `/account`, Admin → Customers / Settings ✅ + tests |
| §5 | Installment purchase workflow with **CNIC front + back (required)** + other documents | Admin → Installment sale ✅ |
| §6 | Used-phone selling workflow: seller, IMEI, single grade, agreed price, notes, CNIC front + back, other documents; optional add-to-stock as its own SKU | Admin → Buy a used phone ✅ |
| §7, §17 | Attachments on repair, contact, installment, used-phone and chat forms; real file-type check, size limit, private storage, permission-checked downloads; ID views audited | `/api/files/[id]` ✅ + tests |
| §8 | Repair form photos + other attachments; Print Repair Information (now with parts / Passport discount) | ✅ |
| §9 | **Broadcasts**: create / edit / publish / unpublish / delete, CTA link, start/end dates, audited; dark bar at the top of the homepage | Admin → Broadcasts ✅ + tests |
| §10 | **Add Item → category dropdown** (Phones, Tablets, Phone Spare Parts, Accessories) with category forms; Item Number/SKU + barcode; purchase price; IMEI; PURCHASE movements with price/ref/employee; Item Number / barcode / IMEI lookup (inventory + POS); investment, revenue, profit/margin; reports filtered by item/category/date/employee/transaction type | Admin → Inventory, Reports ✅ + tests |
| §13 | Chat: staff message customers, **Enable notifications** both sides (Web Push + in-tab), **attachments** and **voice notes with waveform** both ways, delivery/read ticks | Chat widget, Admin → Inbox & chat ✅ + tests |
| §14 | Audit covers rewards, installments, broadcasts, used-phone buying, documents | Admin → Audit log ✅ |

**Needs from the client for this update:** real installment plans (the three listed are samples), whether tablets should earn Passport points (currently phones only, as written), VAPID keys for closed-app phone notifications (`npx web-push generate-vapid-keys`), and object storage (R2/S3) before real CNIC volumes.

## Master brief (previous update) — changes implemented

| Master brief § | Requirement | Status |
|---|---|---|
| Theme override, §2, §16 | Previous off-white theme removed; dark, logo-coloured UI everywhere; no white backgrounds (only printed receipts/labels/repair sheets are white paper) | ✅ |
| Reference images | Homepage rebuilt to the reference: logo header, "Phones. Repairs. Sorted.", gold "Book a repair" + outlined "Shop phones", category cards, trust strip, Featured Phones, PB Rewards, How repairs work, reviews, "Ready when you are", footer columns | ✅ |
| §3, §9 | **Tablets** category: /tablets catalogue, RAM field, filters, admin, SKU/barcode, POS, cart/checkout, reviews, 3D tablet designs | ✅ |
| §6 | **3D colour protection**: white-only lighting & reflections, no tone mapping/auto-exposure, matte colour-accurate product materials, photo models rendered unlit | ✅ + tests |
| §8 | **Single grade per device/SKU**: enforced in the backend (`src/lib/grade.ts`) for every write; used listings show one card per SKU; grade snapshotted on order lines and receipts | ✅ + tests |
| §13 | **Print Repair Information** (A4, B&W-friendly) with IMEI/serial, diagnosis, parts, work, charges, staff, notes | ✅ |
| §3, §17 | **Reviews**: customer submission, verified-customer badge, admin moderation (approve/reject/delete), shown on home + product pages, SEO rating markup. No fake reviews are seeded. | ✅ + tests |

---

Source of truth: the client's *PB Mobiles Website Developer Requirements* PDF (§1–§20) — kept privately, not in this repository.
**All five phases are built.** What remains is client input (credentials, content, decisions) and go-live setup.

---

## 1. What's built — mapped to the PDF

| PDF | Requirement | Where |
|---|---|---|
| §1, §11 | Premium editorial design, brand palette, navy/off-white rhythm, rounded cards, strong CTAs | Whole storefront |
| — | **3D scroll story** (phone floats → turns → explodes into layers → reassembles) + 3D product viewer | Home hero, product pages |
| §2 | Home, New Phones, Used Phones, Product Detail, Repair, Accessories, About, Contact, Terms, Loyalty/Passport | `/`, `/new-phones`, `/used-phones`, `/product/*`, `/repair`, `/accessories`, `/about`, `/contact`, `/terms`, `/loyalty`, `/account` |
| §3 | Pakistan checkout: wallet / bank / card / COD, server-side verification, success / pending / failed, admin sees txn ref, amount, customer, status | `/checkout`, `/api/payments/callback`, Admin → Orders |
| §4 | 3D viewer: rotate, zoom, fullscreen, desktop + mobile; GLB upload; licensed Sketchfab UID option | Product pages, Admin → Product → 3D |
| §5 | Admin: products, new/used fields, stock, orders, repairs, customers, loyalty, reports | `/admin/*` |
| §6, §19 | Unique SKU + barcode per item, label printing, USB + camera scanning, POS sale, auto stock decrease, returns restore stock, movement log, low-stock alerts, zero-stock block with owner override | Admin → POS, Labels, Inventory |
| §7 | Passport: points on purchases + repairs, rewards, redemptions, adjustments, expiry/exclusion rules (configurable) | `/loyalty`, `/account`, Admin → Customers, Settings |
| §8 | Repair form (photos, appointment, PBR ref), tracking, 7-stage staff workflow board | `/repair`, `/repair/track`, Admin → Repairs |
| §9 | Site-wide chat in PB palette; staff reply from Admin → Inbox; WhatsApp hand-off | Chat bubble, Admin → Inbox |
| §10 | Mobile-first, SEO (metadata, JSON-LD, sitemap), accessible forms, secure accounts, roles, audit trail, **backups**, rate limiting, security headers | Throughout, `scripts/backup.mjs`, CSV exports |
| §14 | **6-photo → 3D**: six required views, validation, auto-crop, generate, status Processing / Ready / Failed / Needs Review, preview before publishing, approve, photos kept, regenerate | Admin → Product → 3D |
| §15 | Purchase pop-ups from real paid orders only, privacy-safe names, frequency/duration, on/off | Storefront, Admin → Settings |
| §16 | 7 individual accounts (6 employees + owner), forced password change, login/logout/failed-login log, super-admin audit with before/after | Admin → Staff, Audit log |
| §17 | Sale notes + structured repair notes (issue, findings, work, parts), timestamped, author-linked, audited | Orders, Repairs, POS |
| §18 | ~~Care Card~~ — removed by the final master brief (replaced by the Phone Passport rewards above) | — |
| §20 | Combined workflows (product → 6 photos → 3D → publish; scan → sell → stock → note → audit; repair → note → Passport points) | Tested end-to-end |

**Quality checks run:** TypeScript clean · ESLint clean · production build passes · 57 automated tests pass (stock, purchases, IMEI, overrides, returns, Passport earning/expiry/redemption, installments, broadcasts, attachments & ID permissions, chat receipts & voice notes, POS, repairs, payments, barcodes, grades, 3D colour, six-photo validation) · browser QA of admin + storefront flows.

**Two modes for 6-photo 3D:**
1. **Textured model (default):** the six photos wrap a precise phone body. It's instant, free, and always clean.
2. **AI reconstruction:** a Meshy adapter. It's optional and needs an API key. Results go to "Needs Review" before publishing.

AI tools struggle with shiny, plain phones, which is why the textured model is the default.

---

## 2. What I need from the client

### Accounts & credentials
- [ ] **JazzCash merchant account** → Merchant ID, Password, Integrity Salt (sandbox + live). Needs NTN, CNIC, business bank account. *(Or tell us if they prefer Easypaisa / PayFast / Safepay.)*
- [ ] **Domain name** + DNS access (e.g. pbmobiles.pk)
- [ ] **Hosting**: recommend Vercel (site) + Neon or Supabase (PostgreSQL) + Cloudflare R2 (photos/3D files/backups)
- [ ] **WhatsApp Business** number for Cloud API (repair/order updates), *or* a local SMS gateway account
- [ ] **Email sending** (Resend) — needs the domain verified
- [ ] Optional: **Meshy** (or similar) API key + budget for AI 3D generation

### Content
- [ ] **Vector logo** (SVG/AI/PDF, transparent) — the PDF only has a photo of a 3D logo
- [ ] Shop **address + Google Maps pin, phone, WhatsApp, email, opening hours, social links**
- [ ] **About Us** story, founding year, team/shop photos
- [ ] **Full inventory**: name, brand, storage, colour, new/used, grade, battery %, notes, price, sale price, quantity, existing barcodes, PTA status (spreadsheet is fine — I can import it)
- [ ] Product photos (or shoot the 6 standard views — they feed the 3D system too)
- [ ] Names + emails of the **6 employees and the owner**

### Business rules to confirm (all editable later in Settings)
- [ ] Should tablets earn Phone Passport points (brief lists phones and repairs only)?
- [ ] Warranty & return periods (new / used / repairs / accessories)
- [ ] Delivery cities, delivery fee (default Rs 250), free-delivery threshold (Rs 50,000), COD yes/no
- [ ] **Legal approval** of the Terms, Privacy and Returns drafts

### Hardware (for the shop)
- [ ] USB barcode scanner (any standard "keyboard" scanner), thermal label printer (40×30 or 50×25 mm), optional 80 mm receipt printer

---

## 3. Open questions for the client
1. **Animation level** — PDF §11 says "subtle… avoid excessive animation"; you asked for crazy 3D. Heavy 3D is limited to the home hero and product viewer; other pages are subtle; reduced-motion users get a calm version. OK?
2. **"Keep the previous chatbox" (§9)** — which chatbox was it (Tawk.to / Crisp / WhatsApp widget / custom)? I built a branded chat with staff replies + WhatsApp hand-off; I can connect their old provider instead.
3. **Sketchfab model (§4)** — confirm licence before use; our own 3D is recommended.
4. **Zero-stock override** — currently only the owner can authorise (owner at the till, or owner's email + password entered on the employee's screen). OK, or should a PIN be used instead?
5. **Payment gateway choice** — JazzCash, or another provider they already have?
6. **Returns in-store** — any restocking fee or rules for opened/used items beyond the drafts?

---

## 4. External services

| Service | Purpose (§) | Recommended | Cost (rough) |
|---|---|---|---|
| Payment gateway | Checkout (§3) | JazzCash (or Easypaisa / PayFast / Safepay) | ~1.5–3% per transaction |
| PostgreSQL | All data (§5, §20) | Neon or Supabase | Free → ~$20/mo |
| Object storage | Photos, 3D models, backups | Cloudflare R2 | ~$0–5/mo |
| Hosting | Site + admin | Vercel | Free → $20/mo |
| WhatsApp / SMS | Order & repair updates | Meta WhatsApp Cloud API / local SMS | Per message |
| Email | Receipts, staff alerts | Resend | Free tier |
| AI 3D (optional) | §14 AI pipeline | Meshy | Per generation |
| Monitoring | Uptime | Any uptime pinger on `/api/health` | Free |

---

## 5. Go-live checklist (after credentials arrive)
1. `node scripts/use-postgres.mjs`, set `DATABASE_URL`, `npx prisma db push`
2. Fill production env vars (see `web/.env.example`), set a strong `AUTH_SECRET`
3. Set `PAYMENT_PROVIDER=JAZZCASH`, run a live Rs 10 test, confirm the callback URL with JazzCash
4. Import real inventory, print barcode labels, remove demo products
5. Create real staff accounts (Admin → Staff), deactivate the demo ones
6. Schedule `npm run backup` nightly; point an uptime monitor at `/api/health`
7. Legal pages approved → remove "Draft" banners

## 6. Running locally
```bash
cd web && npm install && npx prisma db push && npx prisma db seed && npm run dev
```
- Storefront: http://localhost:3000 · Admin: http://localhost:3000/admin
- Demo logins: `owner@pbmobiles.pk` or `employee1…6@pbmobiles.pk`. The seed prints a random temporary password (or set `SEED_STAFF_PASSWORD`); everyone must change it at first login
- Tests: `npm test` · Backup: `npm run backup` · Test payments use the sandbox gateway page
