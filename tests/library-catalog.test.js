const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {}, URL };
vm.runInNewContext(fs.readFileSync('docs/assets/library-catalog.js', 'utf8'), context);
const catalog = context.window.UNED_LUGO_LIBRARY_CATALOG;
const subjects = new Set(['71031010']);
const manifest = { version: 1, items: [{ id: 'initial-71031010-apuntes', subject_code: '71031010', title: 'Apuntes desde cero', original_name: 'apuntes.pdf', download_path: 'apuntes/apuntes.pdf', size_bytes: 10, sha256: 'a'.repeat(64) }] };

const initial = catalog.normalizeInitialItems(manifest, subjects, 'https://example.test/uned-lugo/');
assert.equal(initial[0].download_url, 'https://example.test/uned-lugo/apuntes/apuntes.pdf');
assert.equal(initial[0].can_delete, false);
const zip = catalog.normalizeInitialItems({ version: 1, items: [{ ...manifest.items[0], id: 'initial-code-examples', original_name: 'ejemplos.zip', download_path: 'apuntes/ejemplos.zip' }] }, subjects, 'https://example.test/uned-lugo/');
assert.equal(zip[0].download_url, 'https://example.test/uned-lugo/apuntes/ejemplos.zip');
assert.throws(() => catalog.normalizeInitialItems({ version: 1, items: [{ ...manifest.items[0], download_path: 'apuntes/programa.exe' }] }, subjects, 'https://example.test/uned-lugo/'));
assert.throws(() => catalog.normalizeInitialItems({ version: 1, items: [{ ...manifest.items[0], download_path: 'https://other.test/file.pdf' }] }, subjects, 'https://example.test/uned-lugo/'));
assert.throws(() => catalog.normalizeInitialItems({ version: 1, items: [{ ...manifest.items[0], download_path: 'apuntes/../other.pdf' }] }, subjects, 'https://example.test/uned-lugo/'));

const api = catalog.normalizeApiItems({ items: [{ id: 'remote-1', subject_code: '71031010', title: 'Aporte', original_name: 'aporte.pdf', size_bytes: 20, can_delete: 1, download_url: 'https://untrusted.test/file.pdf' }, { id: 'initial-71031010-apuntes', subject_code: '71031010', title: 'No sustituye', original_name: 'bad.pdf' }] });
assert.equal(api.length, 1);
assert.equal(api[0].can_delete, true);
const merged = catalog.mergeItems(initial, api);
assert.deepEqual(Array.from(catalog.filterItems(merged, '71031010', 'aporte'), item => item.id), ['remote-1']);
assert.deepEqual(Array.from(catalog.filterItems(merged, '', 'desde cero'), item => item.id), ['initial-71031010-apuntes']);
console.log('library-catalog tests passed');
