import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes';
import { socketHandler } from './socket/socket';
import userRoutes from './routes/userRoutes';
import { authenticateJWT } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/chats', authenticateJWT, chatRoutes);

app.use('/api/users', userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

socketHandler(io);

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error(err));
