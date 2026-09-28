import express from "express";
// Remove direct import of create ViteServer
// import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import fs from "fs";
import "dotenv/config";
import NodeCache from "node-cache";
import compression from "compression";

import { setupAuthRoutes } from "./src/routes/auth";
import { setupStatsRoutes } from "./src/routes/stats";
import { setupUsersRoutes } from "./src/routes/users";
import { setupStockRoutes } from "./src/routes/stock";
import { setupFinanceRoutes } from "./src/routes/finance";
import { setupProductsRoutes } from "./src/routes/products";
import { setupOrdersRoutes } from "./src/routes/orders";
import { setupWmsRoutes } from "./src/routes/wms";
import { setupConfigRoutes } from "./src/routes/config";

const cache = new NodeCache({ stdTTL: 60 }); // 60 seconds default cache

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "36A9F865-02E5-4196-8718-3B1CF25627B6";

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is not set in environment variables.");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || supabaseAnonKey || "placeholder",
);

async function startServer() {
  const app = express();
  
  // Enable Gzip/Brotli compression for all HTTP responses
  app.use(compression());
  
  app.use(cors());
  app.use(express.json());
  app.get("/api/health", (req, res) => { res.json({ status: "ok" }); });
  // Cache uploads forever since they have unique names usually
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), { maxAge: "1d" }));

  // Dynamic icon route
  app.get("/app-icon.png", (req, res) => {
    const sUrl = process.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
    // Redirect to the centralized icon inside Supabase
    res.redirect(`${sUrl}/storage/v1/object/public/uploads/icon.png`);
  });

  // Multer for image uploads (Memory Storage for Supabase)
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  // Helper to upload to Supabase Storage
  async function uploadToSupabase(
    file: Express.Multer.File | undefined,
    folder: string,
  ): Promise<string | null> {
    if (!file) return null;

    // Ensure bucket exists (best effort)
    try {
      await supabase.storage
        .createBucket("uploads", { public: true })
        .catch(() => {});
    } catch (e) {}

    const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      // Fallback to local if Supabase fails (though it will be ephemeral)
      const localDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      const localPath = path.join(localDir, fileName.replace("/", "_"));
      fs.writeFileSync(localPath, file.buffer);
      return `/uploads/${fileName.replace("/", "_")}`;
    }

    const { data: publicUrlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  }

  // Helper to delete from Supabase Storage
  async function deleteFromSupabase(url: string | null): Promise<void> {
    if (!url) return;
    try {
      const match = url.match(/\/uploads\/(.*)$/);
      if (match && match[1]) {
        const filePath = match[1];
        const { error } = await supabase.storage.from("uploads").remove([filePath]);
        if (error) {
           console.error("Supabase delete error:", error);
        }
      }
    } catch(e) {
      console.error("Failed to delete from Supabase", e);
    }
  }

  // Middleware to authenticate JWT
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
      if (err) {
        console.error("JWT Auth Error:", err.message);
        return res.status(401).json({ error: "Sessão expirada ou inválida." });
      }

      // Validação de segurança: barrar operadores demitidos/inativos
      const cacheKey = `user_valid_${user.id}`;
      let isValid = cache.get(cacheKey);

      if (isValid === undefined) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("id")
            .eq("id", user.id)
            .single();

          if (error || !data) {
            isValid = false;
          } else {
            isValid = true;
          }
          // Usando NodeCache para não sobrecarregar as DB calls (60 segundos por default)
          cache.set(cacheKey, isValid, 60);
        } catch (dbErr) {
          console.error("Erro na checagem de status de utilizador:", dbErr);
          // Fallback para true caso o BD apresente instabilidade rápida, para não derrubar ativos
          isValid = true; 
        }
      }

      if (!isValid) {
        return res.status(401).json({ error: "Acesso negado. Utilizador inativo ou removido pelo sistema." });
      }

      req.user = user;
      next();
    });
  };

  // --- API ROUTES ---

  // Invalidate cache on mutations and prevent browser API caching
  app.use('/api', (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      cache.flushAll();
    }
    next();
  });

  // Setup extracted routes
  const routeDependencies = { app, supabase, authenticateToken, upload, uploadToSupabase, deleteFromSupabase, JWT_SECRET, cache };
  
  setupAuthRoutes(routeDependencies);
  setupStatsRoutes(routeDependencies);
  setupUsersRoutes(routeDependencies);
  setupStockRoutes(routeDependencies);
  setupFinanceRoutes(routeDependencies);
  setupProductsRoutes(routeDependencies);
  setupOrdersRoutes(routeDependencies);
  setupWmsRoutes(routeDependencies);
  setupConfigRoutes(routeDependencies);

  // --- VITE MIDDLEWARE ---
  const distPath = path.join(process.cwd(), "dist");
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, falling back to static dist...");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    console.log("[Production] Configurando express.static para servir a pasta dist com compressão...");
    
    // Set caching headers: static assets inside assets/ are immutable (Vite hashes them)
    // index.html must NEVER be cached to ensure users always get the latest version
    app.use(express.static(distPath, {
      etag: false,
      lastModified: false,
      setHeaders: (res, path) => {
        if (path.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    
    app.get("*", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Ocorreu um erro FATAL ao iniciar o servidor:");
  console.error(err);
  process.exit(1);
});
