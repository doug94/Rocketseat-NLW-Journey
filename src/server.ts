import fastify from "fastify";

const app = fastify();

app.get('/teste', () => 'Hello World');

app.listen({ port: 3333 }).then(() => console.log("Server is running!"));