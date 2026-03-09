import { watch } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
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

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function shouldIgnore(relativePath, excludeList) {
  if (!relativePath || relativePath.startsWith('dist/') || relativePath === 'dist') {
    return true;
  }
  return excludeList.some((entry) => relativePath === entry || relativePath.startsWith(`${entry}/`));
}

async function copyTree(sourcePath, targetPath, excludeList, relativePath = '') {
  if (shouldIgnore(relativePath, excludeList)) {
    return;
  }

  const sourceStat = await stat(sourcePath);
  if (sourceStat.isDirectory()) {
    await mkdir(targetPath, { recursive: true });
    const entries = await readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      await copyTree(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name),
        excludeList,
        childRelativePath
      );
    }
    return;
  }

  await mkdir(path.dirname(targetPath), { recursive: true });
  await copyFile(sourcePath, targetPath);
}

async function fullBuild(sourceDir, distDir, excludeList) {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    await copyTree(
      path.join(sourceDir, entry.name),
      path.join(distDir, entry.name),
      excludeList,
      entry.name
    );
  }
}

async function syncPath(sourceDir, distDir, relativePath) {
  const sourcePath = path.join(sourceDir, relativePath);
  const distPath = path.join(distDir, relativePath);
  if (!(await exists(sourcePath))) {
    await rm(distPath, { recursive: true, force: true });
    console.log(`[dev] removed ${relativePath}`);
    return;
  }

  const sourceStat = await stat(sourcePath);
  if (sourceStat.isDirectory()) {
    await mkdir(distPath, { recursive: true });
    console.log(`[dev] mkdir ${relativePath}`);
    return;
  }

  await mkdir(path.dirname(distPath), { recursive: true });
  await copyFile(sourcePath, distPath);
  console.log(`[dev] synced ${relativePath}`);
}

async function main() {
  const config = await readConfig();
  const sourceDir = path.resolve(rootDir, config.sourceDir || '.');
  const distDir = path.resolve(rootDir, config.distDir || 'dist');
  const excludeList = config.exclude || [];

  await fullBuild(sourceDir, distDir, excludeList);
  console.log(`[dev] watching ${sourceDir}`);
  console.log('[dev] rebuilds dist/ automatically; Chrome extension reload still requires browser-side reload.');
  console.log('[dev] for near-hot-reload, keep chrome://extensions open and click Reload on the dist extension, or use an extension reloader helper.');

  const timers = new Map();
  const watcher = watch(sourceDir, { recursive: true }, (eventType, filename) => {
    if (!filename) {
      return;
    }

    const relativePath = String(filename).replaceAll('\\', '/');
    if (shouldIgnore(relativePath, excludeList)) {
      return;
    }

    clearTimeout(timers.get(relativePath));
    timers.set(relativePath, setTimeout(async () => {
      try {
        await syncPath(sourceDir, distDir, relativePath);
      } catch (error) {
        console.error(`[dev] failed syncing ${relativePath}`);
        console.error(error);
      }
    }, 80));
  });

  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('[dev] failed');
  console.error(error);
  process.exitCode = 1;
});
