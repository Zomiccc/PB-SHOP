# PB Mobiles & Repairing Lab — Build Status, Requirements & Open Questions

## Website editor + admin password (3 Oct 2026) — implemented
- **Admin → Edit website** (owner only): opens any page in edit mode. Every text spot has a gold dotted outline; click it and type, and Enter saves a draft. Pictures and videos have **Replace** (upload a picture/video, or paste a YouTube link). **Add a section here** boxes add a picture, video, text, or picture + text + button. They sit under every page heading, between homepage sections, and above the footer on every page.
- Nothing is visible to visitors until **Publish**, from the bar at the bottom of the site or the admin page. **Discard** / **Undo** throw drafts away, and **Back to original** restores the built-in text.
- Editable areas: header strip, menu, footer, store phone/email/WhatsApp/address/hours, the whole homepage (hero, scroll chapters, tiles and pictures, rows, installments section, rewards, how repairs work, reviews, final call to action), every page heading, and the About, Contact, Repair, Installments, PB Rewards and Custom Skins pages. Plain paragraphs on Terms, Privacy and Returns are editable too, as is the 404 page.
- How it works:
  - Storage: `SiteContent` table (`published` / `draft` JSON).
  - Rendering: `src/components/site/Editable.tsx` (`T`, `EditableMedia`, `Zone`, `EditableHeadline`, `StoreLink`).
  - Server side: the API under `/api/admin/site-content` and `src/lib/site-content.ts`.
  - Values are validated in `src/lib/site-content-types.ts`: only our own uploads or https URLs for media, only safe button links, and YouTube embeds via youtube-nocookie (allowed in the CSP).
  - Publish is audited and refreshes every page.
- **Admin → Admin password** (owner): set the sign-in email and password. While payments are in sandbox the admin used to be in demo mode, where anyone could open `/admin` and become the owner. Saving the password switches demo mode off for good (`adminSecurity` setting). After that, `/admin` and the demo-login link always require a password. Employees get passwords from Staff accounts → Reset password.

## Demo data removed (3 Oct 2026) — implemented
- On the next deploy (`migration.removeDemoV1`), the demo catalogue is removed: all 40 sample new and used phones, tablets, accessories and spare parts, plus the 5 sample skin designs. Items are matched exactly on what the seed created, so anything staff added stays. A demo item that was sold is hidden rather than deleted, so order history stays intact.
- Deploys no longer treat "no products" as an empty database (that would have wiped and reseeded everything). An existing database is now recognised by its staff accounts, and demo tablets, parts and designs are never re-added. Fresh local databases get the demo catalogue only with `SEED_DEMO=1`.
- The installment brand tiles show only brands that have plans (Infinix, TECNO, itel, nubia, OPPO).
- Empty shop pages say "New stock is on its way" with a contact button, and empty homepage rows are hidden. The homepage rows show featured items first, then the rest.
- Kept: staff accounts, rewards, skin types and prices, skin phone-model templates (sizes for the skin preview), installment plans and settings.

## Installment running models (3 Oct 2026) — implemented
- Installments are now offered only on the financing partner's (Palm app) running models. All 47 models from the client's itel, nubia, OPPO and Infinix lists are loaded (`web/prisma/running-models.ts`) with retail price, RAM / storage, model number and colours. They're priced with the calculator: 30% down, 9 months at 6% per month. The TECNO Spark 40 Pro plan (partner-app figures) stays.
- The fake sample plans (Samsung Galaxy A55, iPhone 15, Infinix Note 40) and every iPhone plan are removed once on deploy (`migration.runningModelsV1`). A plan that has a sale is switched off rather than deleted.
- No installments on iPhone: Apple is gone from the brand picker. Admin can't add an iPhone plan, and the appointment form and any-price calculator refuse iPhones.
- The homepage shows a short mix of 6 plans across brands; the full list is on /installments. Admin listings have optional model number and colours fields.

