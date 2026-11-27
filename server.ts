import express from "express";
import path from "path";
import fs from "fs";
import "dotenv/config";

if (process.env.IS_BUNDLED_SERVER === "true" && !process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "36A9F865-02E5-4196-8718-3B1CF25627B6";

export const app = express();

// Lightweight zero-dependency CORS middleware so cold boot doesn't stall on disk reads
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  const reqHeaders = req.headers["access-control-request-headers"];
  res.setHeader(
    "Access-Control-Allow-Headers",
    typeof reqHeaders === "string" && reqHeaders ? reqHeaders : "Content-Type, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(express.json());

let isViteFrontendReady =
  process.env.NODE_ENV === "production" || process.env.IS_BUNDLED_SERVER === "true";

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/vite-status", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ready: isViteFrontendReady });
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
  } catch {
    return res.json({ mode: "unknown", scripts: [], styles: [], buildHash: "" });
  }
});

// Cache uploads forever since they have unique names
app.use("/uploads", express.static(uploadDir, { maxAge: "1d" }));

// --- LAZY BACKEND INITIALIZATION (Supabase, Multer, JWT, Cache, Compression & API Routes) ---

const routesRouter = express.Router();
let cacheInstance: any = null;
let compressionMiddleware: express.RequestHandler | null = null;
let routesReadyPromise: Promise<void> | null = null;

const ensureRoutesReady = () => {
  if (!routesReadyPromise) {
    routesReadyPromise = (async () => {
      const [
        { createClient },
        multerMod,
        jwtMod,
        NodeCacheMod,
        compressionMod,
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
        import("@supabase/supabase-js"),
        import("multer"),
        import("jsonwebtoken"),
        import("node-cache"),
        import("compression"),
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

      const multer = (multerMod as any).default || multerMod;
      const jwt = (jwtMod as any).default || jwtMod;
      const NodeCache = (NodeCacheMod as any).default || NodeCacheMod;
      const compression = (compressionMod as any).default || compressionMod;

      compressionMiddleware = compression() as any;
      const cache = new NodeCache({ stdTTL: 60 });
      cacheInstance = cache;

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is not set in environment variables.");
      }

      const supabase = createClient(
        supabaseUrl || "https://placeholder.supabase.co",
        supabaseServiceKey || supabaseAnonKey || "placeholder"
      );

      const storage = multer.memoryStorage();
      const upload = multer({ storage });

      async function uploadToSupabase(
        file: Express.Multer.File | undefined,
        folder: string
      ): Promise<string | null> {
        if (!file) return null;

        try {
          await supabase.storage
            .createBucket("uploads", { public: true })
            .catch(() => {});
        } catch {}

        const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        const { error } = await supabase.storage
          .from("uploads")
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (error) {
          console.error("Supabase upload error:", error);
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
        } catch (e) {
          console.error("Failed to delete from Supabase", e);
        }
      }

      const authenticateToken = (req: any, res: any, next: any) => {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];
        if (!token) return res.sendStatus(401);

        jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
          if (err) {
            console.error("JWT Auth Error:", err.message);
            return res.status(401).json({ error: "Sessão expirada ou inválida." });
          }

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
              cache.set(cacheKey, authInfo, 60);
            } catch (dbErr) {
              console.error("Erro na checagem de status de utilizador:", dbErr);
              authInfo = { valid: true };
            }
          }

          if (!authInfo.valid) {
            return res
              .status(401)
              .json({ error: "Acesso negado. Utilizador inativo ou removido pelo sistema." });
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

// Apply compression once loaded without blocking cold boot
app.use((req, res, next) => {
  if (compressionMiddleware) {
    return compressionMiddleware(req, res, next);
  }
  next();
});

// Invalidate cache on mutations, prevent browser API caching, and ensure routes are mounted
app.use("/api", async (req: any, res: any, next: any) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    await ensureRoutesReady();
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method) && cacheInstance) {
      cacheInstance.flushAll();
    }
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
              ws: false,
            },
            appType: "spa",
          });
          activeFrontendHandler = vite.middlewares as any;
          isViteFrontendReady = true;
        } catch {
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
            })
          );
          fallbackRouter.get("*", (_req, res) => {
            setNoCacheHtmlHeaders(res);
            res.sendFile(path.join(distPath, "index.html"), {
              etag: false,
              lastModified: false,
            });
          });
          activeFrontendHandler = fallbackRouter;
          isViteFrontendReady = true;
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

      ensureViteReady().catch((err) => console.error("Erro ao iniciar Vite:", err));

      // Respond immediately to control-plane / container readiness probes while Vite warms up
      const ua = String(req.headers["user-agent"] || "");
      const accept = String(req.headers["accept"] || "");
      const isReadinessProbe =
        req.method === "HEAD" ||
        ua.includes("Go-http-client") ||
        ua.includes("curl/") ||
        ua.includes("GoogleHC") ||
        ua.includes("kube-probe") ||
        (!accept.includes("text/html") && (req.path === "/" || req.path === ""));

      if (isReadinessProbe) {
        setNoCacheHtmlHeaders(res);
        return res.status(200).type("text/html").send("<!doctype html><html><head></head><body>OK</body></html>");
      }

      // Serve an instant 200 OK shell for browser HTML navigations so Nginx exits warmup.html immediately
      const isHtmlNav =
        req.method === "GET" &&
        accept.includes("text/html") &&
        !req.path.startsWith("/src/") &&
        !req.path.startsWith("/@") &&
        !req.path.startsWith("/node_modules/");

      if (isHtmlNav) {
        setNoCacheHtmlHeaders(res);
        return res.status(200).type("text/html").send(`<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LOST WIND LDA</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #09090b; color: #f4f4f5; font-family: system-ui, -apple-system, sans-serif; }
    .box { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .spin { width: 28px; height: 28px; border: 3px solid #27272a; border-top-color: #f59e0b; border-radius: 50%; animation: s 0.8s linear infinite; }
    .lbl { font-size: 13px; color: #a1a1aa; letter-spacing: 0.04em; }
    @keyframes s { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spin"></div>
    <div class="lbl">A iniciar sistema...</div>
  </div>
  <script>
    setTimeout(function poll() {
      fetch("/api/vite-status", { cache: "no-store" })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.ready) { window.location.reload(); }
          else { setTimeout(poll, 400); }
        })
        .catch(function() { setTimeout(poll, 500); });
    }, 800);
  </script>
</body>
</html>`);
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
      })
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
    console.log(`📦 Ambiente: ${process.env.NODE_ENV || "development"}`);
    setImmediate(() => {
      if (!isProd) {
        ensureViteReady().catch((err) => console.error("Erro ao iniciar Vite:", err));
      }
      ensureRoutesReady().catch((err) => console.error("Erro ao carregar rotas:", err));
    });
  };

  const server =
    typeof PORT === "number"
      ? app.listen(PORT, "0.0.0.0", onListening)
      : app.listen(PORT, onListening);

  return server;
}

startServer().catch((err) => {
  console.error("❌ Ocorreu um erro FATAL ao iniciar o servidor:");
  console.error(err);
  process.exit(1);
});

export default app;
