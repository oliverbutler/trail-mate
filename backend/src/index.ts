import fastify from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Tracks } from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'fs';
import { environment } from './env';

const server = fastify();

const connection = postgres(environment.DB_CONNECTION_STRING, {
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          ca: readFileSync('./drizzle/global-bundle.pem').toString(),
        }
      : false,
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

if (process.env.NODE_ENV === 'production') {
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
}

server.listen(
  { port: environment.PORT, host: environment.HOST },
  (err, address) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }

    console.log(
      `Server listening at ${address} 🚀 (${environment.IMAGE_TAG}) `,
    );
  },
);
