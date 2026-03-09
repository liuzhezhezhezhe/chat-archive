import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function readConfig() {
  const configPath = path.join(rootDir, 'chat-archive.config.json');
  const content = await readFile(configPath, 'utf8');
  return JSON.parse(content);
}

async function readManifestVersion() {
  const manifestPath = path.join(rootDir, 'manifest.json');
  const content = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(content);
  return manifest.version || '0.0.0';
}

async function buildDist() {
  const buildScript = path.join(rootDir, 'scripts', 'build.mjs');
  await execFileAsync(process.execPath, [buildScript], { cwd: rootDir });
}

async function main() {
  const config = await readConfig();
  const distDir = path.resolve(rootDir, config.distDir || 'dist');
  const packageDir = path.resolve(rootDir, config.packageDir || 'release');
  const baseName = config.packageBaseName || 'chat-archive';
  const version = await readManifestVersion();
  const archivePath = path.join(packageDir, `${baseName}-v${version}.zip`);

  await buildDist();
  await mkdir(packageDir, { recursive: true });
  await rm(archivePath, { force: true });

  await execFileAsync('zip', ['-r', archivePath, '.'], { cwd: distDir });
  console.log(`[package] created ${archivePath}`);
}

main().catch((error) => {
  console.error('[package] failed');
  console.error(error);
  process.exitCode = 1;
});
