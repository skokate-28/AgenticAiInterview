import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import companyRoutes from './routes/company.routes.js';
import employerRoutes from './routes/employer.routes.js';
import userRoutes from './routes/user.routes.js';
import swaggerSpec from './config/swagger.js';
import initInterviewSocket from './socket/interview.handler.js';
import { seedCandidates } from './scripts/seedCandidates.js';
import './workers/jdProcessing.worker.js';

dotenv.config();

async function startServer() {
  await connectDB();

  if (process.env.SEED_CANDIDATES_ON_START === 'true') {
    await seedCandidates({ connectIfNeeded: false });
  }

  const app = express();
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  globalThis.__smartInterviewIO = io;
  app.set('io', io);
  initInterviewSocket(io);

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/interview', interviewRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/employer', employerRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server bootstrap failed:', error);
  process.exit(1);
});