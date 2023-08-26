import mysql from "mysql2";
import dotenv from 'dotenv';
import {drizzle} from "drizzle-orm/mysql2";
import {migrate} from "drizzle-orm/mysql2/migrator";

dotenv.config();

const connection  = mysql.createConnection({
  host: process.env.DATABASE_HOST || '',
  user: process.env.DATABASE_USER || '',
  database: process.env.DATABASE_NAME || '',
  password: process.env.DATABASE_PASSWORD || '',
  port: parseInt(process.env.DATABASE_PORT || '3306')
});

const db = drizzle(connection);

migrate(db, { migrationsFolder: './drizzle' }).then(() => {
  console.log("Migration complete")
    process.exit(0)
}).catch((err) => {
  console.error(err)
    process.exit(1)
})

