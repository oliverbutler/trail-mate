import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateUserSchema, UserSchema } from './types';

const c = initContract();

export const contract = c.router(
  {
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
        body: CreateUserSchema,
        responses: {
          200: UserSchema,
        },
      },
      verifyEmail: {
        method: 'GET',
        path: '/auth/verify-email/:token',
        description:
          "Verifies a user's email address and shows a static confirmation page.",
        responses: {
          200: c.otherResponse({
            contentType: 'text/html',
            body: c.type<string>(),
          }),
        },
      },
      login: {
        method: 'POST',
        path: '/auth/login',
        body: z.object({
          emailOrUsername: z.string(),
          password: z.string(),
        }),
        responses: {
          200: z.object({
            user: UserSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenId: z.string(),
          }),
        },
      },
      refreshToken: {
        method: 'POST',
        path: '/auth/refresh',
        body: z.object({
          refreshToken: z.string(),
          refreshTokenId: z.string(),
        }),
        responses: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenId: z.string(),
          }),
        },
      },
      getMe: {
        method: 'GET',
        path: '/auth/me',
        responses: {
          200: UserSchema,
        },
        headers: z.object({
          authorization: z.string(),
        }),
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
  },
  {
    strictStatusCodes: true,
  }
);
