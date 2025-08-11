import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';

export interface IChat extends Document {
  id: string;
  user1: Types.ObjectId | IUser;
  user2: Types.ObjectId | IUser;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount1: number;
  unreadCount2: number;
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    user1: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user2: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lastMessage: { type: String, default: "" },
    lastMessageTime: { type: Date, default: Date.now },
    unreadCount1: {
        type: Number,
        default: 0
      },
    unreadCount2: {
        type: Number,
        default: 0
      }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export const Chat = model<IChat>('Chat', chatSchema);
