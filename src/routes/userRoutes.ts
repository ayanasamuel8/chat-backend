import express from 'express';
import {User} from '../models/User';
import { signToken } from '../middleware/auth';
import { authenticateJWT } from '../middleware/auth';

const router = express.Router();

// Create a new user
router.post('/', async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = new User({ name, email });
    await user.save();
    console.log('User created:', user);

    const token = signToken(user._id.toString());
    res.status(201).json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Simple login (by email) to issue a token
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = signToken(user._id.toString());
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const currentUserId = req.userId as string;
    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get all users (optionally could be protected)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
