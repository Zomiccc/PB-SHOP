/**
 * Erorex + Audionic accessories (client product sheets, 9 Oct 2026). Photos are the brands' official product
 * images (sharper than the screenshots in the sheets), saved in /public/products/{erorex,audionic}.
 * Audionic prices come from the sheet; Erorex power banks, neckbands and wall chargers from the price sheets
 * (10 Oct 2026). Products still without a price (Erorex car chargers and earbuds) are added HIDDEN: staff enter the
 * price in Admin → Products, then press "Make live". Stock starts at 3 — set the real count.
 * Added to the inventory by prisma/seed.ts → addBrandAccessories.
 */
export type BrandAccessory = {
  name: string;
  brand: "Erorex" | "Audionic";
  accessoryType: "POWER_BANK" | "CHARGER" | "CAR_CHARGER" | "HANDSFREE" | "EARBUDS";
  model: string | null;
  color: string | null;
  colorHex: string;
  /** One shop option per colour (power banks sold in two colours); otherwise a single option. */
  colors: { name: string; hex: string }[];
  tagline: string | null;
  price: number | null;
  salePrice: number | null;
  warranty: string | null;
  description: string;
  keySpecs: string | null;
  images: string[];
};

export const BRAND_ACCESSORIES: BrandAccessory[] = [
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      },
      {
        "name": "Pink",
        "hex": "#e7a7b4"
      }
    ],
    "name": "Erorex PowerBank (P-02)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-02",
    "color": "White / Pink",
    "colorHex": "#eceef1",
    "tagline": "Travel Power Bank | 22.5W | 10,000mAh",
    "price": 3499,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-02 is a high-quality travel power bank with high-speed QC3.0 charging, 22.5W output, real 10,000mAh capacity, LED digital percentage display, AUTO-ID charging, built-in Type-C and Lightning cables and a lithium-polymer battery.",
    "keySpecs": "1 USB port; Type-C output up to 20V/1.5A; USB output up to 5V/4.5A; Type-C input up to 12V/2.5A; output/input power listed as 5V-3.0A.",
    "images": [
      "/products/erorex/erorex-p-02-1.webp",
      "/products/erorex/erorex-p-02-2.webp",
      "/products/erorex/erorex-p-02-3.webp",
      "/products/erorex/erorex-p-02-4.webp",
      "/products/erorex/erorex-p-02-5.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "name": "Erorex PowerBank (P-05)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-05",
    "color": "White",
    "colorHex": "#eceef1",
    "tagline": "Travel Power Bank | 22.5W | 20,000mAh",
    "price": 4999,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-05 is a high-quality travel power bank with high-speed QC3.0 charging, 22.5W output, real 20,000mAh capacity, LED digital percentage display, AUTO-ID charging and a lithium-polymer battery.",
    "keySpecs": "1 USB + 1 Type-C port; Type-C output up to 20V/1.5A; USB output up to 5V/4.5A; Type-C input up to 12V/2.5A; output/input power listed as 5V-3.0A.",
    "images": [
      "/products/erorex/erorex-p-05-1.webp",
      "/products/erorex/erorex-p-05-2.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Grey",
        "hex": "#8b919b"
      }
    ],
    "name": "Erorex PowerBank (P-06)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-06",
    "color": "Grey",
    "colorHex": "#8b919b",
    "tagline": "Travel Power Bank | 22.5W | 10,000mAh",
    "price": 3763,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-06 is a high-quality travel power bank with QC3.0 high-speed charging, 22.5W output, real 10,000mAh capacity, LED digital percentage display, AUTO-ID charging and built-in Type-C and Lightning cables.",
    "keySpecs": "1 USB + 1 Type-C port; Type-C output up to 20V/1.5A; USB output up to 5V/4.5A; Type-C input up to 12V/2.5A; lithium-polymer battery.",
    "images": [
      "/products/erorex/erorex-p-06-1.webp",
      "/products/erorex/erorex-p-06-2.webp",
      "/products/erorex/erorex-p-06-3.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Grey",
        "hex": "#8b919b"
      }
    ],
    "name": "Erorex PowerBank (P-07)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-07",
    "color": "Grey",
    "colorHex": "#8b919b",
    "tagline": "Travel Power Bank | 22.5W | 20,000mAh",
    "price": 5999,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-07 is a high-quality travel power bank with QC3.0 high-speed charging, 22.5W output, real 20,000mAh capacity, LED digital percentage display, AUTO-ID charging and built-in Type-C and Lightning cables.",
    "keySpecs": "1 USB + 1 Type-C port; Type-C output up to 20V/1.5A; USB output up to 5V/4.5A; Type-C input up to 12V/2.5A; lithium-polymer battery.",
    "images": [
      "/products/erorex/erorex-p-07-1.webp",
      "/products/erorex/erorex-p-07-2.webp",
      "/products/erorex/erorex-p-07-3.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Grey",
        "hex": "#8b919b"
      }
    ],
    "name": "Erorex PowerBank (P-08)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-08",
    "color": "Grey",
    "colorHex": "#8b919b",
    "tagline": "Travel Power Bank | 22.5W | 10,000mAh",
    "price": 2499,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-08 is a high-quality travel power bank with QC3.0 high-speed charging, 22.5W output, real 10,000mAh capacity, LED digital percentage display, AUTO-ID charging and a lithium-polymer battery.",
    "keySpecs": "1 USB + 1 Type-C port; Type-C output up to 20V/1.5A; USB output up to 5V/4.5A; Type-C input up to 12V/2.5A; output/input power listed as 5V-3.0A.",
    "images": [
      "/products/erorex/erorex-p-08-1.webp",
      "/products/erorex/erorex-p-08-2.webp",
      "/products/erorex/erorex-p-08-3.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      },
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex PowerBank (P-15)",
    "brand": "Erorex",
    "accessoryType": "POWER_BANK",
    "model": "P-15",
    "color": "White / Black",
    "colorHex": "#eceef1",
    "tagline": "Travel Power Bank | 10,000mAh",
    "price": 2899,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex P-15 is a travel power bank with real 10,000mAh capacity, AUTO-ID charging and dual USB charging. It is a high-quality product for portable mobile charging.",
    "keySpecs": "Real capacity: 10,000mAh; output: DC 5V/2.4A; input: DC 5V/2.4A; dual USB ports; output 2.4A.",
    "images": [
      "/products/erorex/erorex-p-15-1.webp",
      "/products/erorex/erorex-p-15-2.webp",
      "/products/erorex/erorex-p-15-3.webp",
      "/products/erorex/erorex-p-15-4.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex Car Charger (C-16)",
    "brand": "Erorex",
    "accessoryType": "CAR_CHARGER",
    "model": "C-16",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Car Charger | 3.4A Output",
    "price": null,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-16 is a car charger with 3.4A output, fast and safe charging, AUTO-ID charging and low-temperature operation. It also has over-voltage and over-current protection and CE/ROHS compliance.",
    "keySpecs": "Output: 3.4A; dual USB; Micro & Type-C cable pin support; input listed as 100-240V 50/60Hz on the product page.",
    "images": [
      "/products/erorex/erorex-c-16-1.webp",
      "/products/erorex/erorex-c-16-2.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex Car Charger (PD-C16)",
    "brand": "Erorex",
    "accessoryType": "CAR_CHARGER",
    "model": "PD-C16",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Car Charger | PD 30W / QC 4.0 20W",
    "price": null,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex PD-C16 is a super-fast car charger with PD 30W and QC 4.0 20W support. It is described as compatible with iPhone, iPad, tablets, Blackberry and other mobile devices, with over-voltage, over-current, over-charge and over-temperature protection.",
    "keySpecs": "USB-A: 5V/3A, 9V/2A, 12V/1.5A. USB-C: 5V/3A, 9V/3A, 12V/2.5A, 15V/2A, 20V/1.5A. USB-A + USB-C: 5V/3.4A. PPS: 3.3-11V/3A.",
    "images": [
      "/products/erorex/erorex-pd-c16-1.webp",
      "/products/erorex/erorex-pd-c16-2.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex Neckband (BT-E10)",
    "brand": "Erorex",
    "accessoryType": "HANDSFREE",
    "model": "BT-E10",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Wireless Neckband | Bluetooth 5.1",
    "price": 2403,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex BT-E10 is a flexible and lightweight neckband with high-quality reproduction sound, a built-in microphone and three-button controls for music, calls and volume.",
    "keySpecs": "Bluetooth 5.1; 200mAh battery; 10m range; about 12h talk time; about 5h music time; about 1h charge time; Micro Pin charging; 360h standby.",
    "images": [
      "/products/erorex/erorex-bt-e10-1.webp",
      "/products/erorex/erorex-bt-e10-2.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black / Red",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex Neckband (BT-E20 ENC)",
    "brand": "Erorex",
    "accessoryType": "HANDSFREE",
    "model": "BT-E20 ENC",
    "color": "Black / Red",
    "colorHex": "#1c1f26",
    "tagline": "Wireless Neckband | Bluetooth 5.3",
    "price": 2610,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex BT-E20 ENC is a flexible and lightweight neckband with high-quality reproduction sound, built-in microphone and controls for music, calls and volume.",
    "keySpecs": "Bluetooth 5.3; 280mAh battery; 10m range; about 22h talk time; about 20h music time; about 1h charge time; Micro Pin charging; 30 days standby.",
    "images": [
      "/products/erorex/erorex-bt-e20-enc-1.webp",
      "/products/erorex/erorex-bt-e20-enc-2.webp",
      "/products/erorex/erorex-bt-e20-enc-3.webp",
      "/products/erorex/erorex-bt-e20-enc-4.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Erorex Neckband (BT-E30)",
    "brand": "Erorex",
    "accessoryType": "HANDSFREE",
    "model": "BT-E30",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Wireless Neckband | Bluetooth 5.4",
    "price": 1800,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex BT-E30 is a flexible and lightweight neckband with high-quality reproduction sound, built-in microphone and controls for music, calls and volume.",
    "keySpecs": "Bluetooth 5.4; 350mAh battery; 10m range; about 22h talk time; about 38h music time; about 1h charge time; Micro Pin charging; 30 days standby.",
    "images": [
      "/products/erorex/erorex-bt-e30-1.webp",
      "/products/erorex/erorex-bt-e30-2.webp",
      "/products/erorex/erorex-bt-e30-3.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "name": "Erorex AirPods (E-2)",
    "brand": "Erorex",
    "accessoryType": "EARBUDS",
    "model": "E-2",
    "color": "White",
    "colorHex": "#eceef1",
    "tagline": "Wireless Earbuds | Magnetic Charging Case",
    "price": null,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex AirPods E-2 are 2nd generation earphones with a magnetic charging case, transparency mode, three silicone-tip sizes, sweat and water resistance, adaptive EQ, quick Siri access and quick charging. The case can be charged wirelessly with a Qi-certified charger or using a Lightning connector, and it is listed as compatible with all devices.",
    "keySpecs": "Listening time: up to 4.5 hours (up to 5 hours). Talk time: up to 3.5 hours. Charging case: magnetic; Qi wireless or Lightning charging.",
    "images": [
      "/products/erorex/erorex-e-2-1.webp",
      "/products/erorex/erorex-e-2-2.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "name": "Erorex AirPods (E-3) ANC",
    "brand": "Erorex",
    "accessoryType": "EARBUDS",
    "model": "E-3 ANC",
    "color": "White",
    "colorHex": "#eceef1",
    "tagline": "Wireless Earbuds | ANC",
    "price": null,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex AirPods E-3 ANC are 2nd generation earphones with a magnetic charging case, transparency mode, three silicone-tip sizes, sweat and water resistance, adaptive EQ, quick Siri access and quick charging. The case can be charged wirelessly with a Qi-certified charger or using a Lightning connector, and it is listed as compatible with all devices.",
    "keySpecs": "Listening time: up to 4.5 hours (up to 5 hours). Talk time: up to 3.5 hours. Charging case: magnetic; Qi wireless or Lightning charging.",
    "images": [
      "/products/erorex/erorex-e-3-anc-1.webp",
      "/products/erorex/erorex-e-3-anc-2.webp",
      "/products/erorex/erorex-e-3-anc-3.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "name": "Erorex Open-Ear Wireless Earbuds (AirPro E-6)",
    "brand": "Erorex",
    "accessoryType": "EARBUDS",
    "model": "AirPro E-6",
    "color": "White",
    "colorHex": "#eceef1",
    "tagline": "Open-Ear Wireless Earbuds | Bluetooth",
    "price": null,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex AirPro E-6 are open-ear wireless Bluetooth earbuds with HD stereo sound, sweat-resistant construction, touch controls and wireless Bluetooth connectivity. They are made for workouts or outdoor use and work with all devices.",
    "keySpecs": "Open-ear design; touch control; HD stereo sound; sweat-resistant design; Bluetooth connectivity.",
    "images": [
      "/products/erorex/erorex-airpro-e-6-1.webp",
      "/products/erorex/erorex-airpro-e-6-2.webp",
      "/products/erorex/erorex-airpro-e-6-3.webp",
      "/products/erorex/erorex-airpro-e-6-4.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black + Orange",
        "hex": "#1c1f26"
      }
    ],
    "name": "Audionic Airbud 690 ION Wireless Earbuds",
    "brand": "Audionic",
    "accessoryType": "EARBUDS",
    "model": "690 ION",
    "color": "Black + Orange",
    "colorHex": "#1c1f26",
    "tagline": "Quad Mic ENC | Gaming Mode | 30-Hour Playtime",
    "price": 13399,
    "salePrice": 3499,
    "warranty": "1 Year",
    "description": "Airbud 690 ION is a stylish true-wireless earbuds model designed for mobile users who want strong everyday performance. It offers Quad Mic ENC for clearer calls, a gaming mode with low latency, up to 30 hours total playtime with the case, IPX5 splash resistance and Type-C charging, making it a strong mobile-audio option for calling, music and casual gaming. Source: Official Audionic product page",
    "keySpecs": null,
    "images": [
      "/products/audionic/audionic-690-ion-1.webp",
      "/products/audionic/audionic-690-ion-2.webp",
      "/products/audionic/audionic-690-ion-3.webp",
      "/products/audionic/audionic-690-ion-4.webp",
      "/products/audionic/audionic-690-ion-5.webp",
      "/products/audionic/audionic-690-ion-6.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Blue",
        "hex": "#2f4a7a"
      }
    ],
    "name": "Audionic Airbud 425 TWS Earbuds",
    "brand": "Audionic",
    "accessoryType": "EARBUDS",
    "model": "425",
    "color": "Blue",
    "colorHex": "#2f4a7a",
    "tagline": "Bass Boosted Sound | Quad Mic ENC",
    "price": 11999,
    "salePrice": 3799,
    "warranty": "1 Year",
    "description": "Airbud 425 TWS is a mobile-focused earbuds model with a compact charging case and clean in-ear fit. It features Quad Mic ENC for improved calling, a bass-oriented sound profile, Bluetooth connectivity and multiple colour options, making it suitable for daily phone use, media playback and handsfree calling. Source: Official Audionic product page",
    "keySpecs": null,
    "images": [
      "/products/audionic/audionic-425-tws-1.webp",
      "/products/audionic/audionic-425-tws-2.webp",
      "/products/audionic/audionic-425-tws-3.webp",
      "/products/audionic/audionic-425-tws-4.webp",
      "/products/audionic/audionic-425-tws-5.webp",
      "/products/audionic/audionic-425-tws-6.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Audionic Airbud Signature S680",
    "brand": "Audionic",
    "accessoryType": "EARBUDS",
    "model": "S680",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Premium Look | Bass Boosted Sound",
    "price": 14599,
    "salePrice": 3499,
    "warranty": "1 Year",
    "description": "Signature S680 combines a refined case design with a modern stem-style earbud shape. It is positioned as a premium everyday earbuds option with bass-boosted audio, Quad Mic ENC for calls and a mobile-friendly charging case, making it a solid choice for users who want style and wireless convenience together. Source: Official Audionic product page",
    "keySpecs": null,
    "images": [
      "/products/audionic/audionic-s680-1.webp",
      "/products/audionic/audionic-s680-2.webp",
      "/products/audionic/audionic-s680-3.webp",
      "/products/audionic/audionic-s680-4.webp",
      "/products/audionic/audionic-s680-5.webp",
      "/products/audionic/audionic-s680-6.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Smoky Metal",
        "hex": "#5a5d63"
      }
    ],
    "name": "Audionic Trance Airbud 850 Hexa Mic with ANC",
    "brand": "Audionic",
    "accessoryType": "EARBUDS",
    "model": "850",
    "color": "Smoky Metal",
    "colorHex": "#5a5d63",
    "tagline": "Hexa Mic | ANC | Premium Audio",
    "price": 20999,
    "salePrice": 8999,
    "warranty": "1 Year",
    "description": "Trance Airbud 850 is a premium true-wireless model built for users who want stronger voice pickup and noise control. It includes Hexa Mic support, Active Noise Cancellation and a premium design language, helping position it as a higher-end mobile audio product for immersive listening and clearer calls. Source: Official Audionic product page",
    "keySpecs": null,
    "images": [
      "/products/audionic/audionic-850-anc-1.webp",
      "/products/audionic/audionic-850-anc-2.webp",
      "/products/audionic/audionic-850-anc-3.webp",
      "/products/audionic/audionic-850-anc-4.webp",
      "/products/audionic/audionic-850-anc-5.webp",
      "/products/audionic/audionic-850-anc-6.webp"
    ]
  },
  {
    "colors": [
      {
        "name": "Black",
        "hex": "#1c1f26"
      }
    ],
    "name": "Audionic Signature S-350 Neckband",
    "brand": "Audionic",
    "accessoryType": "HANDSFREE",
    "model": "S-350",
    "color": "Black",
    "colorHex": "#1c1f26",
    "tagline": "Wireless Neckband | Comfortable Daily Use",
    "price": 6999,
    "salePrice": 3299,
    "warranty": "1 Year",
    "description": "Signature S-350 is a lightweight Bluetooth neckband made for users who prefer a secure around-the-neck form factor. It is suitable for music, calls and daily commuting, and it provides a more stable fit than standard earbuds while keeping the product compact, mobile-friendly and easy to use with smartphones. Source: Official Audionic product page",
    "keySpecs": null,
    "images": [
      "/products/audionic/audionic-s-350-1.webp",
      "/products/audionic/audionic-s-350-2.webp",
      "/products/audionic/audionic-s-350-3.webp",
      "/products/audionic/audionic-s-350-4.webp",
      "/products/audionic/audionic-s-350-5.webp",
      "/products/audionic/audionic-s-350-6.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-01)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-01",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "USB Travel Charger | 2.1A Output",
    "price": 599,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-01 is a USB travel charger with 2.1A output and a micro USB cable. Fast, safe charging with low-temperature operation, over-voltage and over-current protection.",
    "keySpecs": "2.1A output; 1 USB port; micro USB cable; CE & ROHS; 100–240V 50/60Hz input.",
    "images": [
      "/products/erorex/erorex-c-01-1.webp",
      "/products/erorex/erorex-c-01-2.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-02)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-02",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "USB Travel Charger | 3.1A Output",
    "price": 599,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-02 is a dual-USB travel charger with 3.1A output and Auto-ID charging, available with a micro USB or Type-C cable. Low-temperature operation with over-voltage and over-current protection.",
    "keySpecs": "3.1A output; 2 USB ports; micro / Type-C cable; Auto-ID; CE & ROHS; 100–240V 50/60Hz input.",
    "images": [
      "/products/erorex/erorex-c-02-1.webp",
      "/products/erorex/erorex-c-02-2.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-06)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-06",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "USB Travel Charger | 3.4A Output",
    "price": 699,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-06 is a dual-USB travel charger with 3.4A output and Auto-ID charging, available with a micro USB or Type-C cable. Low-temperature operation with over-voltage and over-current protection.",
    "keySpecs": "3.4A output; 2 USB ports; micro / Type-C cable; Auto-ID; CE & ROHS; 100–240V input.",
    "images": [
      "/products/erorex/erorex-c-06-1.webp",
      "/products/erorex/erorex-c-06-2.webp",
      "/products/erorex/erorex-c-06-3.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-07)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-07",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "Travel Charger | 2.1A Output",
    "price": 599,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-07 is a compact wall charger with 2.1A output for everyday phone charging, with a smart chip, temperature protection, over-voltage, over-current and over-charge protection, and fireproof materials.",
    "keySpecs": "2.1A output; smart chip; temperature, over-voltage, over-current and over-charge protection; fireproof housing.",
    "images": [
      "/products/erorex/erorex-c-07-1.webp",
      "/products/erorex/erorex-c-07-2.webp",
      "/products/erorex/erorex-c-07-3.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-10)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-10",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "Travel Charger | 3.1A Output",
    "price": 799,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-10 is a dual-port travel charger with 3.1A output for fast, protected charging of phones and accessories.",
    "keySpecs": "3.1A output; 2 USB ports; protected charging.",
    "images": [
      "/products/erorex/erorex-c-10-1.webp",
      "/products/erorex/erorex-c-10-2.webp",
      "/products/erorex/erorex-c-10-3.webp",
      "/products/erorex/erorex-c-10-4.webp",
      "/products/erorex/erorex-c-10-5.webp"
    ]
  },
  {
    "name": "Erorex Charger (C-12)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "C-12",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "USB Travel Charger | 3.1A Output",
    "price": 799,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex C-12 is a compact dual-USB travel charger with 3.1A output for quick charging of phones and accessories.",
    "keySpecs": "3.1A output; 2 USB ports; compact travel size.",
    "images": [
      "/products/erorex/erorex-c-12-1.webp",
      "/products/erorex/erorex-c-12-2.webp"
    ]
  },
  {
    "name": "Erorex Charger (PD-C13)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "PD-C13",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "Dual Port 30W PD + 18W USB Charger",
    "price": 1999,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex PD-C13 is a dual-port fast charger with a 30W Power Delivery (Type-C) port and an 18W USB port, for fast charging of compatible phones and accessories.",
    "keySpecs": "30W PD (Type-C) + 18W USB; dual port fast charging.",
    "images": [
      "/products/erorex/erorex-pd-c13-1.webp",
      "/products/erorex/erorex-pd-c13-2.webp",
      "/products/erorex/erorex-pd-c13-3.webp",
      "/products/erorex/erorex-pd-c13-4.webp"
    ]
  },
  {
    "name": "Erorex Charger (PD-C17)",
    "brand": "Erorex",
    "accessoryType": "CHARGER",
    "model": "PD-C17",
    "color": "White",
    "colorHex": "#eceef1",
    "colors": [
      {
        "name": "White",
        "hex": "#eceef1"
      }
    ],
    "tagline": "3.1A USB + PD Charger",
    "price": 899,
    "salePrice": null,
    "warranty": null,
    "description": "The Erorex PD-C17 combines a 3.1A USB output with a PD (Type-C) charging port for everyday fast charging of compatible phones and other devices.",
    "keySpecs": "3.1A USB + PD (Type-C) port.",
    "images": [
      "/products/erorex/erorex-pd-c17-1.webp",
      "/products/erorex/erorex-pd-c17-2.webp",
      "/products/erorex/erorex-pd-c17-3.webp",
      "/products/erorex/erorex-pd-c17-4.webp",
      "/products/erorex/erorex-pd-c17-5.webp"
    ]
  }
];
