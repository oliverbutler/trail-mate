import Fastify, { FastifyInstance } from 'fastify';
import { app } from './app';
import { db } from '../db';
import { Users } from './schema';
import { eq } from 'drizzle-orm';
import cuid from 'cuid';
import { JwtPayload } from '@trail-mate/api-types';
import * as jwt from 'jsonwebtoken';
import { environment } from '../env';

describe('Auth', () => {
  let server: FastifyInstance;

  beforeAll(() => {
    server = Fastify();
    server.register(app);
  });

  describe('flow for a single user', () => {
    let userId: string;
    const email = `oliver+${cuid.slug()}@oliverbutler.uk`;
    const username = `olly-${cuid.slug()}`;

    it('should be able to register with email/username/password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/register',
        body: {
          givenName: 'Test',
          familyName: 'User',
          email: email,
          username: username,
          password: 'password',
        },
      });

      expect({
        statusCode: response.statusCode,
        body: response.json(),
      }).toStrictEqual(
        expect.objectContaining({
          statusCode: 200,
          body: {
            id: expect.any(String),
            givenName: 'Test',
            familyName: 'User',
            email: email,
            username: username,
            emailVerifiedAt: null,
          },
        })
      );

      userId = response.json().id;
    });

    it('should be able to verify email', async () => {
      const [user] = await db
        .select()
        .from(Users)
        .where(eq(Users.id, userId))
        .execute();

      const response = await server.inject({
        method: 'GET',
        url: `/auth/verify-email/${user!.emailVerificationToken}`,
      });

      expect(response.statusCode).toBe(200);

      const [updatedUser] = await db
        .select()
        .from(Users)
        .where(eq(Users.id, userId))
        .execute();

      expect(updatedUser!.emailVerifiedAt).not.toBe(null);
    });

    it('should be able to login with email/password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        body: {
          username: email,
          password: 'password',
        },
      });

      expect({
        statusCode: response.statusCode,
        body: response.json(),
      }).toStrictEqual({
        statusCode: 200,
        body: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          refreshTokenId: expect.any(String),
        },
      });
    });

    it('should be able to refresh token for a new one', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        body: {
          username: email,
          password: 'password',
        },
      });

      const { accessToken, refreshToken, refreshTokenId } = response.json();

      const refreshResponse = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        body: {
          refreshToken,
          refreshTokenId,
        },
      });

      expect({
        statusCode: refreshResponse.statusCode,
        body: refreshResponse.json(),
      }).toStrictEqual({
        statusCode: 200,
        body: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          refreshTokenId: expect.any(String),
        },
      });

      //   try to refresh with old token
      const refreshWithStaleToken = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        body: {
          refreshToken,
          refreshTokenId,
        },
      });

      expect(refreshWithStaleToken.statusCode).toBe(401);
    });
  });

  it('should not be able to create a user with the same email', async () => {
    const uniqueEmail = `oliver+${cuid.slug()}@oliverbutler.uk`;
    const username = `olly-${cuid.slug()}`;

    const initialUser = await server.inject({
      method: 'POST',
      url: '/auth/register',
      body: {
        givenName: 'Test',
        familyName: 'User',
        email: uniqueEmail,
        username: username,
        password: 'password',
      },
    });

    expect(initialUser.statusCode).toBe(200);

    const duplicateEmail = await server.inject({
      method: 'POST',
      url: '/auth/register',
      body: {
        givenName: 'Test',
        familyName: 'User',
        email: uniqueEmail,
        username: username + '-2',
        password: 'password',
      },
    });

    console.log(duplicateEmail.json());

    expect({
      statusCode: duplicateEmail.statusCode,
      body: duplicateEmail.json(),
    }).toStrictEqual({
      statusCode: 401,
      body: {
        code: 'UserAlreadyExists',
      },
    });
  });

  describe('invalid acces tokens are rejected', () => {
    it('should reject access tokens which are made up', async () => {
      const result = await server.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: 'some bad token',
        },
      });

      expect({
        statusCode: result.statusCode,
        body: result.json(),
      }).toStrictEqual({
        statusCode: 401,
        body: {
          code: 'InvalidAccessToken',
        },
      });
    });
  });

  it('should reject access tokens which are expired', async () => {
    const payload: JwtPayload = {
      sub: '123',
      email: '123@gmail.com',
      // 100 seconds ago
      exp: Math.floor(Date.now() / 1000) - 100,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = jwt.sign(payload, environment.JWT_SECRET);

    const result = await server.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect({
      statusCode: result.statusCode,
      body: result.json(),
    }).toStrictEqual({
      statusCode: 401,
      body: {
        code: 'InvalidAccessToken',
      },
    });
  });

  it('should reject access tokens which are not signed with the correct secret', async () => {
    const payload: JwtPayload = {
      sub: '123',
      email: 'test@gmail.com',
      exp: Math.floor(Date.now() / 1000) + 60 * 10,
      iat: Math.floor(Date.now() / 1000),
    };

    const accessToken = jwt.sign(payload, environment.JWT_SECRET);

    const result = await server.inject({
      method: 'GET',
      url: '/auth/me',
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect({
      statusCode: result.statusCode,
      body: result.json(),
    }).toStrictEqual({
      statusCode: 401,
      body: {
        code: 'InvalidAccessToken',
      },
    });
  });
});
