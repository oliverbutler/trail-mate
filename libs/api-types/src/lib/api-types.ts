import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { CreateUserSchema, UserSchema } from './types';

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
        ...HTTP_ERRORS,
      },
    },
    auth: c.router({
      register: {
        method: 'POST',
        path: '/auth/register',
        body: CreateUserSchema,
        responses: {
          200: UserSchema,
          ...HTTP_ERRORS,
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
          ...HTTP_ERRORS,
        },
      },
      login: {
        method: 'POST',
        path: '/auth/login',
        body: z.object({
          username: z.string(),
          password: z.string(),
        }),
        responses: {
          200: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            refreshTokenId: z.string(),
          }),
          ...HTTP_ERRORS,
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
          ...HTTP_ERRORS,
        },
      },
      getMe: {
        method: 'GET',
        path: '/auth/me',
        responses: {
          200: UserSchema,
          ...HTTP_ERRORS,
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
        ...HTTP_ERRORS,
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
        ...HTTP_ERRORS,
      },
    },
  },
  {
    strictStatusCodes: true,
  }
);
