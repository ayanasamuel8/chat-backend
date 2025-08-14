import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { createUploader } from '../utils/fileUploader';
import { Story } from '../models/Story';

const router = Router();

const storyUploader = createUploader({
  limit: 100 * 1024 * 1024,
  allowedTypes: ['image', 'video'],
});

// Endpoint to post a new story
router.post('/', authenticateJWT, storyUploader.single('storyContent'), async (req, res) => {
  try {
    const { type } = req.body as { type?: 'image' | 'video' };
    if (!req.file || !type) {
      return res.status(400).json({ message: 'Missing file content or story type.' });
    }

    const userId = req.userId as string;

    // Again, upload to cloud storage and get a URL
    const contentUrl = `https://your-cloud-storage.com/stories/${userId}/${Date.now()}`;

    const newStory = await Story.create({ user: userId, type, contentUrl });
    const populatedStory = await Story.findById(newStory._id).populate('user', 'name profileImageUrl');

    const io = req.app.get('socketio');
    io.emit('story:new', populatedStory);

    res.status(201).json({ message: 'Story posted successfully.', data: populatedStory });
  } catch (err) {
    res.status(500).json({ message: 'Failed to post story.' });
  }
});

// Endpoint to get all active stories, grouped by user
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const storiesByUser = await Story.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      { $unwind: '$userDetails' },
      {
        $group: {
          _id: '$user',
          user: { $first: { _id: '$userDetails._id', name: '$userDetails.name', profileImageUrl: '$userDetails.profileImageUrl' } },
          stories: { $push: { _id: '$_id', type: '$type', contentUrl: '$contentUrl', createdAt: '$createdAt' } },
        },
      },
      { $sort: { 'stories.createdAt': -1 } },
    ]);
    res.status(200).json({ data: storiesByUser });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stories.' });
  }
});

export default router;