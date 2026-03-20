import mongoose from "mongoose";

const PERMISSIONS = [
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "inventory.update",
  "inquiries.view",
  "inquiries.update",
  "flash_sale.toggle",
  "pricing.update",
];

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: { type: String, required: true },
  mfaSecret: { type: String, default: null },
  mfaEnabled: { type: Boolean, default: false },
  role: { type: String, enum: ["manager", "admin", "staff"], default: "staff" },
  createdBy: { type: String, default: null }, // username of who created them
  isActive: { type: Boolean, default: true },
  permissions: {
    type: [{ type: String, enum: PERMISSIONS }],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

export { PERMISSIONS };
export default mongoose.model("Admin", adminSchema);
