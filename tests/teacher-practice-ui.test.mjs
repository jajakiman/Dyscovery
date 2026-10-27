import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const path = new URL('../src/app/auth/mode-test/teacher-practice.tsx', import.meta.url);
assert.ok(existsSync(path), 'Teacher practice low-fi UI is missing');
const code = ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), loaded, loaded.exports);
const html = renderToStaticMarkup(createElement(loaded.exports.TeacherPractice, { sessionId: '90000000-0000-4000-8000-000000000001' }));
assert.ok(html.includes('Baca respons latihan'));
assert.ok(html.includes('value="90000000-0000-4000-8000-000000000001"'));
assert.ok(html.includes('Belum ada respons yang dimuat.'));
assert.ok(html.includes('role="status"'));
console.log('Teacher practice initial UI render passed; browser interactions still require manual testing');
