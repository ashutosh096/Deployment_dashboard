import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app = express();

/**
 * CORS: restrict to explicitly configured allowed origins.
 * ALLOWED_ORIGINS is a comma-separated list, e.g.
 *   ALLOWED_ORIGINS=https://myapp.vercel.app,https://myapp.com
 * If unset, defaults to localhost only (development convenience).
 */
const rawOrigins = process.env.ALLOWED_ORIGINS;
const allowedOrigins: (string | RegExp)[] = rawOrigins
  ? rawOrigins.split(",").map(o => o.trim())
  : [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, false);
      return;
    }
    const allowed = allowedOrigins.some(o =>
      typeof o === "string" ? o === origin : o.test(origin)
    );
    callback(null, allowed);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
