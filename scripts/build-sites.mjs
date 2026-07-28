import { mkdir, writeFile } from 'node:fs/promises';

const outputDirectory = new URL('../dist/server/', import.meta.url);

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  new URL('index.js', outputDirectory),
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || url.pathname.includes('.')) return response;
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  }
};
`,
  'utf8'
);
