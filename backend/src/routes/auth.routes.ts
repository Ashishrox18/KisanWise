import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new AuthController();

// OTP-based registration
router.post('/send-otp', (req, res) => controller.sendOTP(req, res));
router.post('/verify-otp', (req, res) => controller.verifyOTPAndRegister(req, res));

// Traditional registration (without OTP)
router.post('/register', (req, res) => controller.register(req, res));
router.post('/login', (req, res) => controller.login(req, res));
router.post('/google', (req, res) => controller.googleLogin(req, res));
router.post('/refresh', (req, res) => controller.refreshToken(req, res));
router.put('/profile', authenticate, (req, res) => controller.updateProfile(req, res));

export default router;
