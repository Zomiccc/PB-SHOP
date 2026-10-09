// Allowed values for string "enum" columns (see prisma/schema.prisma header).

/** An env value, unless it's empty or one of the old example placeholders (then the real default is used). */
const env = (v: string | undefined) => (v && !/0000000|to be confirmed|pbmobiles\.pk/i.test(v) ? v : undefined);

export const BRAND = {
  name: "PB Mobiles",
  full: "PB Mobiles & Repairing Lab",
  phone: env(process.env.NEXT_PUBLIC_STORE_PHONE) ?? "0334 6888696",
  whatsapp: env(process.env.NEXT_PUBLIC_STORE_WHATSAPP) ?? "923346888696",
  email: env(process.env.NEXT_PUBLIC_STORE_EMAIL) ?? "info@pbmobiles.com",
  /** Website printed on the back of the PB Rewards card (client reference artwork). */
  cardWebsite: process.env.NEXT_PUBLIC_CARD_WEBSITE ?? "pbisb.com",
  address: env(process.env.NEXT_PUBLIC_STORE_ADDRESS) ?? "PB Mobiles, Shop #30, Ghouri Mobile Mall, Ghouri Town, Islamabad",
  hours: [
    { days: "Every day", time: "10:00 am – 11:00 pm" },
  ],
  socials: [
    { label: "Instagram", href: "https://instagram.com/pbmobiles.pk" },
    { label: "Facebook", href: "https://facebook.com/pbmobiles.pk" },
    { label: "TikTok", href: "https://www.tiktok.com/@pbmobiles.pk" },
    { label: "WhatsApp", href: "https://wa.me/923346888696" },
  ] as { label: "Instagram" | "Facebook" | "TikTok" | "WhatsApp"; href: string }[],
};

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/new-phones", label: "New Phones" },
  { href: "/used-phones", label: "Used Phones" },
  { href: "/tablets", label: "Tablets" },
  { href: "/accessories", label: "Accessories" },
  { href: "/installments", label: "Installments" },
  { href: "/custom-skins", label: "Custom Skins" },
  { href: "/repair", label: "Repair" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Shop warranty (client request, 10 Oct 2026): used phones 3 days, accessories 7 days. */
export const USED_WARRANTY = "3-day PB Lab warranty";
export const ACCESSORY_WARRANTY = "7-day warranty";

export const ACCESSORY_TYPES = {
  CASE: "Cases",
  CHARGER: "Chargers",
  CAR_CHARGER: "Car chargers",
  CABLE: "Cables",
  SCREEN_PROTECTOR: "Screen protectors",
  POWER_BANK: "Power banks",
  EARBUDS: "Earbuds",
  HANDSFREE: "Handsfree & neckbands",
  SMARTWATCH: "Smart watches",
  SPEAKER: "Speakers",
  OTHER: "Other",
} as const;
export type AccessoryType = keyof typeof ACCESSORY_TYPES;

/** Phone spare parts (master brief §10) — repair-lab stock, sellable at the till, not listed online. */
export const PART_TYPES = {
  SCREEN: "Screen / display",
  BATTERY: "Battery",
  CHARGING_PORT: "Charging port / board",
  CAMERA: "Camera",
  BACK_GLASS: "Back glass / housing",
  SPEAKER: "Speaker / microphone",
  OTHER: "Other part",
} as const;

export const ITEM_CATEGORIES = {
  PHONE: "Phones",
  TABLET: "Tablets",
  PART: "Phone Spare Parts",
  ACCESSORY: "Accessories",
} as const;

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
