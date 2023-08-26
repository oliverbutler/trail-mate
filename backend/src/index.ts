import fastify from 'fastify'
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import dotenv from 'dotenv';

dotenv.config();


const server = fastify()

const { HOST = 'localhost', PORT = '3000' } = process.env;

const connection  = mysql.createConnection({
  host: process.env.DATABASE_HOST || '',
  user: process.env.DATABASE_USER || '',
  database: process.env.DATABASE_NAME || '',
  password: process.env.DATABASE_PASSWORD || '',
  port: parseInt(process.env.DATABASE_PORT || '3306')
});

const db = drizzle(connection);

server.get('/tracks', async (request, reply) => {
  return [
    {
      id: 1,
      title: 'Some track',
    },
  ]
})



server.listen({ port: parseInt(PORT), host: HOST }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }




  console.log(`Server listening at ${address}`)
})
