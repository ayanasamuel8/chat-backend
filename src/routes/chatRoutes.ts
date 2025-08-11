import { Router, Request, Response } from 'express';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { Types } from 'mongoose';

const router = Router();

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

// Initiate or get chat between current user and target
router.post('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    console.log(`Current user ID: ${currentUserId}`);
    console.log(`target userId: ${req.body['userId']}`);
    const { userId } = req.body as { userId?: string };
    console.log('Initiating chat for user:', currentUserId, 'with target:', userId);

    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const userA = toObjectId(currentUserId);
    const userB = toObjectId(userId || currentUserId);
    if (!userA || !userB) {
      console.error('Invalid user IDs:', currentUserId, userId);
      return res.status(400).json({ error: 'Invalid user id' });
    }

    let chat = await Chat.findOne({
      $or: [
        { user1: userA, user2: userB },
        { user1: userB, user2: userA }
      ]
    });

    if (!chat) {
      chat = await Chat.create({ user1: userA, user2: userB });
    }
    const populatedChat = await Chat.findById(chat._id).populate('user1 user2');
    console.log('Chat found or created:', populatedChat);

    // Send the fully populated chat object
    res.json(populatedChat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create/find chat' });
  }
});

// Get messages for a chat (only if user is a participant)
router.get('/:chatId/messages', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const currentOid = toObjectId(currentUserId);
    if (!currentOid) return res.status(400).json({ error: 'Invalid user id' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const isParticipant = (chat.user1 as any).equals?.(currentOid) || (chat.user2 as any).equals?.(currentOid);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender')
      .populate({ path: 'chat', populate: ['user1', 'user2'] })
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get all chats for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const currentOid = toObjectId(currentUserId);
    if (!currentOid) return res.status(400).json({ error: 'Invalid user id' });

    const chats = await Chat.find({
      $or: [{ user1: currentOid }, { user2: currentOid }]
    })
      .populate('user1')
      .populate('user2')
      .sort({ lastMessageTime: -1 })
      .lean();

     const chatsWithUnreadCount = chats.map(chat => {
      // Determine if the currently logged-in user is user1 or user2 for THIS chat
      const isUser1 = (chat.user1 as any)._id.equals(currentOid);

      // Select the correct unread count based on the user's position
      const unreadCountForCurrentUser = isUser1 ? chat.unreadCount1 : chat.unreadCount2;

      // Create a new object that includes everything from the original chat document,
      // plus our new, unambiguous 'unreadCount' field.
      const finalChatObject = {
        ...chat,
        unreadCount: unreadCountForCurrentUser,
      };

      delete (finalChatObject as any).unreadCount1;
      delete (finalChatObject as any).unreadCount2;

      return finalChatObject;
    });

    res.json(chatsWithUnreadCount);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get a chat (only if user is a participant)
router.get('/:chatId', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const currentOid = toObjectId(currentUserId);
    if (!currentOid) return res.status(400).json({ error: 'Invalid user id' });

    const chat = await Chat.findById(req.params.chatId)
      .populate('user1')
      .populate('user2');

    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const u1 = (chat.user1 as any)?._id || chat.user1;
    const u2 = (chat.user2 as any)?._id || chat.user2;
    const isParticipant = (u1 as any).equals?.(currentOid) || (u2 as any).equals?.(currentOid);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Delete chat (only if user is a participant)
router.delete('/:chatId', async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const currentOid = toObjectId(currentUserId);
    if (!currentOid) return res.status(400).json({ error: 'Invalid user id' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const isParticipant = (chat.user1 as any).equals?.(currentOid) || (chat.user2 as any).equals?.(currentOid);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Message.deleteMany({ chat: req.params.chatId });
    await Chat.findByIdAndDelete(req.params.chatId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;
