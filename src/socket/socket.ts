import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import jwt from 'jsonwebtoken';
import { Chat } from '../models/Chat';

interface MessageSendPayload {
  chatId: string;
  content: string;
  type: 'text' | 'image' | 'video';
}

interface ChatUser {
  _id: string;
  name?: string;
  email?: string;
}

interface Chat {
  user1: ChatUser | string;
  user2: ChatUser | string;
  _id: string;
}

export function socketHandler(io: Server) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || (socket.handshake.headers['authorization'] as string | undefined)?.split(' ')[1];
      const secret = process.env.JWT_SECRET;
      if (!token || !secret) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, secret) as { sub?: string; id?: string; userId?: string };
      const userId = decoded.sub || decoded.id || decoded.userId;
      if (!userId) return next(new Error('Unauthorized'));
      (socket as any).userId = userId;
      next();
    } catch (e) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log('User connected:', userId, socket.id);

    socket.join(userId);

    socket.on('message:send', async (data: MessageSendPayload) => {
      try {
        const senderId = userId;
        const message = await Message.create({
          sender: senderId,
          chat: data.chatId,
          content: data.content,
          type: data.type
        });

        await Chat.findByIdAndUpdate(data.chatId, {
      lastMessage: data.content,
      lastMessageTime: message.timestamp || new Date()
    });
    
        const populatedMsg = await Message.findById(message._id)
          .populate('sender')
          .populate({ path: 'chat', populate: ['user1', 'user2'] });

        if (!populatedMsg) {
          console.error('Message not found after creation');
          return;
        }

        const chat = populatedMsg.chat as unknown as Chat | null;

        if (!chat || !chat.user1 || !chat.user2) {
          console.error('Chat or chat users not found in populated message:', populatedMsg);
          return;
        }

        socket.emit('message:delivered', populatedMsg);
        console.log('Message delivered to sender:', senderId);

        const getId = (u: ChatUser | string) => 
  typeof u === 'string' ? u : String(u._id);

const receiverId = getId(chat.user1) === String(senderId)
  ? getId(chat.user2)
  : getId(chat.user1);


        io.to(receiverId).emit('message:received', populatedMsg);
        console.log('Message sent to receiver:', receiverId);
      } catch (err) {
        console.error('Error in message:send handler:', err);
      }
    });
  });
}
