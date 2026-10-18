/**
 * Vercel serverless entry point.
 * Exports the Express app as both standard function handler and Express instance.
 */
import app from '../src/app';

export default function handler(req: any, res: any) {
  const original = req.headers['x-matched-path'];
  if (original && req.url === '/api') {
    req.url = original;
  }
  return app(req, res);
}

module.exports = app;
module.exports.default = app;
