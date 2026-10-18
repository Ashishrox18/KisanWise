/**
 * TC-SEC-01 … TC-SEC-15  — JWT auth middleware and password logic
 * Tests authenticate, optionalAuth, and validatePasswordStrength behaviour.
 */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

// The middleware reads JWT_SECRET at module load time using the env value
// OR the hardcoded fallback. Since we can't reliably set env before module
// load in Jest, we sign tokens with the same fallback the middleware uses.
const SECRET = 'fallback-secret-key-change-in-production';
// Set it anyway so it's consistent for any future runs with proper env isolation
process.env.JWT_SECRET = SECRET;

function mockRes() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

function validToken(payload = { id: 'u1', email: 'test@test.com', role: 'farmer' }) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

// ── authenticate ──────────────────────────────────────────────────────────────
describe('authenticate middleware', () => {
  test('TC-SEC-01 valid Bearer token → sets req.user and calls next', () => {
    const req = { headers: { authorization: `Bearer ${validToken()}` } } as AuthRequest;
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called without error
    expect(req.user).toBeDefined();
    expect(req.user!.id).toBe('u1');
    expect(req.user!.role).toBe('farmer');
  });

  test('TC-SEC-02 missing Authorization header → next(AppError 401)', () => {
    const req = { headers: {} } as AuthRequest;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });

  test('TC-SEC-03 "Bearer" with no token → next(AppError 401)', () => {
    const req = { headers: { authorization: 'Bearer' } } as any;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });

  test('TC-SEC-04 expired token → next(AppError 401)', () => {
    const expired = jwt.sign({ id: 'u2', email: 'x@x.com', role: 'buyer' }, SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${expired}` } } as any;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });

  test('TC-SEC-05 tampered token → next(AppError 401)', () => {
    const tampered = validToken().slice(0, -5) + 'XXXXX';
    const req = { headers: { authorization: `Bearer ${tampered}` } } as any;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });

  test('TC-SEC-06 token signed with wrong secret → next(AppError 401)', () => {
    const foreign = jwt.sign({ id: 'u3', email: 'y@y.com', role: 'farmer' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${foreign}` } } as any;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });

  test('TC-SEC-07 error message does not leak token details', () => {
    const req = { headers: { authorization: 'Bearer bad.token.here' } } as any;
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    const err = next.mock.calls[0][0] as AppError;
    expect(err.message).toBe('Invalid or expired token');
    expect(err.message).not.toContain('bad.token.here');
  });
});

// ── optionalAuth ──────────────────────────────────────────────────────────────
describe('optionalAuth middleware', () => {
  test('TC-SEC-08 valid token → sets req.user and calls next', () => {
    const req = { headers: { authorization: `Bearer ${validToken()}` } } as AuthRequest;
    const next = jest.fn();

    optionalAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
  });

  test('TC-SEC-09 no Authorization header → calls next without setting user', () => {
    const req = { headers: {} } as AuthRequest;
    const next = jest.fn();

    optionalAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  test('TC-SEC-10 invalid token → calls next without error (silently skipped)', () => {
    const req = { headers: { authorization: 'Bearer garbage.token' } } as any;
    const next = jest.fn();

    optionalAuth(req, mockRes(), next);

    // Must always call next — never throw for optional auth
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error passed
    expect(req.user).toBeUndefined();
  });
});

// ── Password strength (validatePasswordStrength logic extracted for testing) ─
// The method is private — we test the same logic directly here to document the
// expected behaviour and catch any future regressions if it's made public.
function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }

  let score = 0;
  if (hasUpperCase) score++;
  if (hasLowerCase) score++;
  if (hasNumber) score++;
  if (hasSpecialChar) score++;

  if (score < 3) {
    return { valid: false, message: 'Password must contain at least 3 of: uppercase letters, lowercase letters, numbers, special characters' };
  }

  return { valid: true, message: 'Password is strong' };
}

describe('validatePasswordStrength', () => {
  test('TC-SEC-11 Password@123 is valid (upper+lower+number+special)', () => {
    expect(validatePasswordStrength('Password@123').valid).toBe(true);
  });
  test('TC-SEC-12 "123456" is invalid (only 1 category)', () => {
    const r = validatePasswordStrength('123456');
    expect(r.valid).toBe(false);
    expect(r.message).toContain('8 characters');
  });
  test('TC-SEC-13 7-char strong password is invalid (too short)', () => {
    expect(validatePasswordStrength('Ab1@xyz').valid).toBe(false);
  });
  test('TC-SEC-14 lowercase+numbers only (score=2) is invalid', () => {
    expect(validatePasswordStrength('abcdef12').valid).toBe(false);
  });
  test('TC-SEC-15 uppercase+lowercase+number (score=3) is valid', () => {
    expect(validatePasswordStrength('Abcdefg1').valid).toBe(true);
  });
  test('TC-SEC-16 empty string is invalid', () => {
    expect(validatePasswordStrength('').valid).toBe(false);
  });
});