## Dev Change Request V2 (Oct 2026) — implemented
- **Hero:** "Buy Fix Style" with no full stops, nudged slightly left so the big letters line up with the paragraph.
- **Animated phone screen:** the date, time and coloured dock icons are removed. The PB Mobiles logo is centred both ways, with its aspect ratio kept.
- **PB Rewards card front:** redrawn as vector art from the reference: stacked logo, navy field, gold border and circuit lines, blue ribbon with the red sweep, and "PB REWARDS" with a crown. Tap to Reveal and the visits indicator are gone.
- **Portal vs print:** `PassportCard` has a `digital` mode (live points; customer account and admin card page) and a `print` mode (no points, no expiry; used for print / PDF). Points are never part of the printed artwork.
- **Card back:** follows the reference: logo, "SHOW THIS CARD AT THE COUNTER", a white barcode panel with the customer's ID, the "Earn points…" line and the website (`NEXT_PUBLIC_CARD_WEBSITE`, default pbisb.com).
- **Customer ID format is now PBM-0001…** (`src/lib/rewards-id.ts`), issued in joining order and grows past four digits. Existing customers are renumbered once (`migration.rewardsIdV2`); their old PBP- number is kept in `Customer.legacyNo`, so old cards and referral codes still work.

## Dev Change Request (Oct 2026) — implemented
- **Hero:** "Buy. Fix. Style." with "From new phones and used phones to repairs & skins, we've got you covered." CTAs are now Shop phones first, then **Book a repair** (renamed from "Create your repair note"), with the same styles.
- **New logo** (`/brand/pb-logo-2026*.webp`) in the header, footer, rewards card, repair print, notifications and social preview (`og-2026.jpg`). The 3D phone screen shows the logo instead of text, and its back carries the supplied skin artwork (`pb-hero-skin.jpg`) edge to edge, with no unskinned strips.
- **Custom skins:** the On phone / Full artwork switch and the enlarge button moved to a small toolbar above the preview, so nothing covers the phone. The drag hint now sits below the preview.
- **Installments:** the heading reads "Book an appointment.", the Repayment Plan details block is removed, and the date row is replaced by a month calendar. The calendar has a dark theme with blue accents and a gold selected day; days that can't be booked are disabled, and it fits a 375 px phone.
- **"PB Passport" is now "PB Rewards"** in all visible text (store, admin, aria labels, titles, emails/chat replies, card text). It reads Rewards ID, Rewards card(s) and PB Points. Code names, the `passportNo` field and the PBP- number format are unchanged. Old points-history notes are renamed once (`migration.rewardsName`).

## Developer Requirements v6 (final) — implemented

| § | Requirement | Where / status |
|---|---|---|
| 1–2 | **Broadcasts with text, pictures and videos**, centred directly beneath Shop Phones; several live broadcasts = swipeable carousel. Admin: upload pictures / videos (sent in 3 MB pieces, so large videos work on Vercel; served with Range support), live **preview before publishing**, publish / edit / disable / remove. Customers who enabled notifications are alerted on publish | Home, Admin → Broadcasts ✅ + tests |
| 3 | **Custom Skins tile** on the homepage → /custom-skins | ✅ |
| 4 | **Customer-uploaded skin preview**: pick a gallery picture, preview it on any brand / model, auto-fitted; kept on the device only (never uploaded, never a catalogue skin); stays when switching models | /custom-skins ✅ |
| 5 | **Full / uncut artwork**: optional upload per design in admin; customers toggle "On phone" / "Full artwork" | ✅ |
| 6 | Installments **start at 30%** (10% and 20% removed; saved settings migrated once) | ✅ + tests |
| 7 | **Installment request form + appointment**: details, plan, date, time slot (full / past slots blocked, capacity per slot), confirmation; admin list with status; times & capacity in Settings | /installments#book, Admin → Installments ✅ + tests |
| 8 | Account page: **Create Account** wording | ✅ |
| 9 | **Enable Notifications** at the top of the homepage (removed from the chatbox); works before chatting | ✅ |
| 10 + final amendment | PB Points wording site-wide: 1/Rs 100, 50–200 per phone, 25 welcome, 25 referral, manual bonus, 6-month validity; **rewards 50 = Free Screen Protector, 100 = Free Custom 3D Mobile Skin, 200 = Free AirPods** (old rewards switched off, kept for history); important rules listed; points of cancelled repairs reversed | Home, /loyalty, terms, chat bot ✅ + tests |

