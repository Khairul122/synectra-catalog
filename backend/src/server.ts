import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { app } from './app';

async function readBody(request: IncomingMessage): Promise<Uint8Array | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function createLocalServer(): Server {
  return createServer(async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const body = await readBody(request);
      const url = new URL(request.url ?? '/', 'http://localhost');
      const headers = new Headers();

      for (const [name, value] of Object.entries(request.headers)) {
        if (Array.isArray(value)) {
          headers.set(name, value.join(', '));
        } else if (value !== undefined) {
          headers.set(name, value);
        }
      }

      const result = await app.fetch(
        new Request(url, {
          method: request.method,
          headers,
          body: body as BodyInit | undefined,
        }),
      );

      const resultBody = Buffer.from(await result.arrayBuffer());
      const resultHeaders: Record<string, string> = {};
      result.headers.forEach((value, name) => {
        resultHeaders[name] = value;
      });

      response.writeHead(result.status, resultHeaders);
      response.end(resultBody);
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : 'Internal server error');
    }
  });
}
