import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateUserSchema, UserSchema, UserSessionIdSchema } from './types';

const c = initContract();

export const HTTP_ERRORS = {
  401: z.object({
    code: z.enum([
      'UserAlreadyExists',
      'InvalidAccessToken',
      'ExpiredToken',
      'InvalidCredentials',
      'InvalidRefreshToken',
      'EmailNotVerified',
    ]),
    message: z.string().optional(),
  }),
} as const;

const createResponses = <T>(options: T) => {
  return {
    ...options,
    ...HTTP_ERRORS,
  } as const;
};

export const contract = c.router(
  {
    getHealth: {
      method: 'GET',
      path: '/health',
      responses: createResponses({
        200: z.object({
          status: z.string(),
          uptime: z.number(),
        }),
      }),
    },
    auth: c.router({
      register: {
        method: 'POST',
        path: '/auth/register',
        body: CreateUserSchema,
        responses: createResponses({
          200: UserSchema,
        }),
        headers: z.object({
          authorization: z.string().optional(),
        }),
      },
      verifyEmail: {
        method: 'GET',
        path: '/auth/verify-email/:token',
        description:
          "Verifies a user's email address and shows a static confirmation page.",
        responses: createResponses({
          200: c.otherResponse({
            contentType: 'text/html',
            body: c.type<string>(),
          }),
        }),
        headers: z.object({
          authorization: z.string().optional(),
        }),
      },
      login: {
        method: 'POST',
        path: '/auth/login',
        body: z.object({
          username: z.string(),
          password: z.string(),
        }),
        responses: createResponses({
          200: z.object({
            user: UserSchema,
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenId: UserSessionIdSchema,
          }),
        }),
        headers: z.object({
          authorization: z.string().optional(),
        }),
      },
      refreshToken: {
        method: 'POST',
        path: '/auth/refresh',
        body: z.object({
          refreshToken: z.string(),
          refreshTokenId: z.string(),
        }),
        responses: createResponses({
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenId: UserSessionIdSchema,
          }),
        }),
        headers: z.object({
          authorization: z.string().optional(),
        }),
      },
      getMe: {
        method: 'GET',
        path: '/auth/me',
        responses: createResponses({
          200: UserSchema,
        }),
      },
    }),
    getTracks: {
      method: 'GET',
      path: '/tracks',
      responses: createResponses({
        200: z
          .object({
            id: z.string(),
            name: z.string(),
          })
          .array(),
      }),
    },
    createTrack: {
      method: 'POST',
      path: '/tracks',
      body: z.object({
        name: z.string(),
      }),
      responses: createResponses({
        200: z.object({
          id: z.string(),
          name: z.string(),
        }),
      }),
    },
  },
  {
    strictStatusCodes: true,
    baseHeaders: z.object({
      authorization: z.string(),
    }),
  }
);