## PB Phone Passport — Developer Requirements (final v4) + client requests (1 Oct 2026) — implemented

| § | Requirement | Where / status |
|---|---|---|
| 3 | **Standard points:** repairs & accessories 1 pt per Rs 100 (net of discounts; spare parts count as accessories); phones by price — Rs 10,000–29,999: 50 · 30,000–49,999: 100 · 50,000–79,999: 150 · 80,000+: 200; **installment phones** on the same tiers (phone cash price), given when the sale is Active/Completed and reversed if cancelled. Tablets earn nothing (not in the table). Rates/tiers editable in Settings | `src/lib/points-rules.ts`, `loyalty.ts`, `installments.ts` ✅ + tests |
| 4, 6 | Welcome 25 + referral 25 — only on the first eligible transaction (already in place) | ✅ |
| 5 | Every account's **Passport ID is its referral code**; Referral code field on sign-up; admin sees who referred whom | Admin → **Referrals**, customer list & profile ✅ |
| 7, 8 | Manual award, customer deletion (already in place) | ✅ |
| 9–11 | **Custom Skins**: search brand → model dropdown → product-style page (reference layout); **skin types with prices**; designs fitted automatically to each model's template; customers only see admin-approved designs; WhatsApp / in-store ordering | `/custom-skins`, Admin → **Custom skins** ✅ + tests |
| Client | **Skin prices:** 3D 450 · Leather 650 · Transparent Printed 550 · Customize Photo 850 (customer sends photo) · Transparent Jelly 350 · UV Curved Jelly 1000 — editable, new types can be added | Admin → Custom skins → Skin types ✅ |
| Client | **Self-service:** bulk upload many designs at once, duplicate a design, designs "for all phone models" (new models get them automatically), add new phone models by copying a similar model's template / "duplicate as new model" | Admin → Custom skins, Brands & phone models ✅ |
| Client | **One phone number = one account; phone compulsory on sign-up.** Numbers are stored in one format (03XXXXXXXXX) so +92 / 92 / 0 forms can't make duplicates; existing numbers normalised once on deploy | `normalizePhone` in `src/lib/format.ts` ✅ + tests |

**To confirm with the client:** reward costs (100 / 200 / 500 points) now that phones earn 50–200 points each; camera-cover add-on price (currently Rs 0 = included); skin ordering is via WhatsApp / in store (no online checkout for skins yet).

## PB Phone Passport — Developer Requirements (final v2) — implemented

| § | Requirement | Where / status |
|---|---|---|
| 1 | Card expiry is an admin field: view/edit per customer; default validity set on issue; **never printed on the physical card**; owner can **show/hide it on the digital card** | Admin → Customer → Passport details, Settings → PB Rewards card ✅ + tests |
| 2 | Birth date on the Passport form: **month + day only, no year** | `/account` Create Passport, Admin → Passport cards, customer profile ✅ + tests |
| 3 | **Referral reward 25 pts** (configurable) — friend enters the referrer's Passport ID or mobile; referrer is credited once, on the friend's first paid purchase or completed repair | `src/lib/passport.ts` ✅ + tests |
| 4 | **Welcome reward 25 pts** (configurable) — once, to a customer who joined (online sign-up or staff-issued card), credited with their **first paid purchase or completed repair** (the transaction is the verification, per the client); a guest claiming their profile with a past order/repair number gets it at once | ✅ + tests |
| 5 | **Manual award**: pick customer (search the customer list) → points + reason → review → confirm; separate "Manual award" transaction with admin + time; audited | Admin → Customer → Award PB Points ✅ + tests |
| 6 | **Delete customer** from the list or profile (owner), typed confirmation; orders/repairs kept, points history snapshotted in the audit entry with admin + time | Admin → Customers ✅ |

Existing points validity, redemption and reversal rules are unchanged: every new reward is a normal points lot with the usual expiry.

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
4. Import real inventory and print barcode labels (demo products are already removed)
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
