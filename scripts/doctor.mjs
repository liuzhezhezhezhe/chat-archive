import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function ok(message) {
  console.log(`[doctor] OK: ${message}`);
}

function warn(message) {
  console.warn(`[doctor] WARN: ${message}`);
}

function fail(message) {
  console.error(`[doctor] FAIL: ${message}`);
}

async function fileExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  const content = await readFile(fullPath, 'utf8');
  return JSON.parse(content);
}

async function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0] || '0');
  if (major < 20) {
    throw new Error(`Node.js >= 20 required, current: ${process.versions.node}`);
  }
  ok(`Node.js version ${process.versions.node}`);
}

async function checkRequiredFiles() {
  const required = [
    'manifest.json',
    'chat-archive.config.json',
    'package.json',
    'src/background.js',
    'src/content.js',
    'popup/popup.html',
    'options/options.html'
  ];

  for (const relativePath of required) {
    if (!(await fileExists(path.join(rootDir, relativePath)))) {
      throw new Error(`missing required file: ${relativePath}`);
    }
  }

  ok('Required project files exist');
}

async function checkManifestAndConfig() {
  const manifest = await readJson('manifest.json');
  const config = await readJson('chat-archive.config.json');

  if (!manifest.manifest_version || manifest.manifest_version !== 3) {
    throw new Error('manifest_version must be 3');
  }
  if (!manifest.action?.default_popup) {
    throw new Error('manifest default_popup missing');
  }
  if (!manifest.options_page) {
    throw new Error('manifest options_page missing');
  }
  if (!Array.isArray(config.exclude)) {
    throw new Error('config.exclude must be an array');
  }

  ok(`Manifest version ${manifest.version || 'unknown'} and config are valid`);
}

async function checkDistState() {
  const config = await readJson('chat-archive.config.json');
  const distDir = path.join(rootDir, config.distDir || 'dist');
  if (await fileExists(distDir)) {
    ok(`dist directory exists: ${distDir}`);
  } else {
    warn(`dist directory missing: ${distDir}; run npm run build`);
  }
}

async function checkZipAvailability() {
  try {
    await execFileAsync('zip', ['-v']);
    ok('zip command is available for packaging');
  } catch {
    warn('zip command not found; npm run package will fail until zip is installed');
  }
}

async function main() {
  await checkNodeVersion();
  await checkRequiredFiles();
  await checkManifestAndConfig();
  await checkDistState();
  await checkZipAvailability();
  ok('Doctor check finished');
}

main().catch((error) => {
  fail(error.message || String(error));
  process.exitCode = 1;
});
