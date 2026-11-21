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

const PRIVACY_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Velora Privacy Policy</title><style>body{font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#ddd;background:#141414;line-height:1.6}h1{color:#fff}</style></head><body><h1>Velora Privacy Policy</h1><p>Velora is a personal movie and TV tracking app. When you create an account we store your username or Google account identifier, your library entries, ratings, reviews, and follows so they can sync across your devices and be shared with other users you choose to follow. We do not sell, rent, or share your data with third parties, and we show no ads and run no analytics trackers. Authentication passwords are stored only as salted hashes; Google sign-in is verified directly with Google. You can export your data from the app at any time and request deletion of your account and all associated data by contacting vedantkumar48@gmail.com. Data is hosted on Cloudflare Workers and D1.</p><p>Last updated: November 2026.</p></body></html>`;

const TERMS_HTML = PRIVACY_HTML.replace('<title>Velora Privacy Policy</title>', '<title>Velora Terms of Service</title>').replace('<h1>Velora Privacy Policy</h1>', '<h1>Velora Terms of Service</h1>').replace(/<p>Velora is[\s\S]*?<\/p>/, '<p>Velora is provided as-is, free of charge, for personal movie and TV tracking. Do not abuse the service, attempt to access other users\' data, or use it for unlawful purposes. We may suspend accounts that abuse the service. Content metadata comes from TMDB and SIMKL; this app is not endorsed by them. The service may change or shut down with reasonable notice.</p>');

function htmlResponse(html: string): Response {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    setEnv(env);
    const path = new URL(request.url).pathname;
    if (path === '/privacy') return htmlResponse(PRIVACY_HTML);
    if (path === '/terms') return htmlResponse(TERMS_HTML);
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
