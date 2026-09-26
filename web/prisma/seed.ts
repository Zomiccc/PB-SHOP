/**
 * Demo seed. Product names/prices are PLACEHOLDERS so the site can be reviewed —
 * replace with PB Mobiles' real inventory (or import from their spreadsheet) before launch.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { assertVariantGrade } from "../src/lib/grade";

const db = new PrismaClient();

type V = { storage?: string; ram?: string; color?: string; colorHex?: string; price: number; salePrice?: number; stock: number; grade?: string; battery?: number; notes?: string };
type P = {
  name: string;
  brand: string;
  type: "PHONE" | "TABLET" | "ACCESSORY";
  condition?: "NEW" | "USED";
  accessoryType?: string;
  finishHex?: string;
  featured?: boolean;
  description: string;
  specs?: Record<string, string>;
  variants: V[];
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const NEW_PHONES: P[] = [
  {
    name: "iPhone 16 Pro Max", brand: "Apple", type: "PHONE", finishHex: "#b9a88f", featured: true,
    description: "Titanium design, the biggest Pro display and a camera system built for serious creators.",
    specs: { Display: '6.9" Super Retina XDR, 120Hz', Chip: "A18 Pro", Camera: "48MP Fusion + 48MP Ultra Wide + 12MP 5x", Battery: "Up to 33 hrs video", "Operating system": "iOS" },
    variants: [
      { storage: "256GB", color: "Desert Titanium", colorHex: "#b9a88f", price: 489999, stock: 4 },
      { storage: "256GB", color: "Black Titanium", colorHex: "#3b3b3d", price: 489999, stock: 3 },
      { storage: "512GB", color: "Natural Titanium", colorHex: "#a7a39b", price: 549999, stock: 2 },
    ],
  },
  {
    name: "iPhone 16", brand: "Apple", type: "PHONE", finishHex: "#5a7fa8", featured: true,
    description: "Camera Control, A18 performance and all-day battery in a bright aluminium finish.",
    specs: { Display: '6.1" Super Retina XDR', Chip: "A18", Camera: "48MP Fusion + 12MP Ultra Wide", "Operating system": "iOS" },
    variants: [
      { storage: "128GB", color: "Ultramarine", colorHex: "#5a7fa8", price: 299999, salePrice: 289999, stock: 6 },
      { storage: "256GB", color: "Black", colorHex: "#2b2b2e", price: 334999, stock: 3 },
    ],
  },
  {
    name: "Galaxy S25 Ultra", brand: "Samsung", type: "PHONE", finishHex: "#6b7078", featured: true,
    description: "Built-in S Pen, 200MP camera and Galaxy AI in a titanium frame.",
    specs: { Display: '6.9" QHD+ Dynamic AMOLED 2X', Chip: "Snapdragon 8 Elite for Galaxy", Camera: "200MP + 50MP + 50MP + 10MP", Battery: "5000mAh", "Operating system": "Android" },
    variants: [
      { storage: "256GB", color: "Titanium Silverblue", colorHex: "#6b7c92", price: 429999, stock: 5 },
      { storage: "512GB", color: "Titanium Black", colorHex: "#2f3033", price: 479999, stock: 2 },
    ],
  },
  {
    name: "Galaxy S25", brand: "Samsung", type: "PHONE", finishHex: "#a9c4d9",
    description: "Compact flagship with Galaxy AI and a bright 120Hz display.",
    specs: { Display: '6.2" FHD+ Dynamic AMOLED 2X', Chip: "Snapdragon 8 Elite for Galaxy", Battery: "4000mAh", "Operating system": "Android" },
    variants: [{ storage: "256GB", color: "Icyblue", colorHex: "#a9c4d9", price: 279999, stock: 4 }],
  },
  {
    name: "Galaxy A56 5G", brand: "Samsung", type: "PHONE", finishHex: "#c7b8d8",
    description: "Everyday 5G phone with a big AMOLED screen and long software support.",
    specs: { Display: '6.7" Super AMOLED 120Hz', Battery: "5000mAh", "Operating system": "Android" },
    variants: [
      { storage: "128GB", color: "Awesome Lilac", colorHex: "#c7b8d8", price: 129999, stock: 8 },
      { storage: "256GB", color: "Awesome Graphite", colorHex: "#3a3a3c", price: 144999, stock: 5 },
    ],
  },
  {
    name: "Pixel 9 Pro", brand: "Google", type: "PHONE", finishHex: "#e8e2d6",
    description: "Google's smartest camera and seven years of updates.",
    specs: { Display: '6.3" Super Actua LTPO', Chip: "Google Tensor G4", Camera: "50MP + 48MP + 48MP 5x", "Operating system": "Android" },
    variants: [{ storage: "256GB", color: "Porcelain", colorHex: "#e8e2d6", price: 324999, stock: 2 }],
  },
  {
    name: "Xiaomi 15", brand: "Xiaomi", type: "PHONE", finishHex: "#dfe7e1",
    description: "Leica optics and flagship speed in a pocketable body.",
    specs: { Display: '6.36" AMOLED 120Hz', Chip: "Snapdragon 8 Elite", Battery: "5240mAh", "Operating system": "Android" },
    variants: [{ storage: "512GB", color: "Green", colorHex: "#9fb8a4", price: 249999, stock: 3 }],
  },
  {
    name: "Redmi Note 14 Pro", brand: "Xiaomi", type: "PHONE", finishHex: "#7a5fa6",
    description: "200MP camera, curved AMOLED and fast charging at a friendly price.",
    specs: { Display: '6.67" AMOLED 120Hz', Battery: "5110mAh, 45W", "Operating system": "Android" },
    variants: [{ storage: "256GB", color: "Aurora Purple", colorHex: "#7a5fa6", price: 84999, stock: 10 }],
  },
  {
    name: "OnePlus 13", brand: "OnePlus", type: "PHONE", finishHex: "#1f3a5f",
    description: "Hasselblad camera, 100W charging and a huge 6000mAh battery.",
    specs: { Display: '6.82" LTPO AMOLED', Chip: "Snapdragon 8 Elite", Battery: "6000mAh, 100W", "Operating system": "Android" },
    variants: [{ storage: "256GB", color: "Midnight Ocean", colorHex: "#1f3a5f", price: 259999, stock: 0 }],
  },
  {
    name: "Infinix Note 50 Pro", brand: "Infinix", type: "PHONE", finishHex: "#c0c4c8",
    description: "Big battery, fast charging and a bright display for everyday use.",
    specs: { Display: '6.78" AMOLED', Battery: "5200mAh", "Operating system": "Android" },
    variants: [{ storage: "256GB", color: "Titanium Grey", colorHex: "#9a9ea3", price: 69999, stock: 12 }],
  },
];

const USED_PHONES: P[] = [
  { name: "iPhone 14 Pro", brand: "Apple", finishHex: "#5b4e6b", description: "PTA approved, Face ID working, original screen.", variants: [{ storage: "128GB", color: "Deep Purple", colorHex: "#5b4e6b", price: 214999, stock: 1, grade: "A", battery: 88, notes: "Faint hairline on frame edge. Box included." }] },
  { name: "iPhone 13", brand: "Apple", finishHex: "#394c63", featured: true, description: "Reliable everyday iPhone, fully tested by the lab.", variants: [{ storage: "128GB", color: "Midnight", colorHex: "#23262e", price: 134999, stock: 1, grade: "A+", battery: 91, notes: "Like new. Charger included." }, { storage: "256GB", color: "Blue", colorHex: "#394c63", price: 144999, stock: 1, grade: "B", battery: 84, notes: "Light scratches on back glass." }] },
  { name: "iPhone 12", brand: "Apple", finishHex: "#d9d2c3", description: "Great value iPhone with 5G and OLED display.", variants: [{ storage: "64GB", color: "White", colorHex: "#e9e6df", price: 89999, stock: 1, grade: "B", battery: 82, notes: "Battery replaced by PB Lab with genuine-spec part." }] },
  { name: "Galaxy S22", brand: "Samsung", finishHex: "#2f5a4c", description: "Compact Samsung flagship, fully functional.", variants: [{ storage: "128GB", color: "Green", colorHex: "#2f5a4c", price: 79999, stock: 1, grade: "A", notes: "Minor mark near camera." }] },
  { name: "Galaxy S23 Ultra", brand: "Samsung", finishHex: "#3a3f38", featured: true, description: "S Pen, 200MP camera — flagship power for less.", variants: [{ storage: "256GB", color: "Phantom Black", colorHex: "#26272a", price: 219999, stock: 1, grade: "A", notes: "S Pen included. Screen protector pre-applied." }] },
  { name: "Pixel 7", brand: "Google", finishHex: "#e3e1d8", description: "Clean Android with a brilliant camera.", variants: [{ storage: "128GB", color: "Snow", colorHex: "#e3e1d8", price: 64999, stock: 1, grade: "C", notes: "Visible wear on corners. All functions tested." }] },
  { name: "iPhone 11", brand: "Apple", finishHex: "#c2b6d6", description: "A dependable first iPhone.", variants: [{ storage: "64GB", color: "Purple", colorHex: "#c2b6d6", price: 64999, stock: 0, grade: "B", battery: 79, notes: "Sold out — ask to be notified." }] },
  { name: "OnePlus 11", brand: "OnePlus", finishHex: "#1f3a2c", description: "Fast charging, smooth display, great condition.", variants: [{ storage: "256GB", color: "Eternal Green", colorHex: "#1f3a2c", price: 99999, stock: 1, grade: "A", notes: "Original charger included." }] },
].map((p) => ({ ...p, type: "PHONE" as const, condition: "USED" as const }));

const ACCESSORIES: P[] = [
  { name: "MagSafe Clear Case — iPhone 16 Pro", brand: "PB Select", accessoryType: "CASE", finishHex: "#dfe6ee", featured: true, description: "Crystal-clear, anti-yellowing case with strong magnets.", variants: [{ price: 4999, stock: 25 }] },
  { name: "Rugged Armour Case — Galaxy S25 Ultra", brand: "PB Select", accessoryType: "CASE", finishHex: "#1b1f24", description: "Military-grade drop protection with raised camera lip.", variants: [{ price: 3999, stock: 18 }] },
  { name: "25W USB-C Fast Charger", brand: "Samsung", accessoryType: "CHARGER", finishHex: "#f2f2f2", featured: true, description: "Genuine Samsung super fast charging adapter.", variants: [{ price: 5499, stock: 30 }] },
  { name: "20W USB-C Power Adapter", brand: "Apple", accessoryType: "CHARGER", finishHex: "#ffffff", description: "Official Apple fast charger for iPhone.", variants: [{ price: 6999, stock: 20 }] },
  { name: "Braided USB-C to USB-C Cable 1m", brand: "Anker", accessoryType: "CABLE", finishHex: "#20242a", description: "Tough braided cable, 100W charging support.", variants: [{ price: 2499, stock: 40 }] },
  { name: "USB-C to Lightning Cable 1m", brand: "Apple", accessoryType: "CABLE", finishHex: "#ffffff", description: "Original Apple cable for fast charging.", variants: [{ price: 4499, stock: 15 }] },
  { name: "Tempered Glass Screen Protector", brand: "PB Select", accessoryType: "SCREEN_PROTECTOR", finishHex: "#cfe3f5", description: "9H glass, fitted free in-store.", variants: [{ price: 1499, stock: 100 }] },
  { name: "Privacy Glass Screen Protector", brand: "PB Select", accessoryType: "SCREEN_PROTECTOR", finishHex: "#39414b", description: "Keeps your screen private from side angles.", variants: [{ price: 2499, stock: 60 }] },
  { name: "20,000mAh Power Bank 22.5W", brand: "Xiaomi", accessoryType: "POWER_BANK", finishHex: "#2c2f33", featured: true, description: "Charge your phone up to four times.", variants: [{ price: 7999, stock: 14 }] },
  { name: "MagSafe Battery Pack 5000mAh", brand: "Anker", accessoryType: "POWER_BANK", finishHex: "#e9e3f2", description: "Snap-on wireless battery for iPhone.", variants: [{ price: 9999, stock: 8 }] },
  { name: "AirPods Pro (2nd gen) USB-C", brand: "Apple", accessoryType: "EARBUDS", finishHex: "#ffffff", featured: true, description: "Active noise cancellation and adaptive audio.", variants: [{ price: 69999, stock: 5 }] },
  { name: "Galaxy Buds3", brand: "Samsung", accessoryType: "EARBUDS", finishHex: "#c9ccd1", description: "Open-type earbuds with Galaxy AI features.", variants: [{ price: 34999, stock: 1 }] },
].map((p) => ({ ...p, type: "ACCESSORY" as const, condition: "NEW" as const }));

// Tablets (master brief §9) — each used tablet is its own SKU with exactly one grade.
const TABLETS: P[] = [
  { name: "iPad Air 11-inch (M2)", brand: "Apple", type: "TABLET", condition: "NEW", finishHex: "#8fa7c4", featured: true, description: "Thin, light and powerful with the M2 chip and Apple Pencil Pro support.", specs: { Display: '11" Liquid Retina', Chip: "Apple M2", Camera: "12MP Wide", "Operating system": "iPadOS" }, variants: [{ storage: "128GB", ram: "8GB", color: "Blue", colorHex: "#8fa7c4", price: 219999, stock: 4 }, { storage: "256GB", ram: "8GB", color: "Space Grey", colorHex: "#4a4d52", price: 254999, stock: 2 }] },
  { name: "iPad (10th generation)", brand: "Apple", type: "TABLET", condition: "NEW", finishHex: "#e6c65c", description: "All-screen design with a 10.9-inch display — great for school and home.", specs: { Display: '10.9" Liquid Retina', Chip: "A14 Bionic", "Operating system": "iPadOS" }, variants: [{ storage: "64GB", ram: "4GB", color: "Yellow", colorHex: "#e6c65c", price: 119999, stock: 5 }] },
  { name: "Galaxy Tab S9 FE", brand: "Samsung", type: "TABLET", condition: "NEW", finishHex: "#b9c9b1", featured: true, description: "IP68 water resistance, S Pen in the box and a vivid 10.9-inch screen.", specs: { Display: '10.9" TFT 90Hz', Battery: "8000mAh", "Operating system": "Android" }, variants: [{ storage: "128GB", ram: "6GB", color: "Mint", colorHex: "#b9c9b1", price: 134999, stock: 3 }] },
  { name: "Galaxy Tab A9+", brand: "Samsung", type: "TABLET", condition: "NEW", finishHex: "#5b5e63", description: "Big-screen entertainment with quad speakers at a friendly price.", specs: { Display: '11" 90Hz', Battery: "7040mAh", "Operating system": "Android" }, variants: [{ storage: "64GB", ram: "4GB", color: "Graphite", colorHex: "#5b5e63", price: 64999, stock: 6 }] },
  { name: "Xiaomi Pad 6", brand: "Xiaomi", type: "TABLET", condition: "NEW", finishHex: "#c9d6e3", description: "144Hz 2.8K display and Snapdragon power for work and play.", specs: { Display: '11" 144Hz 2.8K', Battery: "8840mAh", "Operating system": "Android" }, variants: [{ storage: "256GB", ram: "8GB", color: "Mist Blue", colorHex: "#c9d6e3", price: 104999, stock: 2 }] },
  { name: "iPad Pro 11-inch (M1)", brand: "Apple", type: "TABLET", condition: "USED", finishHex: "#9ea3a8", description: "Pro performance and ProMotion display, tested by the PB Lab.", variants: [{ storage: "128GB", ram: "8GB", color: "Silver", colorHex: "#c4c7cb", price: 149999, stock: 1, grade: "A", battery: 89, notes: "Minor scuff on the back edge." }, { storage: "256GB", ram: "8GB", color: "Space Grey", colorHex: "#4a4d52", price: 144999, stock: 1, grade: "B", battery: 84, notes: "Light scratches on the back." }] },
];

async function createProducts(list: P[], firstSeq: number, barcodePrefix: string) {
  let skuSeq = firstSeq;
  for (const p of list) {
    const isUsed = p.condition === "USED";
    const product = await db.product.create({
      data: {
        slug: slug(`${p.name}${isUsed ? "-used" : ""}`),
        name: p.name,
        brand: p.brand,
        type: p.type,
        condition: p.condition ?? "NEW",
        accessoryType: p.accessoryType,
        description: p.description,
        specs: JSON.stringify(p.specs ?? {}),
        finishHex: p.finishHex,
        featured: !!p.featured,
        careCardEligible: p.type !== "ACCESSORY",
        metaTitle: `${p.name}${isUsed ? " (Used)" : ""} | PB Mobiles`,
        metaDescription: p.description,
      },
    });
    for (const v of p.variants) {
      const code = `PB-${String(skuSeq).padStart(4, "0")}`;
      const variant = await db.variant.create({
        data: {
          productId: product.id,
          sku: code,
          barcode: `${barcodePrefix}${String(100000000 + skuSeq).slice(-10)}`, // internal EAN-style barcode; replace with manufacturer EAN where available
          storage: v.storage,
          ram: v.ram,
          color: v.color,
          colorHex: v.colorHex,
          price: v.price,
          salePrice: v.salePrice,
          stockQty: v.stock,
          lowStockThreshold: isUsed ? 0 : p.type === "ACCESSORY" ? 5 : 2,
          grade: assertVariantGrade(p.condition ?? "NEW", v.grade), // single grade per SKU (§8)
          batteryHealth: v.battery,
          conditionNotes: v.notes,
          warrantyInfo: isUsed ? "30-day PB Lab hardware warranty" : p.type === "ACCESSORY" ? "7-day replacement for manufacturing faults" : "Official brand warranty where applicable",
          returnInfo: isUsed ? "7-day return if the device does not match its listed grade" : "Unopened items returnable within 7 days",
        },
      });
      if (v.stock > 0) {
        await db.stockMovement.create({ data: { variantId: variant.id, type: "RECEIVED", qtyChange: v.stock, qtyAfter: v.stock, reason: "Opening stock (seed)" } });
      }
      skuSeq++;
    }
  }
}

async function main() {
  // Deploy builds pass SEED_ONLY_IF_EMPTY=1 so redeploys never wipe real/demo activity.
  if (process.env.SEED_ONLY_IF_EMPTY === "1" && (await db.product.count()) > 0) {
    // Existing databases still get the demo tablet category once (added in the master brief).
    if ((await db.product.count({ where: { type: "TABLET" } })) === 0) {
      const skus = await db.variant.findMany({ select: { sku: true } });
      const next = Math.max(0, ...skus.map((v) => Number(v.sku.match(/^PB-(\d+)$/)?.[1] ?? 0))) + 1;
      await createProducts(TABLETS, next, "22");
      console.log(`Added ${TABLETS.length} demo tablets.`);
    } else {
      console.log("Database already has data — skipping seed.");
    }
    return;
  }
  console.log("Resetting demo data…");
  // Order matters for FK constraints.
  await db.$transaction([
    db.review.deleteMany(), db.careCardRedemption.deleteMany(), db.careCard.deleteMany(), db.loyaltyTransaction.deleteMany(), db.note.deleteMany(),
    db.stockMovement.deleteMany(), db.payment.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(),
    db.repairStatusChange.deleteMany(), db.repairRequest.deleteMany(), db.model3DJob.deleteMany(), db.variant.deleteMany(),
    db.product.deleteMany(), db.reward.deleteMany(), db.careCardService.deleteMany(), db.auditLog.deleteMany(),
    db.staffLoginEvent.deleteMany(), db.staff.deleteMany(), db.customer.deleteMany(), db.chatMessage.deleteMany(),
    db.chatConversation.deleteMany(), db.contactMessage.deleteMany(), db.setting.deleteMany(),
  ]);

  // §16 — 7 individual accounts. Temporary password from SEED_STAFF_PASSWORD or randomly generated,
  // printed once below; everyone must change it at first login. Never hard-code it (the repo is public).
  const tempPassword = process.env.SEED_STAFF_PASSWORD || crypto.randomBytes(9).toString("base64url");
  const pw = await bcrypt.hash(tempPassword, 10);
  await db.staff.create({ data: { name: "Owner", email: "owner@pbmobiles.pk", passwordHash: pw, role: "SUPER_ADMIN" } });
  for (let i = 1; i <= 6; i++) {
    await db.staff.create({ data: { name: `Employee 0${i}`, email: `employee${i}@pbmobiles.pk`, passwordHash: pw, role: "ADMIN" } });
  }

  // §18 — visits 1–4 as specified; visit 5 is a configurable placeholder, not an invented service.
  const services = [
    { visitNumber: 1, name: "Free battery health check" },
    { visitNumber: 2, name: "Free screen protector" },
    { visitNumber: 3, name: "Free charging port check" },
    { visitNumber: 4, name: "Free storage check" },
    { visitNumber: 5, name: "Reserved — to be defined by owner", configured: false, active: false },
  ];
  for (const s of services) await db.careCardService.create({ data: s });

  await db.reward.createMany({
    data: [
      { name: "Free tempered glass fitting", pointsCost: 150 },
      { name: "Rs 1,000 off any accessory", pointsCost: 500 },
      { name: "Free diagnostic + priority repair slot", pointsCost: 300 },
    ],
  });

  await createProducts([...NEW_PHONES.map((x) => ({ ...x, condition: "NEW" as const })), ...USED_PHONES, ...TABLETS, ...ACCESSORIES], 1, "20");

  const count = await db.product.count();
  console.log(`Seeded ${count} products, 7 staff accounts, 5 Care Card visit slots.`);
  console.log(`Staff logins: owner@pbmobiles.pk, employee1-6@pbmobiles.pk — temporary password: ${tempPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
