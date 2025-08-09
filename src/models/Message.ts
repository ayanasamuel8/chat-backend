import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './User';
import { IChat } from './Chat';

export type MessageType = 'text' | 'image' | 'video';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatid?: string;
  chat: Types.ObjectId | IChat;
  sender: Types.ObjectId | IUser;
  content: string;
  type: MessageType;
  timestamp: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatid: { type: String },
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image', 'video'], default: 'text' },
    timestamp: { type: Date, default: Date.now }
  }
);

export const Message = model<IMessage>('Message', messageSchema);
