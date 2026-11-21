import { build } from 'esbuild';

// NestJS lazily require()s these optional packages; they are never executed in
// this API (no microservices/websockets transports), so stub them at build time.
const OPTIONAL_STUBS = ['@nestjs/microservices', '@nestjs/websockets'];
const stubPlugin = {
  name: 'nest-optional-stubs',
  setup(b) {
    b.onResolve({ filter: /^@nestjs\/(microservices|websockets)(\/.*)?$/ }, (args) => ({
      path: args.path,
      namespace: 'stub',
    }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export default {};' }));
  },
};

await build({
  entryPoints: ['dist/worker.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  outfile: 'dist/worker.bundle.js',
  external: ['cloudflare:node', 'cloudflare:workers'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr('file:///worker.bundle.js');",
  },
  plugins: [stubPlugin],
  logLevel: 'warning',
});
console.log('bundle ok');
