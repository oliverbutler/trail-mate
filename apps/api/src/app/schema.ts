import {
  pgTable,
  varchar,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  serial,
} from 'drizzle-orm/pg-core';
import cuid from 'cuid';
import { sql } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import type { UserId, UserSessionId } from '@trail-mate/api-types';

export const generateUserId = () => `u_${cuid()}` as UserId;
export const generateUserSessionId = () => `us_${cuid()}` as UserSessionId;

export const Tracks = pgTable('tracks', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => cuid()),
  name: varchar('name', { length: 255 }).notNull(),
});

export const statusEnum = pgEnum('status', [
  'pending',
  'failed',
  'completed',
] as const);

export const Queue = pgTable('queues', {
  id: serial('id').primaryKey(),
  status: statusEnum('status')
    .notNull()
    .default('pending' as const),
  tryCount: integer('try_count').notNull().default(0),
  maxTries: integer('max_tries').notNull().default(5),
  payload: jsonb('payload').notNull().default({}),
  createTime: timestamp('create_time')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updateTime: timestamp('update_time')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const Users = pgTable('users', {
  id: varchar('id').notNull().primaryKey().$defaultFn(generateUserId),
  givenName: varchar('given_name').notNull(),
  familyName: varchar('family_name').notNull(),
  email: varchar('email').notNull(),
  emailVerifiedAt: timestamp('email_verified_at'),
  emailVerificationToken: varchar('email_verification_token')
    .$defaultFn(() => randomBytes(32).toString('hex'))
    .notNull(),
  username: varchar('username').notNull(),
  passwordHash: varchar('password_hash').notNull(),
});

export const UserSessions = pgTable('user_sessions', {
  id: varchar('id').notNull().primaryKey().$defaultFn(generateUserSessionId),
  userId: varchar('user_id')
    .notNull()
    .references(() => Users.id),
  refreshTokenHash: varchar('refresh_token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  /**
   * The time the refresh token was used to generate a new access token.
   */
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
