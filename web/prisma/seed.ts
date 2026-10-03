/**
 * Demo seed. Product names/prices are PLACEHOLDERS so the site can be reviewed —
 * replace with PB Mobiles' real inventory (or import from their spreadsheet) before launch.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { assertVariantGrade } from "../src/lib/grade";
import { migrateLegacyBalances } from "../src/lib/loyalty";
import { brandSlugFor } from "../src/lib/brands";
import { normalizePhone, slugify } from "../src/lib/format";
import { quote, type FinancingConfig } from "../src/lib/finance";
import { SETTING_DEFAULTS } from "../src/lib/settings";
import { formatRewardsId, rewardsIdNumber, REWARDS_ID_PREFIX } from "../src/lib/rewards-id";
import { RUNNING_MODELS } from "./running-models";
import { INSTALLMENT_BRANDS } from "../src/lib/brands";

const db = new PrismaClient();

type V = { storage?: string; ram?: string; color?: string; colorHex?: string; price: number; salePrice?: number; cost?: number; stock: number; grade?: string; battery?: number; notes?: string; partNumber?: string };
type P = {
  name: string;
  brand: string;
  type: "PHONE" | "TABLET" | "ACCESSORY" | "PART";
  condition?: "NEW" | "USED";
  accessoryType?: string;
  partType?: string;
  compatibleModel?: string;
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

// Phone spare parts (master brief §10) — repair-lab stock, sold at the till, never listed online.
const PARTS: P[] = [
  { name: "iPhone 13 OLED screen assembly", brand: "Apple", partType: "SCREEN", compatibleModel: "iPhone 13", description: "Replacement OLED display with frame.", variants: [{ price: 32000, cost: 24500, stock: 3, partNumber: "IP13-OLED" }] },
  { name: "iPhone 12 / 12 Pro battery", brand: "Apple", partType: "BATTERY", compatibleModel: "iPhone 12, iPhone 12 Pro", description: "2815mAh replacement battery.", variants: [{ price: 7500, cost: 4200, stock: 6, partNumber: "IP12-BAT" }] },
  { name: "Galaxy A54 USB-C charging port board", brand: "Samsung", partType: "CHARGING_PORT", compatibleModel: "Galaxy A54 5G", description: "Sub-board with USB-C port and microphone.", variants: [{ price: 4500, cost: 2300, stock: 4, partNumber: "SM-A546-SUB" }] },
  { name: "Galaxy S23 Ultra back glass", brand: "Samsung", partType: "BACK_GLASS", compatibleModel: "Galaxy S23 Ultra", description: "Rear glass panel with adhesive.", variants: [{ price: 6500, cost: 3600, stock: 1, partNumber: "SM-S918-BG" }] },
].map((p) => ({ ...p, type: "PART" as const, condition: "NEW" as const }));

// Phone Passport rewards exactly as the master brief (§4) specifies. The owner can edit them in Settings.
// Final PB Points redemption table (v6 final amendment §6).
const REWARDS = [
  { name: "Free Screen Protector", pointsCost: 50, kind: "ITEM", appliesTo: "ACCESSORY", description: "A screen protector for your phone (subject to stock).", sortOrder: 10 },
  { name: "Free Custom 3D Mobile Skin", pointsCost: 100, kind: "ITEM", appliesTo: "ACCESSORY", description: "Any 3D skin design, cut and fitted for your phone.", sortOrder: 20 },
  { name: "Free AirPods", pointsCost: 200, kind: "ITEM", appliesTo: "ACCESSORY", description: "One AirPods reward (subject to stock).", sortOrder: 30 },
];

// SAMPLE installment plans so the homepage section can be reviewed — the owner replaces these in Admin → Installments.
const INSTALLMENT_LISTINGS = [
  // Figures from the financing partner app for the Tecno Spark 40 Pro (30% down, 9 × Rs 8,863).
  { brand: "tecno", model: "TECNO Spark 40 Pro · 8GB / 256GB", regularPrice: 73999, installmentTotal: 101967, interestPercent: 6, downPayment: 22200, durationMonths: 9, planLabel: "9 monthly payments · 6% per month", availability: "AVAILABLE", sortOrder: 5 },
];
/** The sample plans shipped before the client's real list — removed from every database (with any iPhone plan). */
const SAMPLE_LISTING_MODELS = ["Samsung Galaxy A55 5G · 8GB / 256GB", "iPhone 15 · 128GB", "Infinix Note 40 · 8GB / 256GB"];

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
        partType: p.partType,
        compatibleModel: p.compatibleModel,
        loyaltyEligible: p.type !== "TABLET", // v4 §3: phones, accessories and parts earn; tablets aren't in the criteria
        description: p.description,
        specs: JSON.stringify(p.specs ?? {}),
        finishHex: p.finishHex,
        featured: !!p.featured,
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
          // Demo purchase price (≈80% of retail) so the investment / profit reports have something to show.
          costPrice: v.cost ?? Math.round(v.price * 0.8),
          partNumber: v.partNumber,
          stockQty: v.stock,
          lowStockThreshold: isUsed ? 0 : p.type === "ACCESSORY" || p.type === "PART" ? 3 : 2,
          grade: assertVariantGrade(p.condition ?? "NEW", v.grade), // single grade per SKU (§8)
          batteryHealth: v.battery,
          conditionNotes: v.notes,
          warrantyInfo: isUsed ? "30-day PB Lab hardware warranty" : p.type === "ACCESSORY" || p.type === "PART" ? "7-day replacement for manufacturing faults" : "Official brand warranty where applicable",
          returnInfo: isUsed ? "7-day return if the device does not match its listed grade" : "Unopened items returnable within 7 days",
        },
      });
      if (v.stock > 0) {
        await db.stockMovement.create({ data: { variantId: variant.id, type: "PURCHASE", qtyChange: v.stock, qtyAfter: v.stock, unitPrice: v.cost ?? Math.round(v.price * 0.8), reference: "OPENING", reason: "Opening stock (demo)" } });
      }
      skuSeq++;
    }
  }
}

