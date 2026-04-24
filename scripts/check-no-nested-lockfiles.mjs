import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const rootPackageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
const workspaceEntries = Array.isArray(rootPackageJson.workspaces)
  ? rootPackageJson.workspaces
  : Array.isArray(rootPackageJson.workspaces?.packages)
    ? rootPackageJson.workspaces.packages
    : [];

const nestedLockfiles = workspaceEntries
  .filter((entry) => typeof entry === 'string' && !/[*?[{]/.test(entry))
  .map((entry) => resolve(rootDir, entry, 'package-lock.json'))
  .filter((lockfilePath) => existsSync(lockfilePath));

if (nestedLockfiles.length > 0) {
  console.error('Nested package-lock.json files are not allowed.');
  console.error('Use the root package-lock.json as the single source of truth.');
  for (const lockfilePath of nestedLockfiles) {
    console.error(`- ${relative(rootDir, lockfilePath)}`);
  }
  process.exit(1);
}
