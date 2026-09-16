import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { ensureDbSchema } from './db.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';
import { extractClientIp } from './utils/ip.js';

const app = express();

// Trust reverse proxies (Vercel Edge, Cloudflare, AWS CloudFront)
app.set('trust proxy', true);

// Extract and normalize real client IP address for all requests
app.use((req, _res, next) => {
  const realIp = extractClientIp(req);
  Object.defineProperty(req, 'ip', {
    value: realIp,
    configurable: true,
  });
  next();
});

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration - Allow all web dashboard & client origins
app.use(
  cors({
    origin: true, // Accepts request origin dynamically for admin dashboard & SDK clients
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Explicit OPTIONS preflight handler
app.options('*', cors());

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
app.use('/api/', apiRateLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'Null-Auth API', version: '1.0.0' });
});

// Middleware to ensure DB schema is migrated
app.use(async (_req, _res, next) => {
  await ensureDbSchema();
  next();
});

// API Routes
app.use('/api/v1', routes);

// Global Error Handler
app.use(errorHandler);

export default app;
