import { config } from './config/env.js';
import app from './app.js';

const port = config.port;

app.listen(port, () => {
  console.log(`SarthiX backend running on port ${port}`);
});
