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

export const Queue = pgTable('queue', {
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
