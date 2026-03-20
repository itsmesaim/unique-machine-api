import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/unique-machine";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    model: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    images: [String],
    specs: { type: Map, of: String, default: {} },
    inStock: { type: Boolean, default: true },
    flashSale: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", ProductSchema);

const MACHINES = [
  {
    model: "250GT2",
    name: "The Original Raised Panel Door Machine",
    category: "Raised Panel Machines",
    description:
      "The legendary 250GT2 has been the industry standard for raised panel door production since its introduction. Features a precision-ground table, heavy-duty cast iron construction, and variable-speed spindle for unmatched versatility across wood species and panel profiles.",
    images: [
      "https://picsum.photos/id/96/600/400",
      "https://picsum.photos/id/28/600/400",
      "https://picsum.photos/id/42/600/400",
    ],
    specs: {
      "Spindle Speed": "3,000–12,000 RPM",
      "Table Size": '48" × 36"',
      Motor: "7.5 HP, 3-Phase",
      Weight: "1,850 lbs",
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 1,
  },
  {
    model: "2681 CNC",
    name: "CNC Machining Center",
    category: "Door Machines",
    description:
      "A fully programmable CNC machining center built for high-volume door component production. The 2681 delivers repeatable precision on cope, stick, profile, and boring operations with an intuitive touchscreen interface and tool change system.",
    images: [
      "https://picsum.photos/id/20/600/400",
      "https://picsum.photos/id/37/600/400",
      "https://picsum.photos/id/48/600/400",
    ],
    specs: {
      Controller: "Siemens CNC",
      "Tool Capacity": "8 Positions",
      "Feed Rate": "0–60 FPM",
      "Table Travel": '120" × 48"',
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: true,
    order: 2,
  },
  {
    model: "2720 CNC",
    name: "18-Tool CNC Door Machine",
    category: "Door Machines",
    description:
      "The powerhouse of our CNC lineup. The 2720 features an 18-position automatic tool changer enabling continuous production runs of complete door sets without operator intervention. Ideal for high-output facilities.",
    images: [
      "https://picsum.photos/id/81/600/400",
      "https://picsum.photos/id/116/600/400",
      "https://picsum.photos/id/131/600/400",
    ],
    specs: {
      "Tool Changer": "18-Position ATC",
      Spindles: "Dual",
      Control: "Fanuc CNC",
      Throughput: "Up to 600 doors/shift",
      Origin: "Made in USA",
    },
    inStock: false,
    flashSale: false,
    order: 3,
  },
  {
    model: "2702 CNC",
    name: "CNC Door Machine",
    category: "Door Machines",
    description:
      "The 2702 is our mid-range CNC solution, delivering automated precision for shops needing consistent quality without the full 18-tool system. Perfect for medium-volume production with quick job changeover.",
    images: [
      "https://picsum.photos/id/150/600/400",
      "https://picsum.photos/id/165/600/400",
      "https://picsum.photos/id/180/600/400",
    ],
    specs: {
      "Tool Capacity": "10 Positions",
      Controller: "PC-Based CNC",
      "Table Length": '96"',
      Motor: "15 HP",
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 4,
  },
  {
    model: "310",
    name: "Cope Machine",
    category: "Cope/Tenon Machines",
    description:
      "The Model 310 Cope Machine delivers clean, consistent cope cuts on stile and rail door components. Heavy-duty construction with adjustable fence system allows fast setup for various door styles.",
    images: [
      "https://picsum.photos/id/200/600/400",
      "https://picsum.photos/id/216/600/400",
      "https://picsum.photos/id/230/600/400",
    ],
    specs: {
      Spindle: "Single, High-Speed",
      Motor: "5 HP",
      Feed: "Pneumatic Pusher",
      Adjustability: "Infinite rail width",
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 5,
  },
  {
    model: "313GT",
    name: "Miter Machine",
    category: "Miter Machines",
    description:
      "The 313GT Miter Machine is designed for accurate miter cuts on door frames and cabinet components. Features dual-blade capability, programmable stop system, and roller infeed/outfeed for smooth material handling.",
    images: [
      "https://picsum.photos/id/250/600/400",
      "https://picsum.photos/id/265/600/400",
      "https://picsum.photos/id/279/600/400",
    ],
    specs: {
      "Miter Range": "0–45°",
      "Blade Size": '14"',
      Motor: "7.5 HP",
      "Cut Capacity": '6" × 4"',
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: true,
    order: 6,
  },
  {
    model: "318",
    name: "Stile Machine",
    category: "Stile/Rail Machines",
    description:
      "Purpose-built for stile and rail profile machining. The Model 318 handles sticking operations with multiple profile options and a self-feeding system for high-volume throughput without operator fatigue.",
    images: [
      "https://picsum.photos/id/300/600/400",
      "https://picsum.photos/id/315/600/400",
      "https://picsum.photos/id/329/600/400",
    ],
    specs: {
      Profiles: "Multiple standard",
      Motor: "5 HP",
      "Feed Rate": "Variable",
      Construction: "Cast Iron Base",
      Origin: "Made in USA",
    },
    inStock: false,
    flashSale: false,
    order: 7,
  },
  {
    model: "410",
    name: "Shape & Sand Machine",
    category: "Shape & Sand Machines",
    description:
      "The Model 410 combines shaping and sanding in one pass for door panels and frame components. Reduces labor and floor space while delivering a consistent finish ready for painting or staining.",
    images: [
      "https://picsum.photos/id/350/600/400",
      "https://picsum.photos/id/365/600/400",
      "https://picsum.photos/id/379/600/400",
    ],
    specs: {
      "Sanding Drums": "3-Stage",
      "Shaper Spindle": '1.25"',
      Motor: "7.5 HP",
      Table: '24" × 36"',
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 8,
  },
  {
    model: "515",
    name: "Line Boring Machine",
    category: "Line Boring Machines",
    description:
      "The Model 515 Line Boring Machine delivers precise, repeatable bore patterns for cabinet construction and door hinge prep. Multi-spindle design handles standard 32mm system boring with ease.",
    images: [
      "https://picsum.photos/id/400/600/400",
      "https://picsum.photos/id/415/600/400",
      "https://picsum.photos/id/429/600/400",
    ],
    specs: {
      Spindles: "21-Spindle",
      Spacing: "32mm System",
      "Boring Depth": "Adjustable",
      Motor: "3 HP",
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 9,
  },
  {
    model: "265",
    name: "Cope Machine",
    category: "Cope/Tenon Machines",
    description:
      "The Model 265 is a reliable, production-proven cope machine ideal for high-volume stile and rail operations. Simplified setup and robust build make it a favorite for shops that demand consistency.",
    images: [
      "https://picsum.photos/id/450/600/400",
      "https://picsum.photos/id/464/600/400",
      "https://picsum.photos/id/479/600/400",
    ],
    specs: {
      Spindle: "Single",
      Motor: "3 HP",
      "Feed System": "Manual Push",
      Construction: "Steel Frame",
      Origin: "Made in USA",
    },
    inStock: true,
    flashSale: false,
    order: 10,
  },
];

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected!\n");

  const deleted = await Product.deleteMany({});
  console.log(`Cleared ${deleted.deletedCount} existing products.`);

  const inserted = await Product.insertMany(MACHINES);
  console.log(`\n✅ Inserted ${inserted.length} machines:\n`);
  inserted.forEach((p) => console.log(`  • [${p.model}] ${p.name}`));

  await mongoose.disconnect();
  console.log("\nDone! Refresh http://localhost:3000");
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
