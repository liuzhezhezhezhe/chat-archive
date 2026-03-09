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

function shouldIgnore(relativePath, excludeList) {
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

async function build() {
  const config = await readConfig();
  const sourceDir = path.resolve(rootDir, config.sourceDir || '.');
  const distDir = path.resolve(rootDir, config.distDir || 'dist');
  const excludeList = config.exclude || [];

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

  console.log(`[build] copied ${sourceDir} -> ${distDir}`);
  console.log('[build] load the unpacked extension from dist/');
}

build().catch((error) => {
  console.error('[build] failed');
  console.error(error);
  process.exitCode = 1;
});
