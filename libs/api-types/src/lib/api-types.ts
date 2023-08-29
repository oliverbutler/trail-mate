import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

export const contract = c.router({
  getHealth: {
    method: 'GET',
    path: '/health',
    responses: {
      200: z.object({
        status: z.string(),
        uptime: z.number(),
      }),
    },
  },
  auth: c.router({
    register: {
      method: 'POST',
      path: '/auth/register',
      body: z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
      responses: {
        200: z.object({
          id: z.string(),
        }),
      },
    },
  }),
  getTracks: {
    method: 'GET',
    path: '/tracks',
    responses: {
      200: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .array(),
    },
  },
  createTrack: {
    method: 'POST',
    path: '/tracks',
    body: z.object({
      name: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.string(),
        name: z.string(),
      }),
    },
  },
});
