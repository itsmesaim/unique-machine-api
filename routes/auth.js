import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import Admin, { PERMISSIONS } from "../models/Admin.js";
import AuditLog from "../models/AuditLog.js";
import { getAuthContext } from "../middleware/auth.js";

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const ctx = await getAuthContext(req);
  if (!ctx.isAdmin) return res.status(401).json({ error: "Unauthorized" });
  req.ctx = ctx;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.ctx?.role))
      return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}

async function log(req, action, target, diff = {}) {
  try {
    await AuditLog.create({
      actor: req.ctx?.username || "system",
      actorRole: req.ctx?.role || "system",
      action,
      target,
      diff,
      ip: req.ip,
    });
  } catch (e) {
    console.error("Audit log error:", e.message);
  }
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password, mfaCode } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const admin = await Admin.findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash)))
      return res.status(401).json({ error: "Invalid credentials" });

    if (!admin.isActive)
      return res
        .status(403)
        .json({ error: "Account deactivated. Contact your manager." });

    if (!admin.mfaEnabled)
      return res.json({ requiresMfaSetup: true, username });

    if (!mfaCode) return res.status(400).json({ error: "MFA code required" });

    const mfaValid = speakeasy.totp.verify({
      secret: admin.mfaSecret,
      encoding: "base32",
      token: mfaCode,
      window: 2,
    });

    if (!mfaValid) return res.status(401).json({ error: "Invalid MFA code" });

    const token = jwt.sign(
      { username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.cookie("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ success: true, username: admin.username, role: admin.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /auth/setup-mfa ──────────────────────────────────────────────────────
router.get("/setup-mfa", async (req, res) => {
  try {
    const { username, password } = req.query;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash)))
      return res.status(401).json({ error: "Invalid credentials" });

    const secret = speakeasy.generateSecret({
      name: `Unique Machine (${username})`,
      issuer: "Unique Machine & Tool Co.",
    });

    admin.mfaSecret = secret.base32;
    await admin.save();

    res.json({
      secret: secret.base32,
      qrCode: await QRCode.toDataURL(secret.otpauth_url),
    });
  } catch (err) {
    console.error("MFA setup error:", err);
    res.status(500).json({ error: "MFA setup failed" });
  }
});

// ─── POST /auth/confirm-mfa ───────────────────────────────────────────────────
router.post("/confirm-mfa", async (req, res) => {
  try {
    const { username, mfaCode } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin?.mfaSecret)
      return res
        .status(400)
        .json({ error: "No MFA secret found. Restart setup." });

    const valid = speakeasy.totp.verify({
      secret: admin.mfaSecret,
      encoding: "base32",
      token: mfaCode,
      window: 2,
    });

    if (!valid)
      return res.status(400).json({ error: "Invalid code — try again" });

    admin.mfaEnabled = true;
    await admin.save();

    res.json({ success: true });
  } catch (err) {
    console.error("MFA confirm error:", err);
    res.status(500).json({ error: "MFA confirmation failed" });
  }
});

