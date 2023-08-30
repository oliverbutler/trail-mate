import * as bcrypt from 'bcrypt';
import { db } from '../db';
import { Users, UserSessions } from './schema';
import {
  CreateUser,
  JwtPayload,
  JwtPayloadSchema,
  User,
} from '@trail-mate/api-types';
import { eq, or, sql } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { environment } from '../env';
import { randomBytes } from 'crypto';

import { HttpError } from '../httpError';

const mapEntityToUser = (user: typeof Users.$inferSelect): User => ({
  id: user.id,
  givenName: user.givenName,
  familyName: user.familyName,
  username: user.username,
  email: user.email,
  emailVerifiedAt: user.emailVerifiedAt
    ? user.emailVerifiedAt.toISOString()
    : null,
});

export const createUser = async (dto: CreateUser): Promise<User> => {
  const passwordHash = await bcrypt.hash(dto.password, 10);

  const existingUser = await db
    .select()
    .from(Users)
    .where(or(eq(Users.email, dto.email), eq(Users.username, dto.username)))
    .execute();

  if (existingUser.length > 0) {
    throw new Error('User already exists');
  }

  const [user] = await db
    .insert(Users)
    .values({
      email: dto.email,
      passwordHash,
      givenName: dto.givenName,
      familyName: dto.familyName,
      username: dto.username,
    })
    .returning()
    .execute();

  if (!user) {
    throw new Error('User not created');
  }

  return mapEntityToUser(user);
};

export const validateEmailVerificationToken = async (token: string) => {
  const [user] = await db
    .select()
    .from(Users)
    .where(eq(Users.emailVerificationToken, token));

  if (!user) {
    return false;
  } else {
    await db
      .update(Users)
      .set({
        emailVerifiedAt: new Date(),
      })
      .where(eq(Users.id, user.id))
      .execute();

    return true;
  }
};

export const getUserById = async (id: string): Promise<User> => {
  const [user] = await db.select().from(Users).where(eq(Users.id, id));

  if (!user) {
    throw new Error(`User ${id} not found`);
  }

  if (!user.emailVerifiedAt) {
    throw new Error(
      `User ${id} email not verified yet, please check your email for the verification link`
    );
  }

  return mapEntityToUser(user);
};

export const createAccessAndRefreshToken = async ({
  user,
  familyId,
  callerIp,
  callerUserAgent,
}: {
  user: User;
  familyId: string;
  callerIp: string;
  callerUserAgent: string;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
}> => {
  const MINUTES_10 = 60 * 10;

  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + MINUTES_10,
    iat: Math.floor(Date.now() / 1000),
  };

  const accessToken = jwt.sign(payload, environment.JWT_SECRET);

  const refreshToken = randomBytes(64).toString('hex');

  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  const [userSession] = await db
    .insert(UserSessions)
    .values({
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(payload.exp * 1000),
      familyId,
      callerIp,
      callerUserAgent,
    })
    .returning()
    .execute();

  if (!userSession) {
    throw new Error('User session not created');
  }

  return {
    accessToken,
    refreshToken,
    refreshTokenId: userSession.id,
  };
};

export const verifyAccessToken = async (token: string): Promise<JwtPayload> => {
  const tokenWithoutBearer = token.replace('Bearer ', '');

  try {
    const payload = jwt.verify(tokenWithoutBearer, environment.JWT_SECRET);

    return JwtPayloadSchema.parse(payload);
  } catch (e) {
    throw new HttpError(401, {
      code: 'Unauthorized',
      message: 'Invalid access token',
    });
  }
};

/**
 * If the session is NOT the latest session, throw and error and mark them all as invalid
 *
 * This means someone is using an old refresh token to get a new access token which is
 * a sign that their refresh token has been compromised, so we should invalidate all of them to be safe
 */
async function assertOldRefreshTokenNotUsed(
  userSession: typeof UserSessions.$inferSelect
) {
  const latestSessionInFamily = await db
    .select()
    .from(UserSessions)
    .where(eq(UserSessions.familyId, userSession.familyId))
    .orderBy(sql`${UserSessions.id} DESC`);

  if (!latestSessionInFamily[0]) {
    throw new HttpError(401, {
      code: 'Unauthorized',
      message: 'Unable to find refresh token, please login again',
    });
  }

  if (latestSessionInFamily[0].id !== userSession.id) {
    await db
      .update(UserSessions)
      .set({
        invalidatedAt: new Date(),
      })
      .where(eq(UserSessions.familyId, userSession.familyId))
      .execute();

    throw new HttpError(401, {
      code: 'Unauthorized',
      message: 'Refresh token is invalid, please login again',
    });
  }
}

function assertRefreshTokenIsNotExpired(expirationDate: Date) {
  const isRefreshTokenExpired = expirationDate < new Date();
  if (isRefreshTokenExpired) {
    throw new Error('Refresh token expired');
  }
}

async function assertRefreshTokenHashMatches(
  refreshToken: string,
  refreshTokenHash: string
) {
  const isRefreshTokenValid = await bcrypt.compare(
    refreshToken,
    refreshTokenHash
  );
  if (!isRefreshTokenValid) {
    throw new Error('Invalid refresh token');
  }
}

export const exchangeRefreshToken = async ({
  refreshToken,
  refreshTokenId,
  callerIp,
  callerUserAgent,
}: {
  refreshToken: string;
  refreshTokenId: string;
  callerIp: string;
  callerUserAgent: string;
}) => {
  const [userSession] = await db
    .select()
    .from(UserSessions)
    .where(eq(UserSessions.id, refreshTokenId));

  if (!userSession) {
    throw new Error('Invalid refresh token');
  }

  await assertRefreshTokenHashMatches(
    refreshToken,
    userSession.refreshTokenHash
  );
  assertRefreshTokenIsNotExpired(userSession.expiresAt);
  await assertOldRefreshTokenNotUsed(userSession);

  const familyId = userSession.familyId;

  const user = await getUserById(userSession.userId);

  return createAccessAndRefreshToken({
    user: user,
    familyId: familyId,
    callerIp: callerIp,
    callerUserAgent: callerUserAgent,
  });
};

export const verifyLogin = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<User> => {
  const [user] = await db
    .select()
    .from(Users)
    .where(or(eq(Users.email, username), eq(Users.username, username)));

  const dummyHash = '$2b$10$invalidhashthatdoesnotexist';
  const isPasswordValid = await bcrypt.compare(
    password,
    user ? user.passwordHash : dummyHash
  );

  if (!isPasswordValid || !user) {
    throw new Error('Invalid email or password');
  }

  return mapEntityToUser(user);
};
