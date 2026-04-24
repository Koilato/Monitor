import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CLIENT_SRC = path.resolve(process.cwd(), 'src');
const ALLOWED_CSS_IMPORT_FILES = new Set([
  path.join(CLIENT_SRC, 'main.tsx'),
  path.join(CLIENT_SRC, 'shell/app-entry.tsx'),
]);

function readRecursiveFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readRecursiveFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function extractCssImportLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('import ') && line.includes('.css'));
}

test('only the app entrypoints import css side effects', () => {
  const tsxFiles = readRecursiveFiles(CLIENT_SRC).filter((file) => file.endsWith('.tsx'));
  const cssImportViolations: Array<{ file: string; line: string }> = [];

  for (const file of tsxFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const cssImportLines = extractCssImportLines(source);

    if (cssImportLines.length === 0) {
      continue;
    }

    if (ALLOWED_CSS_IMPORT_FILES.has(file)) {
      continue;
    }

    for (const line of cssImportLines) {
      cssImportViolations.push({
        file: path.relative(CLIENT_SRC, file),
        line,
      });
    }
  }

  assert.deepEqual(cssImportViolations, []);
});

test('maplibre css is imported only from main.tsx', () => {
  const tsxFiles = readRecursiveFiles(CLIENT_SRC).filter((file) => file.endsWith('.tsx'));
  const filesWithMaplibreCss = tsxFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('maplibre-gl/dist/maplibre-gl.css'));

  assert.deepEqual(filesWithMaplibreCss, [path.join(CLIENT_SRC, 'main.tsx')]);
});
