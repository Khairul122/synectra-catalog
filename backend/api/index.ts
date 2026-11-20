import { handle } from 'hono/vercel';
import { app } from '../src/app';

// @vercel/node treats a default-exported function as a Node (req, res) handler, which never
// answers a fetch-style Hono handler. Named HTTP-method exports use the Web Request/Response signature.
const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;

export { app };
