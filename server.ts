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

if (process.env.IS_BUNDLED_SERVER === "true" && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

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

export const app = express();

// Enable Gzip/Brotli compression for all HTTP responses
app.use(compression() as any);

app.use(cors());
app.use(express.json());
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

let cachedBuildVersion: {
  mtimeMs: number;
  scripts: string[];
  styles: string[];
  buildHash: string;
} | null = null;

app.get("/api/version", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");

  try {
    const indexHtmlPath = path.join(process.cwd(), "dist", "index.html");
    if (!fs.existsSync(indexHtmlPath)) {
      return res.json({ mode: "development", scripts: [], styles: [], buildHash: "dev" });
    }

    const stat = fs.statSync(indexHtmlPath);
    if (!cachedBuildVersion || cachedBuildVersion.mtimeMs !== stat.mtimeMs) {
      const htmlText = fs.readFileSync(indexHtmlPath, "utf8");
      const scriptMatches = htmlText.match(/src="(\/assets\/[^"]+)"/g) || [];
      const styleMatches = htmlText.match(/href="(\/assets\/[^"]+\.css)"/g) || [];
      const scripts = scriptMatches.map((m) => m.replace(/src="|"/g, ""));
      const styles = styleMatches.map((m) => m.replace(/href="|"/g, ""));
      cachedBuildVersion = {
        mtimeMs: stat.mtimeMs,
        scripts,
        styles,
        buildHash: [...scripts, ...styles].join("|") || String(stat.mtimeMs),
      };
    }

    return res.json({
      mode: "production",
      scripts: cachedBuildVersion.scripts,
      styles: cachedBuildVersion.styles,
      buildHash: cachedBuildVersion.buildHash,
      mtimeMs: cachedBuildVersion.mtimeMs,
    });
  } catch (err) {
    return res.json({ mode: "unknown", scripts: [], styles: [], buildHash: "" });
  }
});
  // Cache uploads forever since they have unique names usually
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), { maxAge: "1d" }));

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

      // Validação de segurança + hidratação de email/name/role (suporta tokens antigos de 30 dias sem email)
      const cacheKey = `user_auth_v2_${user.id}`;
      let authInfo: { valid: boolean; email?: string; name?: string; role?: string } | undefined =
        cache.get(cacheKey);

      if (authInfo === undefined) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("id, email, name, role")
            .eq("id", user.id)
            .single();

          if (error || !data) {
            authInfo = { valid: false };
          } else {
            authInfo = {
              valid: true,
              email: data.email,
              name: data.name,
              role: data.role,
            };
          }
          // Usando NodeCache para não sobrecarregar as DB calls (60 segundos por default)
          cache.set(cacheKey, authInfo, 60);
        } catch (dbErr) {
          console.error("Erro na checagem de status de utilizador:", dbErr);
          // Fallback para true caso o BD apresente instabilidade rápida, para não derrubar ativos
          authInfo = { valid: true };
        }
      }

      if (!authInfo.valid) {
        return res.status(401).json({ error: "Acesso negado. Utilizador inativo ou removido pelo sistema." });
      }

      req.user = {
        ...user,
        email: authInfo.email ?? user.email,
        name: authInfo.name ?? user.name,
        role: authInfo.role ?? user.role,
      };
      next();
    });
  };

  // --- API ROUTES ---

  const routesRouter = express.Router();

  let routesReadyPromise: Promise<void> | null = null;
  const ensureRoutesReady = () => {
    if (!routesReadyPromise) {
      routesReadyPromise = (async () => {
        const [
          { setupAuthRoutes },
          { setupStatsRoutes },
          { setupUsersRoutes },
          { setupStockRoutes },
          { setupFinanceRoutes },
          { setupProductsRoutes },
          { setupOrdersRoutes },
          { setupWmsRoutes },
          { setupConfigRoutes },
          { setupFleetRoutes },
        ] = await Promise.all([
          import("./src/routes/auth"),
          import("./src/routes/stats"),
          import("./src/routes/users"),
          import("./src/routes/stock"),
          import("./src/routes/finance"),
          import("./src/routes/products"),
          import("./src/routes/orders"),
          import("./src/routes/wms"),
          import("./src/routes/config"),
          import("./src/routes/fleet"),
        ]);

        const routeDependencies = {
          app: routesRouter,
          supabase,
          authenticateToken,
          upload,
          uploadToSupabase,
          deleteFromSupabase,
          JWT_SECRET,
          cache,
        };

        setupAuthRoutes(routeDependencies);
        setupStatsRoutes(routeDependencies);
        setupUsersRoutes(routeDependencies);
        setupStockRoutes(routeDependencies);
        setupFinanceRoutes(routeDependencies);
        setupProductsRoutes(routeDependencies);
        setupOrdersRoutes(routeDependencies);
        setupWmsRoutes(routeDependencies);
        setupConfigRoutes(routeDependencies);
        setupFleetRoutes(routeDependencies);
      })();
    }
    return routesReadyPromise;
  };

  // Invalidate cache on mutations, prevent browser API caching, and ensure routes are mounted
  app.use('/api', async (req: any, res: any, next: any) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      cache.flushAll();
    }

    try {
      await ensureRoutesReady();
      next();
    } catch (err) {
      next(err);
    }
  });

  app.use(routesRouter);

  // --- VITE / STATIC MIDDLEWARE & SERVER STARTUP ---
