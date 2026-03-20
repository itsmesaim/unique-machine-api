import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

export async function getAuthContext(req) {
  try {
    const token = req.cookies?.authToken;
    if (!token)
      return { isAdmin: false, role: null, username: null, permissions: [] };

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh from DB so deactivated accounts are caught immediately
    const admin = await Admin.findOne({
      username: decoded.username,
      isActive: true,
    });
    if (!admin)
      return { isAdmin: false, role: null, username: null, permissions: [] };

    return {
      isAdmin: true,
      username: admin.username,
      role: admin.role,
      permissions: admin.permissions || [],
      isManager: admin.role === "manager",
      isAdminRole: admin.role === "admin",
      isStaff: admin.role === "staff",
    };
  } catch {
    return { isAdmin: false, role: null, username: null, permissions: [] };
  }
}

// Helper used in resolvers
export function hasPermission(context, permission) {
  if (!context.isAdmin) return false;
  if (context.role === "manager" || context.role === "admin") return true;
  return context.permissions.includes(permission);
}
