import { initServer } from '@ts-rest/fastify';
import { contract } from '@trail-mate/api-types';
import { db } from '../db';
import { Tracks } from './schema';

export const s = initServer();

const router = s.router(contract, {
  getHealth: async ({}) => {
    return {
      status: 200,
      body: {
        status: 'ok',
        uptime: process.uptime(),
      },
    };
  },
  getTracks: async ({}) => {
    const tracks = await db.select().from(Tracks);

    return {
      status: 200,
      body: tracks,
    };
  },
  createTrack: async ({ body }) => {
    const { name } = body;

    const [result] = await db
      .insert(Tracks)
      .values({
        name,
      })
      .returning();

    return {
      status: 200,
      body: result,
    };
  },
});

export const tsRestPlugin = s.plugin(router);
