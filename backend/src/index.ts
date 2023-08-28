import fastify from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { Tracks } from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'fs';

dotenv.config();

const server = fastify();

const {
  PORT = '3000',
  DB_CONNECTION_STRING = '',
  IMAGE_TAG = '',
} = process.env;

const connection = postgres(DB_CONNECTION_STRING, {
  ssl: {
    ca: readFileSync('./drizzle/global-bundle.pem').toString(),
  },
});
const db = drizzle(connection);

server.get('/health', async (request, reply) => {
  console.log('GET /health');
  return {
    status: 'ok',
    uptime: process.uptime(),
  };
});

server.get('/tracks', async (request, reply) => {
  const tracks = await db.select().from(Tracks);

  return tracks;
});

server.post('/tracks', async (request, reply) => {
  const { name } = request.body as { name: string };

  await db.insert(Tracks).values({
    name,
  });

  const tracks = await db.select().from(Tracks);

  return tracks;
});

server.addHook('onReady', async () => {
  console.log('Starting migration');
  migrate(db, { migrationsFolder: './drizzle' })
    .then(() => {
      console.log('Migration complete');
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
});

server.listen({ port: parseInt(PORT) }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  console.log(`Server listening at ${address} 🚀 (${IMAGE_TAG}) `);
});
