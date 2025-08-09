import express from 'express';
import {User} from '../models/User';
import { signToken } from '../middleware/auth';
import { authenticateJWT } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = express.Router();

// Create a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format', statusCode: 400 });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters', statusCode: 400 });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match', statusCode: 400 });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use', statusCode: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = signToken(user._id.toString());
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user', statusCode: 500 });
  }
});

// Simple login (by email) to issue a token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format', statusCode: 400 });
    }

    if (!password) {
      return res.status(400).json({ message: 'Password is required', statusCode: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found', statusCode: 404 });

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password', statusCode: 401 });
    }

    const access_token = signToken(user._id.toString());
    res.json({ data: { ...user.toObject(), access_token } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to login', statusCode: 500 });
  }
});

// Get current user profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.userId as string;
    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ message: 'User not found', statusCode: 404 });
    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile', statusCode: 500 });
  }
});

// Get all users (optionally could be protected)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ data: users });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users', statusCode: 500 });
  }
});

export default router;
