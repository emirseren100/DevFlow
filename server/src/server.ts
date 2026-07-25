import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`DevFlow API listening on http://localhost:${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
  console.log(`Allowed client origin: ${config.clientOrigin}`);
});