export async function startServer() {
  const distPath = path.join(process.cwd(), "dist");
  const isProd =
    process.env.NODE_ENV === "production" || process.env.IS_BUNDLED_SERVER === "true";

  const setNoCacheHtmlHeaders = (res: express.Response) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.setHeader("CDN-Cache-Control", "no-store");
  };

  let activeFrontendHandler: express.RequestHandler | null = null;
  let initVitePromise: Promise<void> | null = null;

  const ensureViteReady = () => {
    if (isProd) return Promise.resolve();
    if (!initVitePromise) {
      initVitePromise = (async () => {
        try {
          const { createServer: createViteServer } = await import("vite");
          const vite = await createViteServer({
            server: {
              middlewareMode: true,
              hmr: false,
            },
            appType: "spa",
          });
          activeFrontendHandler = vite.middlewares as any;
        } catch (e) {
          console.warn("Vite not found, falling back to static dist...");
          const fallbackRouter = express.Router();
          fallbackRouter.use(
            express.static(distPath, {
              etag: false,
              lastModified: false,
              setHeaders: (res, filePath) => {
                if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes("/assets/")) {
                  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                } else {
                  setNoCacheHtmlHeaders(res);
                }
              },
            }),
          );
          fallbackRouter.get("*", (_req, res) => {
            setNoCacheHtmlHeaders(res);
            res.sendFile(path.join(distPath, "index.html"), {
              etag: false,
              lastModified: false,
            });
          });
          activeFrontendHandler = fallbackRouter;
        }
      })();
    }
    return initVitePromise;
  };

  if (!isProd) {
    app.use((req, res, next) => {
      if (activeFrontendHandler) {
        return activeFrontendHandler(req, res, next);
      }
      ensureViteReady()
        .then(() => {
          if (activeFrontendHandler) {
            activeFrontendHandler(req, res, next);
          } else {
            next();
          }
        })
        .catch(next);
    });
  } else {
    console.log("[Production] Configurando express.static para servir a pasta dist com compressão...");

    app.use(
      express.static(distPath, {
        etag: false,
        lastModified: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes("/assets/")) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else {
            setNoCacheHtmlHeaders(res);
          }
        },
      }),
    );

    app.get("*", (_req, res) => {
      setNoCacheHtmlHeaders(res);
      res.sendFile(path.join(distPath, "index.html"), {
        etag: false,
        lastModified: false,
      });
    });
  }

  const onListening = () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    setImmediate(() => {
      ensureRoutesReady().catch((err) => console.error("Erro ao carregar rotas:", err));
      if (!isProd) {
        ensureViteReady().catch((err) => console.error("Erro ao iniciar Vite:", err));
      }
    });
  };

  const server = typeof PORT === "number"
    ? app.listen(PORT, "0.0.0.0", onListening)
    : app.listen(PORT, onListening);

  return server;
}

// Inicia automaticamente o servidor se executado diretamente
startServer().catch((err) => {
  console.error("❌ Ocorreu um erro FATAL ao iniciar o servidor:");
  console.error(err);
  process.exit(1);
});

export default app;
