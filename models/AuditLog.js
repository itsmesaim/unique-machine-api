import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  actor: { type: String, required: true }, // username
  actorRole: { type: String, required: true }, // role
  action: { type: String, required: true }, // e.g. "product.create"
  target: { type: String, default: null }, // e.g. "Product: 250GT2"
  diff: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  ip: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete logs older than 90 days
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
);

export default mongoose.model("AuditLog", auditLogSchema);
