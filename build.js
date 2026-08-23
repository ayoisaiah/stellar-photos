import { cp, rm } from 'node:fs/promises';

await rm('dist', { force: true, recursive: true });
await cp('src', 'dist', { recursive: true });

console.log('Built extension in dist');