/**
 * Custom Skins demo data (v4 §9–§11): brands, phone models with their skin templates (mm, measured from
 * the back, top-left origin — approximate, adjust in Admin → Custom skins → Brands & models), and five
 * sample designs from /public/skins assigned to every model.
 */
type M = [name: string, w: number, h: number, corner: number, camX: number, camY: number, camW: number, camH: number, camR: number, lenses: number, hex: string];
const SKIN_BRANDS: { name: string; models: M[] }[] = [
  { name: "Apple", models: [
    ["iPhone 16 Pro Max", 77.6, 163, 12, 5, 5, 38, 38, 10, 3, "#3b3a38"],
    ["iPhone 16 Pro", 71.5, 149.6, 11, 5, 5, 36, 36, 9.5, 3, "#3b3a38"],
    ["iPhone 15", 71.6, 147.6, 10, 5, 5, 30, 30, 8, 2, "#2e3a44"],
    ["iPhone 13", 71.5, 146.7, 10, 5, 5, 29, 29, 7.5, 2, "#1d2733"],
  ] },
  { name: "Samsung", models: [
    ["Galaxy S24 Ultra", 79, 162.3, 4, 9, 8, 14, 50, 7, 4, "#2b2d31"],
    ["Galaxy S24", 70.6, 147, 9, 8, 8, 12, 40, 6, 3, "#2b2d31"],
    ["Galaxy A55", 77.4, 161.1, 9, 9, 9, 12, 40, 6, 3, "#3c4a66"],
  ] },
  { name: "Xiaomi", models: [
    ["Mi 12 Pro", 74.6, 163.6, 9, 6, 6, 25, 42, 6, 3, "#4a4e55"],
    ["Xiaomi 14", 71.5, 152.8, 10, 6, 6, 30, 30, 8, 3, "#1c1f24"],
    ["Redmi Note 13 Pro", 74.2, 161.2, 9, 7, 7, 24, 36, 6, 3, "#262a30"],
  ] },
  { name: "Infinix", models: [
    ["Hot 40 Pro", 76.6, 168.6, 9, 7, 7, 30, 30, 8, 3, "#1b2230"],
    ["Note 40 Pro", 74.8, 164.3, 10, 7, 7, 32, 32, 16, 3, "#2a2f38"],
  ] },
  { name: "Tecno", models: [
    ["Camon 30", 75.5, 165, 9, 20, 7, 36, 36, 18, 3, "#23262d"],
    ["Spark 20 Pro", 76, 168, 9, 7, 7, 24, 34, 6, 3, "#1f2430"],
  ] },
];
// Skin types and prices from the client (1 Oct 2026). Editable in Admin → Custom skins.
const SKIN_TYPES = [
  { name: "3D Skin", price: 450, look: "TEXTURED", designMode: "DESIGN", description: "Raised 3D-textured finish." },
  { name: "Leather Skin", price: 650, look: "LEATHER", designMode: "DESIGN", description: "Real leather feel and grip." },
  { name: "Transparent Printed Skin", price: 550, look: "CLEAR", designMode: "DESIGN", description: "Design printed on a clear skin — your phone's colour shows through." },
  { name: "Customize Photo Skin", price: 850, look: "MATTE", designMode: "PHOTO", description: "Your own photo, printed to fit your phone." },
  { name: "Transparent Jelly", price: 350, look: "JELLY", designMode: "PLAIN", description: "Soft clear jelly cover." },
  { name: "UV Curved Jelly", price: 1000, look: "JELLY", designMode: "PLAIN", description: "UV-cured curved clear jelly for full-edge protection." },
];
const SKIN_DESIGNS = [
  { name: "Carbon Black", file: "carbon-black.svg", description: "Carbon-fibre look." },
  { name: "PB Racing", file: "pb-racing.svg", description: "PB blue, red and gold racing stripes." },
  { name: "Gold Marble", file: "gold-marble.svg", description: "White marble with gold veins." },
  { name: "Midnight Camo", file: "midnight-camo.svg", description: "Dark urban camouflage." },
  { name: "Sunset Wave", file: "sunset-wave.svg", description: "Warm sunset gradient with waves." },
];

