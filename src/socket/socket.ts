import { Server, Socket } from 'socket.io';
import { Message } from '../models/Message';
import jwt from 'jsonwebtoken';
import { Chat } from '../models/Chat';

interface MessageSendPayload {
  chatId: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'sending';
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
          status: 'sent',
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

        const unreadCountFieldToIncrement = getId(chat.user1) === receiverId
          ? 'unreadCount1'
          : 'unreadCount2';

        await Chat.findByIdAndUpdate(data.chatId, {
          lastMessage: data.content,
          lastMessageTime: message.timestamp || new Date(),
          $inc: { [unreadCountFieldToIncrement]: 1 }
        });


        io.to(receiverId).emit('message:received', populatedMsg);
        await Message.findByIdAndUpdate(message._id, { status: 'delivered' });
        console.log('Message sent to receiver:', receiverId);
      } catch (err) {
        console.error('Error in message:send handler:', err);
      }
    });
    socket.on('chat:read', async ({ chatId }) => {
      try {
        const readerId = (socket as any).userId as string;
        console.log(`User ${readerId} has read chat ${chatId}`);

        // Find the other user in the chat
        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const getId = (u: any) => u._id.toString();
        const otherUserId = getId(chat.user1) === readerId ? getId(chat.user2) : getId(chat.user1);

        const unreadCountFieldToReset = getId(chat.user1) === readerId
          ? 'unreadCount1'
          : 'unreadCount2';
        await Chat.findByIdAndUpdate(chatId, {
          $set: { [unreadCountFieldToReset]: 0 }
        });

        // Update all messages in this chat that were sent BY the other user
        // and are not yet marked as 'read'.
        const updateResult = await Message.updateMany(
          {
            chat: chatId,
            sender: otherUserId,
            status: { $ne: 'read' },
          },
          { $set: { status: 'read' } }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`Updated ${updateResult.modifiedCount} messages to 'read'`);
          // Notify the other user that their messages have been read
          io.to(otherUserId).emit('messages:were_read', {
            chatId: chatId,
            readerId: readerId
          });
        }
      } catch (err) {
        console.error('Error in chat:read handler:', err);
      }
    });

    socket.on('call:initiate', (data: { receiverId: string; offer: any; callerInfo: any }) => {
      console.log(`[Call] User ${userId} is calling ${data.receiverId}`);
      io.to(data.receiverId).emit('call:incoming', {
        callerId: userId,
        callerInfo: data.callerInfo, // e.g., { name, profileImageUrl }
        offer: data.offer, // The SDP offer from the caller
      });
    });

    // Event when the receiver accepts the call
    socket.on('call:accept', (data: { callerId: string; answer: any }) => {
      console.log(`[Call] User ${userId} accepted call from ${data.callerId}`);
      io.to(data.callerId).emit('call:accepted', {
        receiverId: userId,
        answer: data.answer, // The SDP answer from the receiver
      });
    });

    // Event to exchange ICE candidates for NAT traversal
    socket.on('call:ice_candidate', (data: { targetId: string; candidate: any }) => {
      io.to(data.targetId).emit('call:ice_candidate', {
        senderId: userId,
        candidate: data.candidate,
      });
    });

    // Event when a user rejects the call
    socket.on('call:reject', (data: { callerId: string }) => {
      console.log(`[Call] User ${userId} rejected call from ${data.callerId}`);
      io.to(data.callerId).emit('call:rejected', {
        receiverId: userId,
      });
    });

    socket.on('call:end', (data: { targetId: string }) => {
      console.log(`[Call] User ${userId} ended call with ${data.targetId}`);
      io.to(data.targetId).emit('call:ended');
    });
  });
}
