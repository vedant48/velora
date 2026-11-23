import 'reflect-metadata';
import express from 'express';
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
  const server = express();
  // Avatar upload arrives as raw image bytes; everything else is JSON.
  server.use('/api/users/me/avatar', express.raw({ type: () => true, limit: '512kb' }));
  server.use(express.json({ limit: '1mb' }));
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ['error', 'warn'],
    bodyParser: false,
  });
  app.setGlobalPrefix('api');
  app.enableCors();
  await app.listen(INTERNAL_PORT);
}

const PRIVACY_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Velora Privacy Policy</title></head>
<body style="max-width: 640px; margin: 24px auto; padding: 0 16px; font-family: system-ui, sans-serif; line-height: 1.55;">
<h1>Velora Privacy Policy</h1>
<p><em>Last updated: 22 November 2026</em></p>

<h2>What Velora stores</h2>
<p>Velora is a personal movie and TV tracker. When you create an account we store:</p>
<ul>
  <li>Your username, display name and bio.</li>
  <li>Your profile photo, if you upload one. You can replace or remove it at any time, and it is deleted with your account.</li>
  <li>If you sign up with a password: a salted PBKDF2 hash of your password (never the password itself).</li>
  <li>If you sign in with Google: your Google account ID, email address and display name, as returned by Google after you consent.</li>
  <li>The titles you track (status, ratings, episode progress) and the reviews you write.</li>
  <li>Who you follow and who follows you.</li>
</ul>

<h2>What other members can see</h2>
<p>Velora is a social tracker. Other signed-in members can see your public profile: username, display name, bio, profile photo, library statistics, the titles in your library, your ratings and reviews, and your follower/following counts. Profiles are public-by-default; you can switch on a private account in Settings, after which only you can see your library and library statistics. Reviews you have written remain visible to other members even with a private account.</p>

<h2>Who processes your data</h2>
<p>We do not sell your data and we do not share it with advertisers. Running Velora involves these processors:</p>
<ul>
  <li><strong>Cloudflare</strong> hosts the Velora API and database (Workers + D1). Your account and library data is stored there.</li>
  <li><strong>Google</strong> handles Google sign-in; Google receives the sign-in request and shares your basic profile (ID, email, name) with us after you consent.</li>
  <li><strong>TMDB</strong> provides movie and TV metadata (titles, posters, episode info). Metadata requests go through Velora's metadata proxy; your account data is not sent to TMDB.</li>
  <li><strong>SIMKL</strong>: Velora can generate a SIMKL-compatible CSV export of your library from your account data. Downloading an export does not send anything to SIMKL. If you choose to import the file into SIMKL yourself, that use is governed by your SIMKL account's terms.</li>
</ul>

<h2>Export and deletion</h2>
<p>You can export your library at any time from Settings, as Velora JSON or SIMKL-compatible CSV.</p>
<p>You can delete your account at any time from Settings. Deletion permanently removes your account, library, reviews and follows. Deleted accounts cannot be recovered.</p>

<h2>Changes and shutdown</h2>
<p>If the service changes significantly or shuts down, we will try to give reasonable advance notice and a chance to export your data. This is a best-effort commitment, not a guarantee.</p>

<h2>Contact</h2>
<p>Email: vedantkumar48@gmail.com</p>
</body></html>`;

const TERMS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Velora Terms of Service</title></head>
<body style="max-width: 640px; margin: 24px auto; padding: 0 16px; font-family: system-ui, sans-serif; line-height: 1.55;">
<h1>Velora Terms of Service</h1>
<p><em>Last updated: 21 November 2026</em></p>

<h2>The service</h2>
<p>Velora is a free personal tracker for movies and TV shows, provided as-is and as-available, without warranties of any kind. It is a hobby-scale service: availability, features and data retention are best-effort, not guaranteed.</p>

<h2>Your account and content</h2>
<ul>
  <li>You must be at least 18 years old to use Velora.</li>
  <li>You keep ownership of the reviews and ratings you write. You grant Velora a license to store and display them to other members as part of the service.</li>
  <li>Your library and library statistics are visible to other signed-in members unless you switch on a private account in Settings. Your profile basics (username, display name, bio) and the reviews you write remain visible to other members even with a private account. Do not post content you do not have the right to share, or anything unlawful, harassing or spam.</li>
  <li>Do not abuse the service: no scraping of the API at disruptive rates, no attempting to access other users' private data, no automated account creation.</li>
</ul>

<h2>Third-party content</h2>
<p>Title metadata and artwork come from TMDB; this app is not endorsed by TMDB. Velora can generate a SIMKL-compatible CSV export of your library from your account data; downloading it does not send data to SIMKL. If you import that file into SIMKL yourself, your SIMKL account's terms apply. Google sign-in is governed by Google's terms.</p>

<h2>Suspension and termination</h2>
<p>We may suspend accounts that break these rules. You can stop using Velora at any time and can export or delete your account in Settings; see the Privacy Policy for details.</p>

<h2>Changes</h2>
<p>These terms may change; the current version is always at this URL.</p>

<h2>Contact</h2>
<p>Email: vedantkumar48@gmail.com</p>
</body></html>`;

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
