import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { handleAsNodeRequest } from 'cloudflare:node';
import { AppModule } from './app.module';
import { Env, setEnv } from './env';

// Arbitrary high port: in Workers, listen() registers the server in the
// runtime's internal table instead of binding a socket, and
// handleAsNodeRequest routes fetches to it by port number.
const INTERNAL_PORT = 8787;

let bootPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(INTERNAL_PORT);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    setEnv(env);
    if (!bootPromise) {
      // Bootstrap once per isolate; reset on failure so the next request retries.
      bootPromise = bootstrap().catch((err) => {
        bootPromise = null;
        throw err;
      });
    }
    await bootPromise;
    return handleAsNodeRequest(INTERNAL_PORT, request);
  },
};
