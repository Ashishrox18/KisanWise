/**
 * Vercel serverless entry point.
 * Exports the Express app handler with error safety and URL normalization.
 */
let cachedApp: any = null;

function getApp() {
  if (!cachedApp) {
    try {
      const appModule = require('../src/app');
      cachedApp = appModule.default || appModule;
    } catch (err: any) {
      console.error('Fatal: Failed to load Express app in Vercel handler:', err);
      throw err;
    }
  }
  return cachedApp;
}

export default function handler(req: any, res: any) {
  try {
    // When Vercel rewrites to /api, restore the original incoming path
    const originalUrl =
      req.headers['x-forwarded-uri'] ||
      req.headers['x-matched-path'] ||
      req.headers['x-vercel-matched-path'];

    if (originalUrl && (req.url === '/api' || req.url === '/api/')) {
      req.url = originalUrl;
    }

    const app = getApp();
    return app(req, res);
  } catch (error: any) {
    console.error('Unhandled Vercel serverless invocation error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Vercel Serverless Invocation Error',
      message: error?.message || String(error),
      stack: error?.stack,
    }));
  }
}

module.exports = handler;
module.exports.default = handler;