async function seedSkinTypes() {
  for (const [i, t] of SKIN_TYPES.entries()) await db.skinType.create({ data: { ...t, sortOrder: i } });
}

async function seedSkins() {
  await seedSkinTypes();
  const modelIds: string[] = [];
  for (const [i, b] of SKIN_BRANDS.entries()) {
    const brand = await db.skinBrand.create({ data: { name: b.name, slug: slugify(b.name), sortOrder: i } });
    for (const [j, [name, widthMm, heightMm, cornerMm, cameraX, cameraY, cameraW, cameraH, cameraCornerMm, lenses, bodyHex]] of b.models.entries()) {
      const m = await db.phoneModel.create({ data: { brandId: brand.id, name, slug: slugify(name), sortOrder: j, widthMm, heightMm, cornerMm, cameraX, cameraY, cameraW, cameraH, cameraCornerMm, lenses, bodyHex } });
      modelIds.push(m.id);
    }
  }
  for (const [i, d] of SKIN_DESIGNS.entries()) {
    // "All phone models" — so every model added later shows these designs too.
    await db.skin.create({ data: { name: d.name, description: d.description, imageUrl: `/skins/${d.file}`, price: 0, allModels: true, sortOrder: i } });
  }
  return { models: modelIds.length, designs: SKIN_DESIGNS.length };
}

/** A listing as a 9-month plan priced with the site's calculator (saved settings over defaults). */
async function nineMonthPlan(l: { regularPrice: number; downPayment: number }) {
  const row = await db.setting.findUnique({ where: { key: "installmentCalc" } });
  const cfg = { ...SETTING_DEFAULTS.installmentCalc, ...(row ? JSON.parse(row.value) : {}) } as FinancingConfig;
  const q = quote(l.regularPrice, l.downPayment, 9, cfg);
  return { durationMonths: 9, installmentTotal: q.downPayment + q.perInstallment * 9, downPayment: q.downPayment, interestPercent: cfg.markupPercentPerMonth, planLabel: `9 monthly payments · ${cfg.markupPercentPerMonth}% per month` };
}

/**
 * Installs the client's running models (prisma/running-models.ts) as installment plans: 9 months on the
 * calculator's formula (minimum down payment). A listing with the same model name is updated, never duplicated.
 */
async function installRunningModels() {
  const brandRank = (slug: string) => Math.max(0, INSTALLMENT_BRANDS.findIndex((b) => b.slug === slug));
  let added = 0;
  for (const [i, m] of RUNNING_MODELS.entries()) {
    const model = `${m.name} · ${m.ram} / ${m.storage}`;
    const data = { brand: m.brand, model, modelNo: m.modelNo, colors: m.colors, regularPrice: m.price, availability: "AVAILABLE", active: true, sortOrder: 100 + brandRank(m.brand) * 100 + i, ...(await nineMonthPlan({ regularPrice: m.price, downPayment: 0 })) };
    const existing = await db.installmentListing.findFirst({ where: { model } });
    if (existing) await db.installmentListing.update({ where: { id: existing.id }, data });
    else {
      await db.installmentListing.create({ data });
      added++;
    }
  }
  return added;
}

