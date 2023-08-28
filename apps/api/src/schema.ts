import { pgTable, varchar } from 'drizzle-orm/pg-core';
import cuid from 'cuid';

export const Tracks = pgTable('tracks', {
  id: varchar('id', { length: 36 })
    .primaryKey()
    .$defaultFn(() => cuid()),
  name: varchar('name', { length: 255 }).notNull(),
});
