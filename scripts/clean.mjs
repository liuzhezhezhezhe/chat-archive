import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readConfig() {
  const configPath = path.join(rootDir, 'chat-archive.config.json');
  const content = await readFile(configPath, 'utf8');
  return JSON.parse(content);
}

async function main() {
  const config = await readConfig();
  const distDir = path.resolve(rootDir, config.distDir || 'dist');
  const packageDir = path.resolve(rootDir, config.packageDir || 'release');

  await rm(distDir, { recursive: true, force: true });
  await rm(packageDir, { recursive: true, force: true });

  console.log(`[clean] removed ${distDir}`);
  console.log(`[clean] removed ${packageDir}`);
}

main().catch((error) => {
  console.error('[clean] failed');
  console.error(error);
  process.exitCode = 1;
});
