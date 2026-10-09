/**
 * Ronin accessories (client file "Ronin_Products_Ready_To_Send.pdf"): name, model, colour, regular / sale price,
 * warranty, description and photos (extracted to /public/products/ronin). Added to the shop inventory by
 * prisma/seed.ts → addRoninProducts. Stock wasn't in the file, so each starts at 3 — staff set the real count.
 */
export type RoninProduct = {
  name: string;
  tagline?: string;
  accessoryType: "EARBUDS" | "HANDSFREE" | "SMARTWATCH" | "CHARGER" | "CABLE" | "SPEAKER";
  model: string;
  color?: string;
  colorHex: string;
  price: number;
  salePrice?: number;
  warranty?: string;
  description: string;
  images: string[];
};

const photos = (slug: string, n: number) => Array.from({ length: n }, (_, i) => `/products/ronin/${slug}-${i + 1}.webp`);

export const RONIN_PRODUCTS: RoninProduct[] = [
  {
    name: "Ronin Lucid Earbuds",
    tagline: "Dual Device Connectivity | Signature Sound",
    accessoryType: "EARBUDS",
    model: "R-7135",
    color: "Blue",
    colorHex: "#2f4a7a",
    price: 7395,
    warranty: "1 year official brand warranty",
    description:
      "Lucid combines futuristic transparent glass aesthetics with powerful everyday performance, delivering rich stereo sound through dynamic 10mm drivers and the latest Bluetooth V5.4 connectivity for a fast, stable, and seamless listening experience on both Android and iOS devices. Designed for modern lifestyles, it features Quad-Mic ENC technology for clearer calls, dual device connectivity for effortless switching, and intuitive touch controls for music, calls, and voice assistants like Siri and Google Assistant. With up to 5 hours of playtime, Type-C fast charging, IPX4 water resistance, and support for the Ronin Studio App, Lucid is built to offer style, comfort, and smart functionality in one premium wireless audio experience.",
    images: photos("lucid-earbuds", 2),
  },
  {
    name: "Ronin Cord Neckband",
    accessoryType: "HANDSFREE",
    model: "R-3510",
    colorHex: "#1c1f26",
    price: 6495,
    salePrice: 5495,
    description:
      "The RONiN Cord is a premium Bluetooth V5.4 neckband designed for everyday audio with rich sound and deep bass, backed by a powerful 270 mAh battery that delivers up to 12 hours of nonstop playtime. Featuring environmental noise cancellation and ergonomic magnetic buds, it ensures clear calls, immersive music, and comfortable all-day wear with multifunction controls for calls, music, and voice assistant support. With a transmission range of up to 10 meters and universal device compatibility, this neckband brings reliable wireless audio with the convenience of Type-C charging.",
    images: photos("cord-neckband", 3),
  },
  {
    name: "Ronin R-09 Smart Watch",
    accessoryType: "SMARTWATCH",
    model: "R-09",
    color: "Nickel - Teal",
    colorHex: "#2f6f73",
    price: 10695,
    salePrice: 9999,
    warranty: "1 year warranty",
    description:
      "The R-09 Smart Watch is a cutting-edge wearable designed for the modern lifestyle. With its sleek design and advanced features, it seamlessly integrates into your daily routine. Equipped with fitness tracking capabilities, the R-09 monitors your heart rate, steps, and sleep patterns, helping you stay on top of your health goals. Its vibrant display ensures easy navigation through notifications, messages, and apps. With a long-lasting battery and customizable watch faces, the R-09 Smart Watch is perfect for anyone looking to enhance their productivity and style.",
    images: photos("r09-smart-watch", 2),
  },
  {
    name: "Ronin CHAOS Handsfree Type-C",
    tagline: "8D Surround Sound | VR/AR gaming interface",
    accessoryType: "HANDSFREE",
    model: "R-007 Gaming",
    color: "Red",
    colorHex: "#c8323a",
    price: 2395,
    salePrice: 1999,
    warranty: "1 year (conditional)",
    description:
      "Introducing the R-007 Gamerz Handsfree Type-C, the ultimate audio companion for gamers and music lovers alike. Designed for immersive sound quality, these hands-free earbuds deliver crystal-clear audio, ensuring you never miss a beat during intense gaming sessions. With a sleek, ergonomic design, the R-007 Gamerz Handsfree Type-C fits comfortably in your ears, allowing for hours of wear without discomfort. The durable construction and tangle-free cable make them perfect for on-the-go use. Elevate your gaming experience and enjoy your favorite tunes with style and ease.",
    images: photos("chaos-handsfree", 3),
  },
  {
    name: "Ronin R-6015 30W Max Charger",
    tagline: "Charger Support with PD | 30 watt max",
    accessoryType: "CHARGER",
    model: "R-6015",
    color: "Black Type-C (PD)",
    colorHex: "#1c1f26",
    price: 2095,
    salePrice: 1999,
    warranty: "1 year warranty",
    description:
      "Introducing the R-6015 30W Max Charger, your ultimate charging companion. Designed for efficiency and speed, this sleek charger delivers a powerful 30W output, ensuring your devices are powered up in no time. Its compact design makes it perfect for travel, while the stylish finish adds a touch of elegance to your tech collection. Compatible with a wide range of devices, the R-6015 is not just a charger; it is a statement of modern convenience. Elevate your charging experience today!",
    images: photos("r6015-charger", 4),
  },
  {
    name: "Ronin R-305 3 in 1 Cable",
    accessoryType: "CABLE",
    model: "R-305",
    color: "Black",
    colorHex: "#1c1f26",
    price: 1145,
    salePrice: 999,
    description:
      "Ronin R-305 3-in-1 durable braided cable. You've got an iPhone, a phone with USB-C and an Android with micro-USB — which means keeping track of three different charge / sync cables and remembering to pack all three when travelling. No more! Now you can charge them all with this R-305 3-in-1 charge / sync cable from Ronin.",
    images: photos("r305-3in1-cable", 3),
  },
  {
    name: "Ronin XCEED 2 in 1 Cable",
    tagline: "240W Type-C Charge, 27W Charging iPhone",
    accessoryType: "CABLE",
    model: "R-2020",
    color: "Black",
    colorHex: "#1c1f26",
    price: 1695,
    salePrice: 1495,
    warranty: "1 year warranty",
    description:
      "Introducing the R-2020 - 2 In 1 Cable, the ultimate solution for your charging needs. This versatile cable combines functionality and style, allowing you to charge multiple devices effortlessly. Crafted with premium materials, the R-2020 ensures durability and longevity. Its sleek design makes it a perfect accessory for any tech enthusiast. With fast charging capabilities, you can power up your devices in no time. Upgrade your charging experience with the R-2020 - 2 In 1 Cable and enjoy the perfect blend of convenience and elegance.",
    images: photos("xceed-2in1-cable", 3),
  },
  {
    name: "Ronin FLEXIN Mini PD Cable",
    accessoryType: "CABLE",
    model: "R-2060",
    color: "Blue",
    colorHex: "#2f4a7a",
    price: 899,
    salePrice: 699,
    description:
      "The Ronin R-2060 FLEXIN Mini Type-C to Type-C Cable is an ultra-compact, heavy-duty charging and data sync cord engineered for fast-paced, portable power needs. Featuring a short 7.8-inch (approx. 20 cm) tangle-free profile, it provides a direct, high-efficiency connection between Type-C power banks, laptops, smartphones, and tablets without long cable clutter. Built with a high-density braided exterior and reinforced strain-relief joints, it delivers reliable fast charging, rapid data transmission, and high-tensile durability designed for everyday carry and seamless one-handed power bank usage.",
    images: photos("flexin-mini-pd", 4),
  },
  {
    name: "Ronin Retro Speaker",
    accessoryType: "SPEAKER",
    model: "R-3035",
    color: "Beige",
    colorHex: "#d8cdb4",
    price: 6995,
    salePrice: 5995,
    warranty: "1 year warranty",
    description:
      "Retro is a modern Bluetooth speaker with a classic soul, designed for people who appreciate clean lines and purposeful simplicity. Powered by Bluetooth 5.4 with EDR and BLE support, it delivers a stable wireless experience within a 10 meter range. Its 2000mAh battery offers up to 4 hours of music playback, while the Type C charging port keeps it convenient and compatible with your everyday setup. The 57mm speaker driver produces a warm, full-bodied sound that matches its vintage inspired aesthetic. Retro is not built for gaming, waterproofing, or fast charging but for pure, uncomplicated listening that fits effortlessly into any room or routine.",
    images: photos("retro-speaker", 3),
  },
  {
    name: "Ronin R-014 LUXE Smart Watch",
    accessoryType: "SMARTWATCH",
    model: "R-014",
    color: "Gold",
    colorHex: "#c9a14a",
    // The file lists Rs 9,995 regular and Rs 10,995 "sale" (higher) — listed at the regular Rs 9,995 until confirmed.
    price: 9995,
    warranty: "1 year warranty",
    description: "The Ronin R-014 LUXE is a metal smart watch in gold with a stainless steel link strap.",
    images: photos("r014-luxe-watch", 6),
  },
];
