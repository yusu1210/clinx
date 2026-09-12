import { createApp } from './server.mjs';
const server = createApp();
server.listen(0, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${server.address().port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
