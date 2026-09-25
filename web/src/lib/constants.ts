// Allowed values for string "enum" columns (see prisma/schema.prisma header).

export const BRAND = {
  name: "PB Mobiles",
  full: "PB Mobiles & Repairing Lab",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE ?? "+92 300 0000000",
  whatsapp: process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "923000000000",
  email: process.env.NEXT_PUBLIC_STORE_EMAIL ?? "hello@pbmobiles.pk",
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS ?? "Shop address to be confirmed, Pakistan",
  hours: [
    { days: "Mon – Sat", time: "11:00 am – 9:00 pm" },
    { days: "Sunday", time: "2:00 pm – 8:00 pm" },
  ],
  socials: [
    { label: "Instagram", href: "#" },
    { label: "Facebook", href: "#" },
    { label: "TikTok", href: "#" },
    { label: "WhatsApp", href: "#" },
  ],
};

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/new-phones", label: "New Phones" },
  { href: "/used-phones", label: "Used Phones" },
  { href: "/accessories", label: "Accessories" },
  { href: "/repair", label: "Repair" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const ACCESSORY_TYPES = {
  CASE: "Cases",
  CHARGER: "Chargers",
  CABLE: "Cables",
  SCREEN_PROTECTOR: "Screen protectors",
  POWER_BANK: "Power banks",
  EARBUDS: "Earbuds",
  OTHER: "Other",
} as const;
export type AccessoryType = keyof typeof ACCESSORY_TYPES;

export const USED_GRADES = {
  "A+": "Like new — no visible marks",
  A: "Excellent — faint signs of use",
  B: "Good — light scratches or scuffs",
  C: "Fair — visible wear, fully functional",
} as const;

export const REPAIR_CATEGORIES = {
  SCREEN: "Screen / display",
  BATTERY: "Battery",
  CHARGING: "Charging port",
  CAMERA: "Camera",
  WATER: "Water damage",
  SPEAKER_MIC: "Speaker / microphone",
  SOFTWARE: "Software / lock / update",
  BACK_GLASS: "Back glass / housing",
  OTHER: "Something else",
} as const;
export type RepairCategory = keyof typeof REPAIR_CATEGORIES;

/** Staff workflow from §8: New → Received → Diagnosing → Awaiting Approval/Parts → Repairing → Ready → Completed. */
export const REPAIR_STATUSES = [
  { key: "NEW", label: "New" },
  { key: "RECEIVED", label: "Received" },
  { key: "DIAGNOSING", label: "Diagnosing" },
  { key: "AWAITING", label: "Awaiting approval / parts" },
  { key: "REPAIRING", label: "Repairing" },
  { key: "READY", label: "Ready for collection" },
  { key: "COMPLETED", label: "Completed" },
] as const;

export const DROP_OFF = {
  WALK_IN: "Walk in during opening hours",
  APPOINTMENT: "Book a time slot",
  PICKUP: "Request pickup (selected areas)",
} as const;

export const PAYMENT_STATUS = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
export const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PAYMENT_METHODS = {
  MOBILE_WALLET: { label: "Mobile wallet", hint: "JazzCash / Easypaisa wallet" },
  DIRECT_DEBIT: { label: "Bank account", hint: "Direct debit via your bank" },
  CARD: { label: "Debit / credit card", hint: "Processed securely by the gateway" },
  COD: { label: "Cash on delivery", hint: "Pay when your order arrives" },
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PHONE_BRANDS = ["Apple", "Samsung", "Google", "Xiaomi", "OnePlus", "Oppo", "Vivo", "Infinix", "Tecno", "Realme", "Nothing", "Other"];