// ─── GET /auth/verify ─────────────────────────────────────────────────────────
router.get("/verify", async (req, res) => {
  try {
    const token = req.cookies?.authToken;
    if (!token) return res.json({ isAuthenticated: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findOne({
      username: decoded.username,
      isActive: true,
    });
    if (!admin) return res.json({ isAuthenticated: false });

    res.json({
      isAuthenticated: true,
      username: admin.username,
      role: admin.role,
    });
  } catch {
    res.json({ isAuthenticated: false });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  res.clearCookie("authToken");
  res.json({ success: true });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get("/me", requireAuth, (req, res) => {
  res.json({
    username: req.ctx.username,
    role: req.ctx.role,
    permissions: req.ctx.permissions,
  });
});

// ════════════════════════════════════════════════════════════════════════════
// ADMIN MANAGEMENT — Manager only
// ════════════════════════════════════════════════════════════════════════════

// GET /auth/admins
router.get("/admins", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const admins = await Admin.find(
      { role: "admin" },
      "username mfaEnabled isActive createdAt createdBy",
    );
    res.json(admins);
  } catch {
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// POST /auth/admins
router.post(
  "/admins",
  requireAuth,
  requireRole("manager"),
  async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password || password.length < 8)
        return res
          .status(400)
          .json({ error: "Username and password (min 8 chars) required" });

      if (await Admin.findOne({ username }))
        return res.status(400).json({ error: "Username already taken" });

      const admin = await Admin.create({
        username,
        role: "admin",
        passwordHash: await bcrypt.hash(password, 12),
        createdBy: req.ctx.username,
      });

      await log(req, "admin.create", `Admin: ${username}`);
      res.json({
        success: true,
        admin: { username: admin.username, role: "admin", mfaEnabled: false },
      });
    } catch (err) {
      console.error("Create admin error:", err);
      res.status(500).json({ error: "Failed to create admin" });
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT — Manager + Admin
// ════════════════════════════════════════════════════════════════════════════

// GET /auth/staff — all admins and manager see ALL staff (no createdBy filter)
router.get(
  "/staff",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const staff = await Admin.find(
        { role: "staff" },
        "username mfaEnabled isActive permissions createdAt createdBy",
      );
      res.json(staff);
    } catch {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  },
);

// POST /auth/staff
router.post(
  "/staff",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const { username, password, permissions = [] } = req.body;

      if (!username || !password || password.length < 8)
        return res
          .status(400)
          .json({ error: "Username and password (min 8 chars) required" });

      if (await Admin.findOne({ username }))
        return res.status(400).json({ error: "Username already taken" });

      const validPerms = permissions.filter((p) => PERMISSIONS.includes(p));

      const staff = await Admin.create({
        username,
        role: "staff",
        passwordHash: await bcrypt.hash(password, 12),
        permissions: validPerms,
        createdBy: req.ctx.username,
      });

      await log(req, "staff.create", `Staff: ${username}`, {
        after: { permissions: validPerms },
      });
      res.json({
        success: true,
        staff: { username: staff.username, permissions: validPerms },
      });
    } catch (err) {
      console.error("Create staff error:", err);
      res.status(500).json({ error: "Failed to create staff" });
    }
  },
);

// PATCH /auth/staff/:username/permissions — any admin/manager can edit any staff
router.patch(
  "/staff/:username/permissions",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const staff = await Admin.findOne({
        username: req.params.username,
        role: "staff",
      });
      if (!staff) return res.status(404).json({ error: "Staff not found" });

      const before = [...staff.permissions];
      staff.permissions = (req.body.permissions || []).filter((p) =>
        PERMISSIONS.includes(p),
      );
      await staff.save();

      await log(req, "staff.permissions.update", `Staff: ${staff.username}`, {
        before: { permissions: before },
        after: { permissions: staff.permissions },
      });
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  },
);

// PATCH /auth/users/:username/active — admin can manage any staff, manager can manage everyone
router.patch(
  "/users/:username/active",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      const user = await Admin.findOne({ username: req.params.username });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Admin can only activate/deactivate staff, not other admins
      if (req.ctx.role === "admin" && user.role !== "staff")
        return res
          .status(403)
          .json({ error: "Admins can only manage staff accounts" });

      user.isActive = req.body.isActive;
      await user.save();

      await log(
        req,
        user.isActive ? "user.activate" : "user.deactivate",
        `${user.role}: ${user.username}`,
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

// PATCH /auth/admins/:username/password
router.patch("/admins/:username/password", requireAuth, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8)
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });

    if (req.ctx.role === "staff")
      return res.status(403).json({ error: "Permission denied" });

    const target = await Admin.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ error: "User not found" });

    // Admin can only change staff passwords, not other admin passwords
    if (req.ctx.role === "admin" && target.role !== "staff")
      return res
        .status(403)
        .json({ error: "Admins can only change staff passwords" });

    target.passwordHash = await bcrypt.hash(newPassword, 12);
    await target.save();

    await log(
      req,
      "user.password.change",
      `${target.role}: ${target.username}`,
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// DELETE /auth/users/:username — admin can delete staff only, manager can delete anyone
router.delete(
  "/users/:username",
  requireAuth,
  requireRole("manager", "admin"),
  async (req, res) => {
    try {
      if (req.params.username === req.ctx.username)
        return res
          .status(400)
          .json({ error: "You can't delete your own account" });

      const user = await Admin.findOne({ username: req.params.username });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Admin can only delete staff, not other admins or manager
      if (req.ctx.role === "admin" && user.role !== "staff")
        return res
          .status(403)
          .json({ error: "Admins can only delete staff accounts" });

      await Admin.deleteOne({ username: req.params.username });
      await log(req, "user.delete", `${user.role}: ${user.username}`);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
);

// ════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS — Manager only
// ════════════════════════════════════════════════════════════════════════════

router.get(
  "/audit-logs",
  requireAuth,
  requireRole("manager"),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, action, actor } = req.query;
      const filter = {};
      if (action) filter.action = { $regex: action, $options: "i" };
      if (actor) filter.actor = { $regex: actor, $options: "i" };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * Number(limit))
          .limit(Number(limit)),
        AuditLog.countDocuments(filter),
      ]);

      res.json({ logs, total, pages: Math.ceil(total / Number(limit)) });
    } catch {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  },
);

export const loginRouter = router;
