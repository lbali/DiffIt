import Fastify from 'fastify';
import cors from '@fastify/cors';
import { apiRoutes } from './routes/api.routes';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 50 * 1024 * 1024, // 50MB limit for large schemas
});

async function start() {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: process.env.CORS_ORIGIN || '*',
    });

    // Register routes
    await fastify.register(apiRoutes);

    // Start server
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
