/**
 * Vercel serverless entry point.
 * Just exports the Express app — Vercel manages the HTTP server.
 * On Vercel, env vars are injected at runtime (no .env file needed).
 * For local dev, server.ts handles dotenv loading instead.
 */
import app from '../src/app';

export default app;
