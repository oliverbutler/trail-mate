import { int, mysqlEnum, mysqlTable, serial, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import cuid from "cuid"

export const tracks = mysqlTable("tracks", {
  id: varchar("id", {length: 36}).primaryKey().$defaultFn(() => cuid()),
  name: varchar("name", {length: 255}).notNull(),
});


