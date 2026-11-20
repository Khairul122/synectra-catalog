import { handle } from 'hono/vercel';
import { app } from '@/app';

export { app };
export default handle(app);
