import { App } from '@/app';
import { ValidateEnv } from '@utils/validateEnv';
import { FarcasterRoute } from './routes/farcaster.route';

ValidateEnv();

const app = new App([
  new FarcasterRoute(),
]);

app.listen();
