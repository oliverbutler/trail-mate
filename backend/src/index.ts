import fastify from 'fastify'
// import { migrate } from 'drizzle-orm/mysql2/migrator';
// import { drizzle } from "drizzle-orm/mysql2";
// import mysql from "mysql2";
import dotenv from 'dotenv';

dotenv.config();


const server = fastify()

const { HOST = 'localhost', PORT = '3000', API_PREFIX = "" } = process.env;

// const connection  = mysql.createConnection({
//   host: process.env.DATABASE_HOST || '',
//   user: process.env.DATABASE_USER || '',
//   database: process.env.DATABASE_NAME || '',
//   password: process.env.DATABASE_PASSWORD || '',
//   port: parseInt(process.env.DATABASE_PORT || '3306')
// });
//
// const db = drizzle(connection);



server.register((app, _, done) => {
  app.get("/health", async (request, reply) => {

    console.log("GET /health")
    return {
      status: "ok",
      uptime: process.uptime(),
    }
  })

  app.get('/tracks', async (request, reply) => {
    console.log("GET /tracks")

    return [
      {
        id: 1,
        title: 'Some track',
      },
    ]
  })

  done()

}, {
  prefix: API_PREFIX
})

server.listen({ port: parseInt(PORT), host: HOST, path: "/v1"  }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }




  console.log(`Server listening at ${address}`)
})
