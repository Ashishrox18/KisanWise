import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import farmerRoutes from './routes/farmer.routes';
import buyerRoutes from './routes/buyer.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';
import quotesRoutes from './routes/quotes.routes';
import offersRoutes from './routes/offers.routes';
import notificationsRoutes from './routes/notifications.routes';
import invoicesRoutes from './routes/invoices.routes';
import negotiationRoutes from './routes/negotiation.routes';

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some image/media requests
}));

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 20,                          // 20 auth attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 200,                         // 200 general API calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,             // 1 minute
  max: 30,                          // 30 AI calls per minute (Gemini has its own quota)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI request rate limit reached. Please wait a moment.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed: (string | RegExp)[] = [
      'http://localhost:5173',
      'http://localhost:3000',
      /\.vercel\.app$/,
      'https://krishiai.in',
      'https://www.krishiai.in',
    ];
    const isAllowed = allowed.some(p =>
      typeof p === 'string' ? p === origin : p.test(origin)
    );
    const envUrl = process.env.FRONTEND_URL;
    callback(null, isAllowed || (!!envUrl && origin === envUrl) || true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Health check — Vercel hits this to confirm the function is alive
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/farmer', apiLimiter, farmerRoutes);
app.use('/api/buyer', apiLimiter, buyerRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/quotes', apiLimiter, quotesRoutes);
app.use('/api/offers', apiLimiter, offersRoutes);
app.use('/api/notifications', apiLimiter, notificationsRoutes);
app.use('/api/invoices', apiLimiter, invoicesRoutes);
app.use('/api/negotiation', apiLimiter, negotiationRoutes);

app.use(errorHandler);

export default app;
