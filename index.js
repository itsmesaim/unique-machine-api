import express from "express";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

import { typeDefs } from "./schema/typeDefs.js";
import { resolvers } from "./schema/resolvers.js";
import { loginRouter } from "./routes/auth.js";
import { loginRateLimiter } from "./middleware/rateLimiter.js";
import { getAuthContext } from "./middleware/auth.js";
import Admin from "./models/Admin.js";

dotenv.config();

// ── Validate required env variables on startup ────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required env variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  formatError: (formattedError) => {
    if (process.env.NODE_ENV === "production") {
      return { message: formattedError.message };
    }
    return formattedError;
  },
});

await server.start();

app.use(cookieParser());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

app.use("/auth", loginRateLimiter, loginRouter);

app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req, res }) => {
      const authContext = await getAuthContext(req);
      return { ...authContext, res };
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 4000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    // ── Seed initial accounts if DB is empty ──────────────────────────────
    const count = await Admin.countDocuments();
    if (count === 0) {
      // Refuse to seed if passwords are not set in .env
      if (
        !process.env.MANAGER_PASSWORD ||
        !process.env.ADMIN_DEFAULT_PASSWORD
      ) {
        console.error(
          "❌ MANAGER_PASSWORD and ADMIN_DEFAULT_PASSWORD must be set in .env before first run",
        );
        console.error("   Add them to server/.env and restart.");
        process.exit(1);
      }

      const managerHash = await bcrypt.hash(process.env.MANAGER_PASSWORD, 12);
      const adminHash = await bcrypt.hash(
        process.env.ADMIN_DEFAULT_PASSWORD,
        12,
      );

      await Admin.create({
        username: "manager",
        passwordHash: managerHash,
        role: "manager",
      });

      await Admin.create({
        username: "admin",
        passwordHash: adminHash,
        role: "admin",
        createdBy: "manager",
      });

      console.log("✅ Seeded: manager  (role: manager)");
      console.log("✅ Seeded: admin    (role: admin)");
      console.log("   Both accounts need MFA setup on first login.");
      console.log(
        "   Passwords are hashed — originals only exist in your .env",
      );
    }
    // ──────────────────────────────────────────────────────────────────────

    httpServer.listen(PORT, () => {
      console.log(`GraphQL    -> http://localhost:${PORT}/graphql`);
      console.log(`Auth       -> http://localhost:${PORT}/auth/login`);
      console.log(`Health     -> http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("MongoDB error:", err.message);
    process.exit(1);
  });

process.on("SIGTERM", async () => {
  await server.stop();
  await mongoose.disconnect();
  process.exit(0);
});
