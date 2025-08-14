import { Schema, model, Document, Types } from 'mongoose';

export interface IStory extends Document {
  user: Types.ObjectId;
  type: 'image' | 'video';
  contentUrl: string;
  expiresAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['image', 'video'], required: true },
    contentUrl: { type: String, required: true },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), index: { expires: '24h' } },
  },
  { timestamps: true }
);

export const Story = model<IStory>('Story', storySchema);