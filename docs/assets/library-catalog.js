(() => {
  'use strict';
  const INITIAL_ID = /^initial-[a-z0-9-]+$/;
  const INITIAL_PATH = /^apuntes\/[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/;
  const SHA256 = /^[a-f0-9]{64}$/;
  const text = value => typeof value === 'string' && value.trim();
  const safeInitialPath = value => typeof value === 'string' && INITIAL_PATH.test(value);
  const normalizeInitialItems = (manifest, subjectCodes, baseUrl) => {
    if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.items)) throw new Error('El catálogo inicial no tiene el formato esperado.');
    const seen = new Set();
    return manifest.items.map(item => {
      if (!item || !INITIAL_ID.test(item.id) || seen.has(item.id) || !subjectCodes.has(item.subject_code) || !text(item.title) || !text(item.original_name) || !safeInitialPath(item.download_path) || !Number.isSafeInteger(item.size_bytes) || item.size_bytes < 1 || !SHA256.test(item.sha256)) throw new Error('El catálogo inicial contiene un archivo no válido.');
      seen.add(item.id);
      const url = new URL(item.download_path, baseUrl);
      if (url.origin !== new URL(baseUrl).origin) throw new Error('El catálogo inicial contiene una ruta no pública.');
      return { ...item, description: text(item.description) ? item.description : '', uploader_alias: 'Colección inicial', can_delete: false, download_url: url.href, source: 'initial' };
    });
  };
  const normalizeApiItems = data => Array.isArray(data?.items) ? data.items.filter(item => item && typeof item.id === 'string' && !item.id.startsWith('initial-') && text(item.title) && text(item.original_name) && text(item.subject_code)).map(item => ({ ...item, description: text(item.description) ? item.description : '', uploader_alias: text(item.uploader_alias) ? item.uploader_alias : 'Compañero/a', size_bytes: Number.isFinite(item.size_bytes) && item.size_bytes >= 0 ? item.size_bytes : 0, can_delete: item.can_delete === true || item.can_delete === 1, source: 'api' })) : [];
  const mergeItems = (initial, api) => [...initial, ...api];
  const filterItems = (items, subject, query) => {
    const needle = String(query || '').toLocaleLowerCase('es');
    return items.filter(item => (!subject || item.subject_code === subject) && (!needle || [item.title, item.description, item.original_name].join(' ').toLocaleLowerCase('es').includes(needle)));
  };
  window.UNED_LUGO_LIBRARY_CATALOG = { safeInitialPath, normalizeInitialItems, normalizeApiItems, mergeItems, filterItems };
})();