async function main() {
  // Deploy builds pass SEED_ONLY_IF_EMPTY=1 so redeploys never wipe real/demo activity.
  if (process.env.SEED_ONLY_IF_EMPTY === "1" && (await db.product.count()) > 0) {
    await upgradeExisting();
    return;
  }
  console.log("Resetting demo data…");
  // Order matters for FK constraints.
  await db.$transaction([
    db.skin.deleteMany(), db.phoneModel.deleteMany(), db.skinBrand.deleteMany(), db.skinType.deleteMany(),
    db.attachment.deleteMany(), db.pushSubscription.deleteMany(), db.broadcast.deleteMany(),
    db.installmentSale.deleteMany(), db.installmentListing.deleteMany(), db.usedPhonePurchase.deleteMany(),
    db.review.deleteMany(), db.loyaltyTransaction.deleteMany(), db.note.deleteMany(),
    db.stockMovement.deleteMany(), db.payment.deleteMany(), db.orderItem.deleteMany(), db.order.deleteMany(),
    db.repairStatusChange.deleteMany(), db.repairRequest.deleteMany(), db.model3DJob.deleteMany(), db.variant.deleteMany(),
    db.product.deleteMany(), db.reward.deleteMany(), db.auditLog.deleteMany(),
    db.staffLoginEvent.deleteMany(), db.chatMessage.deleteMany(), db.staff.deleteMany(), db.customer.deleteMany(),
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

  await db.reward.createMany({ data: REWARDS });
  await db.installmentListing.createMany({ data: INSTALLMENT_LISTINGS });
  await installRunningModels();

  await createProducts([...NEW_PHONES.map((x) => ({ ...x, condition: "NEW" as const })), ...USED_PHONES, ...TABLETS, ...ACCESSORIES, ...PARTS], 1, "20");

  const skins = await seedSkins();

  const count = await db.product.count();
  console.log(`Seeded ${count} products (incl. spare parts), 7 staff accounts, ${REWARDS.length} Passport rewards, ${await db.installmentListing.count()} installment plans.`);
  console.log(`Custom Skins: ${skins.models} phone models, ${skins.designs} sample designs.`);
  console.log(`Staff logins: owner@pbmobiles.pk, employee1-6@pbmobiles.pk — temporary password: ${tempPassword}`);
}

/**
 * Deploys run the seed with SEED_ONLY_IF_EMPTY=1: real / demo activity is never wiped, but each
 * database is brought up to the latest brief once (idempotent — safe on every build).
 */
async function upgradeExisting() {
  const nextSeq = async () => {
    const skus = await db.variant.findMany({ select: { sku: true } });
    return Math.max(0, ...skus.map((v) => Number(v.sku.match(/^PB-(\d+)$/)?.[1] ?? 0))) + 1;
  };
  if ((await db.product.count({ where: { type: "TABLET" } })) === 0) {
    await createProducts(TABLETS, await nextSeq(), "22");
    console.log(`Added ${TABLETS.length} demo tablets.`);
  }
  if ((await db.product.count({ where: { type: "PART" } })) === 0) {
    await createProducts(PARTS, await nextSeq(), "23");
    console.log(`Added ${PARTS.length} demo spare parts.`);
  }
  // v6 final PB Points table: 50 screen protector / 100 custom 3D skin / 200 AirPods. Older rewards are switched
  // off, not deleted (past redemptions keep their history). Runs once.
  if (!(await db.setting.findUnique({ where: { key: "migration.rewardsV6" } }))) {
    await db.reward.updateMany({ data: { active: false } });
    await db.reward.createMany({ data: REWARDS });
    await db.setting.create({ data: { key: "migration.rewardsV6", value: JSON.stringify({ at: new Date().toISOString() }) } });
    console.log("Installed the final PB Points rewards (50 / 100 / 200).");
  }
  // Client request: the 12-month option is removed everywhere — calculator and listings. Listings that were on
  // 12 months become proper 9-month plans priced with the calculator's own formula (not the 12-month total
  // spread over 9). Runs once.
  if (!(await db.setting.findUnique({ where: { key: "migration.no12Months" } }))) {
    const row = await db.setting.findUnique({ where: { key: "installmentCalc" } });
    if (row) {
      const cfg = JSON.parse(row.value) as { termOptions?: string };
      const terms = String(cfg.termOptions ?? "").split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0 && n !== 12);
      await db.setting.update({ where: { key: "installmentCalc" }, data: { value: JSON.stringify({ ...cfg, termOptions: (terms.length ? [...new Set(terms)] : [3, 6, 9]).join(",") }) } });
    }
    for (const l of await db.installmentListing.findMany({ where: { durationMonths: 12 } })) await db.installmentListing.update({ where: { id: l.id }, data: await nineMonthPlan(l) });
    await db.setting.create({ data: { key: "migration.no12Months", value: JSON.stringify({ at: new Date().toISOString() }) } });
    console.log("Removed the 12-month installment plan.");
  }
  // Fix for databases where the first 12-month clean-up kept the 12-month total over 9 months: re-price exactly
  // those listings (the ones that clean-up updated) with the calculator's 9-month formula. Runs once.
  if (!(await db.setting.findUnique({ where: { key: "migration.no12MonthsFix" } }))) {
    const marker = await db.setting.findUnique({ where: { key: "migration.no12Months" } });
    const at = marker ? new Date((JSON.parse(marker.value) as { at: string }).at).getTime() : NaN;
    let fixed = 0;
    if (Number.isFinite(at)) {
      const converted = await db.installmentListing.findMany({ where: { durationMonths: 9, updatedAt: { gte: new Date(at - 120_000), lte: new Date(at + 5_000) } } });
      for (const l of converted) {
        await db.installmentListing.update({ where: { id: l.id }, data: await nineMonthPlan(l) });
        fixed++;
      }
    }
    await db.setting.create({ data: { key: "migration.no12MonthsFix", value: JSON.stringify({ at: new Date().toISOString(), fixed }) } });
    if (fixed) console.log(`Re-priced ${fixed} former 12-month installment listing(s) as 9-month plans.`);
  }
  // Client request (3 Oct 2026): installments only on the partner app's running models (itel, nubia, OPPO, Infinix
  // lists). The fake sample plans and every iPhone plan go — deleted, or switched off if a sale points at one.
  if (!(await db.setting.findUnique({ where: { key: "migration.runningModelsV1" } }))) {
    const fake = await db.installmentListing.findMany({ where: { OR: [{ model: { in: SAMPLE_LISTING_MODELS } }, { brand: "apple" }, { model: { contains: "iPhone" } }, { model: { contains: "iphone" } }] }, include: { _count: { select: { sales: true } } } });
    for (const l of fake) {
      if (l._count.sales) await db.installmentListing.update({ where: { id: l.id }, data: { active: false } });
      else await db.installmentListing.delete({ where: { id: l.id } });
    }
    const added = await installRunningModels();
    await db.setting.create({ data: { key: "migration.runningModelsV1", value: JSON.stringify({ at: new Date().toISOString(), removed: fake.length, added }) } });
    console.log(`Installments: removed ${fake.length} sample / iPhone plan(s), added ${added} running model(s).`);
  }
  // Change request V2 §5: customer IDs become PBM-0001, PBM-0002… in joining order. The old random number is
  // kept in legacyNo so cards already printed still scan. Runs once (and only touches non-PBM numbers).
  if (!(await db.setting.findUnique({ where: { key: "migration.rewardsIdV2" } }))) {
    const all = await db.customer.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, passportNo: true } });
    let n = Math.max(0, ...all.map((c) => rewardsIdNumber(c.passportNo)));
    let renumbered = 0;
    for (const c of all) {
      if (c.passportNo.startsWith(REWARDS_ID_PREFIX)) continue;
      await db.customer.update({ where: { id: c.id }, data: { passportNo: formatRewardsId(++n), legacyNo: c.passportNo } });
      renumbered++;
    }
    await db.setting.create({ data: { key: "migration.rewardsIdV2", value: JSON.stringify({ at: new Date().toISOString(), renumbered }) } });
    if (renumbered) console.log(`Gave ${renumbered} customer(s) a PBM- Rewards ID (old numbers kept for scanning).`);
  }
  // Change request (Oct 2026): "PB Phone Passport" is now "PB Rewards" — also in saved points-history notes. Runs once.
  if (!(await db.setting.findUnique({ where: { key: "migration.rewardsName" } }))) {
    let renamed = 0;
    for (const t of await db.loyaltyTransaction.findMany({ where: { reason: { contains: "Passport" } }, select: { id: true, reason: true } })) {
      const reason = t.reason!.replace(/PB Phone Passport|Phone Passport/g, "PB Rewards").replace(/new PB Rewards\b(?! account)/g, "new PB Rewards account");
      if (reason !== t.reason) {
        await db.loyaltyTransaction.update({ where: { id: t.id }, data: { reason } });
        renamed++;
      }
    }
    await db.setting.create({ data: { key: "migration.rewardsName", value: JSON.stringify({ at: new Date().toISOString(), renamed }) } });
    if (renamed) console.log(`Renamed "Passport" to "PB Rewards" in ${renamed} points-history note(s).`);
  }
  // v6 §6: installment plans start at 30% down — 10% and 20% are removed from any saved settings. Runs once.
  if (!(await db.setting.findUnique({ where: { key: "migration.installments30" } }))) {
    const row = await db.setting.findUnique({ where: { key: "installmentCalc" } });
    if (row) {
      const cfg = JSON.parse(row.value) as { minDownPaymentPercent?: number; downPaymentOptions?: string };
      const options = String(cfg.downPaymentOptions ?? "").split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 30 && n < 100);
      const next = { ...cfg, minDownPaymentPercent: Math.max(30, Number(cfg.minDownPaymentPercent ?? 30)), downPaymentOptions: (options.length ? [...new Set(options)] : [30, 40, 50]).join(",") };
      await db.setting.update({ where: { key: "installmentCalc" }, data: { value: JSON.stringify(next) } });
    }
    await db.setting.create({ data: { key: "migration.installments30", value: JSON.stringify({ at: new Date().toISOString() }) } });
    console.log("Installment plans now start at 30% down payment.");
  }
  if ((await db.installmentListing.count()) === 0) {
    await db.installmentListing.createMany({ data: INSTALLMENT_LISTINGS });
    console.log("Added the TECNO installment plan.");
  }
  // Brand picker: give existing listings a brand, and add the Tecno example from the partner app once.
  for (const l of await db.installmentListing.findMany({ where: { brand: null } })) {
    await db.installmentListing.update({ where: { id: l.id }, data: { brand: brandSlugFor(null, l.model) } });
  }
  if ((await db.installmentListing.count({ where: { brand: "tecno" } })) === 0) {
    await db.installmentListing.create({ data: INSTALLMENT_LISTINGS[0] });
  }
  // v4 §3 points criteria: accessories and parts earn (1 point per Rs 100), tablets don't. Run once, so
  // later per-product choices by staff aren't overwritten on every deploy.
  if (!(await db.setting.findUnique({ where: { key: "migration.pointsV4" } }))) {
    await db.product.updateMany({ where: { type: { in: ["PHONE", "ACCESSORY", "PART"] } }, data: { loyaltyEligible: true } });
    await db.product.updateMany({ where: { type: "TABLET" }, data: { loyaltyEligible: false } });
    await db.setting.create({ data: { key: "migration.pointsV4", value: JSON.stringify({ at: new Date().toISOString() }) } });
    console.log("Applied the v4 PB Points criteria to product eligibility.");
  }
  if ((await db.skinBrand.count()) === 0) {
    const skins = await seedSkins();
    console.log(`Added Custom Skins demo data: ${skins.models} phone models, ${skins.designs} sample designs.`);
  }
  if ((await db.skinType.count()) === 0) {
    await seedSkinTypes();
    // Sample designs priced before skin types existed: the type now sets the price, and they suit every model.
    await db.skin.updateMany({ where: { imageUrl: { startsWith: "/skins/" } }, data: { price: 0, allModels: true } });
    console.log(`Added ${SKIN_TYPES.length} skin types with the client's prices.`);
  }
  // One phone number = one customer: store every number as 03XXXXXXXXX (was "+92…" / "92…" for some).
  if (!(await db.setting.findUnique({ where: { key: "migration.phonesV1" } }))) {
    let fixed = 0;
    const clashes: string[] = [];
    for (const c of await db.customer.findMany({ select: { id: true, phone: true } })) {
      const phone = normalizePhone(c.phone);
      if (phone === c.phone) continue;
      if (await db.customer.findUnique({ where: { phone } })) clashes.push(`${c.phone} → ${phone}`);
      else {
        await db.customer.update({ where: { id: c.id }, data: { phone } });
        fixed++;
      }
    }
    await db.setting.create({ data: { key: "migration.phonesV1", value: JSON.stringify({ at: new Date().toISOString(), fixed, clashes }) } });
    if (fixed) console.log(`Normalised ${fixed} customer phone number(s).`);
    if (clashes.length) console.log(`Duplicate customers share a phone in another format (merge by hand): ${clashes.join(", ")}`);
  }
  const migrated = await migrateLegacyBalances();
  if (migrated) console.log(`Moved ${migrated} existing points balance(s) onto the new six-month points lots.`);
  console.log("Database already has data — upgrade checks done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
