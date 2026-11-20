import { handle } from 'hono/vercel';
import { app } from '../src/app';

export { app };
export default handle(app);
