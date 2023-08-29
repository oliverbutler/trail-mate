import { initServer } from '@ts-rest/fastify';
import { contract } from '@trail-mate/api-types';
import { db } from '../db';
import { Tracks, Users } from './schema';
import * as bcrypt from 'bcrypt';
import {
  createAccessAndRefreshToken,
  createUser,
  exchangeRefreshToken,
  getUserById,
  validateEmailVerificationToken,
  verifyAccessToken,
  verifyLogin,
} from './users';

export const s = initServer();

const router = s.router(contract, {
  auth: {
    register: async ({ body }) => {
      const user = await createUser(body);

      return {
        status: 200,
        body: user,
      };
    },
    verifyEmail: async ({ params }) => {
      const isAccepted = await validateEmailVerificationToken(params.token);

      if (isAccepted) {
        return {
          status: 200,
          body: `
            <html lang="en">
            <body><h1>Email verified!</h1></body>
            </html>`,
        };
      } else {
        return {
          status: 200,
          body: `<html lang=""><body><h1>Something doesn't seem right, please try again.</h1></body></html>`,
        };
      }
    },
    getMe: async ({ headers: { authorization } }) => {
      const { sub } = await verifyAccessToken(authorization);

      return {
        status: 200,
        body: await getUserById(sub),
      };
    },
    login: async ({ body }) => {
      const user = await verifyLogin(body);

      const { accessToken, refreshToken, refreshTokenId } =
        await createAccessAndRefreshToken(user);

      return {
        status: 200,
        body: {
          user,
          accessToken,
          refreshToken,
          refreshTokenId,
        },
      };
    },
    refreshToken: async ({ body }) => {
      return {
        status: 200,
        body: await exchangeRefreshToken(
          body.refreshToken,
          body.refreshTokenId
        ),
      };
    },
  },
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
