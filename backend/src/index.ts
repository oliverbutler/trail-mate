import fastify from 'fastify'

const server = fastify()

const { HOST = 'localhost', PORT = '3000' } = process.env;


server.get('/tracks', async (request, reply) => {
  return [
    {
      id: 1,
      title: 'Some track',
    }
  ]
})

server.listen({ port: parseInt(PORT), host: HOST }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }

  console.log(`Server listening at ${address}`)
})
