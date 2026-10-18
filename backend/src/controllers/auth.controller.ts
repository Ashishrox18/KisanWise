import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { dynamoDBService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';
import { getAuth } from 'firebase-admin/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// In-memory OTP storage (in production, use Redis or DynamoDB with TTL)
const otpStore = new Map<string, { otp: string; expiresAt: number; userData: any }>();

export class AuthController {
  private validatePasswordStrength(password: string): { valid: boolean; message: string } {
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
      return { 
        valid: false, 
        message: 'Password must contain at least 3 of: uppercase letters, lowercase letters, numbers, special characters' 
      };
    }

    return { valid: true, message: 'Password is strong' };
  }

  async sendOTP(req: Request, res: Response) {
    try {
      let { phone, email, name, role, password } = req.body;

      // Validate required fields
      if (!email || !name || !role || !password) {
        return res.status(400).json({ error: 'Email, name, role and password are required' });
      }

      // Check if user already exists with that email
      const existingUsers = await dynamoDBService.scan(
        'users',
        'email = :email',
        { ':email': email }
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Normalize phone (optional in local mode)
      let normalizedPhone = phone || '';
      if (normalizedPhone && !normalizedPhone.startsWith('+')) {
        normalizedPhone = normalizedPhone.replace(/^0+/, '');
        normalizedPhone = '+91' + normalizedPhone;
      }

      // Generate a fixed OTP (123456) for local dev — shown in console
      const otp = '123456';
      const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour for ease of dev

      // Store OTP and user data temporarily
      otpStore.set(email, {
        otp,
        expiresAt,
        userData: { email, name, role, password, phone: normalizedPhone }
      });

      console.log('\n' + '='.repeat(60));
      console.log('📧 REGISTRATION OTP (Local Dev Mode)');
      console.log('='.repeat(60));
      console.log(`📬 Email: ${email}`);
      console.log(`🔢 OTP: ${otp}  ← use this to complete registration`);
      console.log('='.repeat(60) + '\n');

      res.status(200).json({ 
        message: 'OTP ready. In local dev mode, use OTP: 123456',
        expiresIn: 3600
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }

  async verifyOTPAndRegister(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      // Get stored OTP data (using email as key)
      const otpData = otpStore.get(email);

      if (!otpData) {
        return res.status(400).json({ error: 'OTP not found or expired. Please request a new OTP.' });
      }

      // Check if OTP expired
      if (Date.now() > otpData.expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
      }

      // Verify OTP
      if (otpData.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
      }

      // OTP verified - proceed with registration
      const { password, name, role, phone } = otpData.userData;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
        role,
        phone,
        phoneVerified: true,
        emailVerified: true,
        profile: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.put('users', user);

      // Clear OTP from store
      otpStore.delete(email);

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: true },
        token,
        message: 'Registration successful! Email verified.'
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async register(req: Request, res: Response) {
    try {
      const { email, password, name, role, phone, profile } = req.body;

      // Check if user exists
      const existingUsers = await dynamoDBService.scan(
        'users',
        'email = :email',
        { ':email': email }
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
        role,
        phone: phone || '',
        phoneVerified: false,
        emailVerified: true,
        profile: profile || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.put('users', user);

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const users = await dynamoDBService.scan(
        'users',
        'email = :email',
        { ':email': email }
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = users[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { token } = req.body;

      const decoded = jwt.verify(token, JWT_SECRET) as any;

      const newToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      res.json({ token: newToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { name, phone, profile } = req.body;

      // Get existing user
      const user = await dynamoDBService.get('users', { id: userId });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user data
      const updatedUser = {
        ...user,
        ...(name && { name }),
        ...(phone && { phone }),
        ...(profile && { profile }),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDBService.put('users', updatedUser);

      res.json({
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          name: updatedUser.name, 
          role: updatedUser.role,
          profile: updatedUser.profile 
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Profile update failed' });
    }
  }

  async googleLogin(req: Request, res: Response) {
    try {
      const { idToken, role } = req.body;
      if (!idToken) {
        return res.status(400).json({ error: 'idToken is required' });
      }

      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (err: any) {
        return res.status(401).json({ error: 'Invalid Google ID token', details: err.message });
      }

      const { email, name, picture, uid } = decodedToken;
      if (!email) {
        return res.status(400).json({ error: 'Google account must have an email address' });
      }

      // Check if user already exists
      const users = await dynamoDBService.scan('users', 'email = :email', { ':email': email });
      let user: any;

      if (users.length > 0) {
        user = users[0];
      } else {
        const assignedRole = role && ['farmer', 'buyer', 'admin'].includes(role) ? role : 'farmer';
        user = {
          id: `user-${uuidv4()}`,
          email,
          name: name || email.split('@')[0],
          role: assignedRole,
          googleUid: uid,
          avatar: picture,
          verified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await dynamoDBService.put('users', user);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN as any }
      );

      const { password: _, ...userWithoutPassword } = user;
      return res.json({
        token,
        user: userWithoutPassword,
        message: 'Google login successful',
      });
    } catch (error: any) {
      console.error('Google login error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error during Google login' });
    }
  }
}
