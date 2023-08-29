import * as bcrypt from 'bcrypt';
import { db } from '../db';
import { Users, UserSessions } from './schema';
import { CreateUser, JwtPayload, User } from '@trail-mate/api-types';
import { eq, or } from 'drizzle-orm';
import * as jwt from 'jsonwebtoken';
import { environment } from '../env';
import { randomBytes } from 'crypto';

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

export const createAccessAndRefreshToken = async (
  user: User
): Promise<{
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

  const refreshToken = randomBytes(32).toString('hex');

  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  const [userSession] = await db
    .insert(UserSessions)
    .values({
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(payload.exp * 1000),
    })
    .returning()
    .execute();

  return {
    accessToken,
    refreshToken,
    refreshTokenId: userSession.id,
  };
};

/**
 * @throws Error if token is invalid
 */
export const verifyAccessToken = async (token: string): Promise<JwtPayload> => {
  const tokenWithoutBearer = token.replace('Bearer ', '');

  try {
    return jwt.verify(tokenWithoutBearer, environment.JWT_SECRET) as JwtPayload;
  } catch (e) {
    throw new Error('Invalid access token');
  }
};

export const exchangeRefreshToken = async (
  refreshToken: string,
  refreshTokenId: string
) => {
  return await db.transaction(async (trx) => {
    const [userSession] = await trx
      .select()
      .from(UserSessions)
      .where(eq(UserSessions.id, refreshTokenId));
    if (!userSession) {
      throw new Error('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      userSession.refreshTokenHash
    );
    if (!isRefreshTokenValid) {
      throw new Error('Invalid refresh token');
    }

    const isRefreshTokenExpired = userSession.expiresAt < new Date();
    if (isRefreshTokenExpired) {
      throw new Error('Refresh token expired');
    }

    await trx
      .update(UserSessions)
      .set({
        usedAt: new Date(),
      })
      .where(eq(UserSessions.id, refreshTokenId))
      .execute();

    const user = await getUserById(userSession.userId);

    return createAccessAndRefreshToken(user);
  });
};

export const verifyLogin = async ({
  emailOrUsername,
  password,
}: {
  emailOrUsername: string;
  password: string;
}): Promise<User> => {
  // TODO-L This is vulnerable to timing attacks

  const [user] = await db
    .select()
    .from(Users)
    .where(
      or(eq(Users.email, emailOrUsername), eq(Users.username, emailOrUsername))
    );

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  return mapEntityToUser(user);
};
