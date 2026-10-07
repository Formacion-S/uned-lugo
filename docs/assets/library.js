(() => {
  'use strict';
  const API = window.UNED_LUGO_LIBRARY_API_BASE;
  const INITIAL_MANIFEST = window.UNED_LUGO_INITIAL_LIBRARY_MANIFEST;
  const CATALOG = window.UNED_LUGO_LIBRARY_CATALOG;
  const TOKEN_KEY = 'unedLugoLibraryOwner.v1';
  const MAX_BYTES = 20 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp', 'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods']);
  const q = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const status = (message, isError = false) => { const element = q('#libraryStatus'); element.textContent = message; element.className = `status ${isError ? 'error' : 'ok'}`; };
  const toBase64Url = bytes => { let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };
  const makeToken = () => { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); return toBase64Url(bytes); };
  let memoryToken;
  let warnedStorage = false;
  const token = () => {
    if (memoryToken) return memoryToken;
    try {
      const current = localStorage.getItem(TOKEN_KEY);
      if (current && /^[A-Za-z0-9_-]{43}$/.test(current)) return (memoryToken = current);
      const next = makeToken(); localStorage.setItem(TOKEN_KEY, next);
      if (localStorage.getItem(TOKEN_KEY) !== next) throw new Error('storage verification failed');
      return (memoryToken = next);
    } catch (_) {
      memoryToken = makeToken();
      if (!warnedStorage) { warnedStorage = true; const warning = document.createElement('p'); warning.className = 'notice'; warning.setAttribute('role', 'status'); warning.textContent = 'Este navegador no puede conservar tu identificador de biblioteca. Podrás aportar ahora, pero no podrás retirar tus aportes tras recargar.'; q('#libraryForm').before(warning); }
      return memoryToken;
    }
  };
  const request = (path = '', options = {}) => { const headers = new Headers(options.headers || {}); headers.set('Authorization', `Bearer ${token()}`); return fetch(`${API}${path}`, { ...options, headers, credentials: 'omit' }); };
  const responseJson = async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación de biblioteca.'); return body; };
  const extensionOf = filename => { const dot = String(filename).lastIndexOf('.'); return dot > 0 ? filename.slice(dot + 1).toLowerCase() : ''; };
  let items = [];
  let initialItems = [];
  const subjects = ACADEMIC_DATA.subjects;
  const subjectCodes = new Set(subjects.map(subject => subject.code));
  const subjectName = code => subjects.find(subject => subject.code === code)?.name || code;
  const render = () => {
    const filtered = CATALOG.filterItems(items, q('#libraryFilter').value, q('#librarySearch').value);
    q('#libraryList').innerHTML = filtered.length ? filtered.map(item => {
      const downloadUrl = item.source === 'initial' ? item.download_url : `${API}/${encodeURIComponent(item.id)}`;
      return `<li class="library-item"><div class="library-meta"><span class="badge">${escapeHtml(subjectName(item.subject_code))}</span><span>${item.source === 'initial' ? 'Colección inicial' : `Aportado por ${escapeHtml(item.uploader_alias)}`}</span><span>${escapeHtml(String(Math.ceil(item.size_bytes / 1024)))} KB</span></div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="library-actions"><a class="action secondary" href="${escapeHtml(downloadUrl)}" download="${escapeHtml(item.original_name)}">Descargar ${escapeHtml(item.original_name)}</a>${item.can_delete ? `<button class="action danger library-delete" data-library-delete="${escapeHtml(item.id)}" type="button">Retirar mi aporte</button>` : ''}</div></li>`;
    }).join('') : '<li class="empty">No hay apuntes que coincidan.</li>';
  };
  const loadInitial = async () => {
    if (!INITIAL_MANIFEST || !CATALOG) throw new Error('La colección inicial no está disponible.');
    const response = await fetch(INITIAL_MANIFEST, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo cargar la colección inicial.');
    initialItems = CATALOG.normalizeInitialItems(await response.json(), subjectCodes, document.baseURI);
    return initialItems;
  };
  const loadApi = async () => { if (!API) throw new Error('El servicio de aportes no está disponible.'); return CATALOG.normalizeApiItems(await responseJson(await request())); };
  const load = async () => {
    status('Actualizando biblioteca compartida…');
    const [initial, api] = await Promise.allSettled([loadInitial(), loadApi()]);
    items = CATALOG.mergeItems(initial.status === 'fulfilled' ? initial.value : initialItems, api.status === 'fulfilled' ? api.value : []);
    render();
    if (initial.status === 'rejected' && api.status === 'rejected') return status('No se pudo actualizar la biblioteca. Vuelve a intentarlo más tarde.', true);
    if (initial.status === 'rejected') return status('Los aportes compartidos están disponibles; la colección inicial no se pudo cargar.', true);
    if (api.status === 'rejected') return status('La colección inicial está disponible; los aportes nuevos no se pudieron cargar ahora.', true);
    status(items.length ? 'Biblioteca actualizada.' : 'Aún no hay apuntes compartidos.');
  };
  for (const subject of subjects) { const option = `<option value="${escapeHtml(subject.code)}">${escapeHtml(subject.name)}</option>`; q('#librarySubject').insertAdjacentHTML('beforeend', option); q('#libraryFilter').insertAdjacentHTML('beforeend', option); }
  q('#libraryForm').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const file = form.elements.file.files[0];
    if (!file) return status('Selecciona un archivo para compartir.', true);
    if (file.size > MAX_BYTES) return status('El archivo supera el máximo de 20 MB.', true);
    if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) return status('Ese tipo de archivo no está permitido.', true);
    const button = form.querySelector('button[type="submit"]'); button.disabled = true; status('Subiendo y verificando archivo…');
    try { await responseJson(await request('', { method: 'POST', body: new FormData(form) })); form.reset(); form.elements.alias.value = 'Compañero/a'; await load(); status('Apunte compartido. Puedes retirarlo desde este navegador.'); } catch (error) { status(error.message || 'No se pudo compartir el apunte.', true); } finally { button.disabled = false; }
  });
  document.addEventListener('click', async event => {
    if (event.target.closest('button[data-tab="biblioteca"]') || event.target.closest('#refreshLibrary')) load();
    const button = event.target.closest('[data-library-delete]');
    if (!button || !confirm('¿Retirar este apunte compartido?')) return;
    button.disabled = true;
    try { await responseJson(await request(`/${encodeURIComponent(button.dataset.libraryDelete)}`, { method: 'DELETE' })); await load(); status('Tu aporte se ha retirado.'); } catch (error) { status(error.message || 'No se pudo retirar el apunte.', true); } finally { button.disabled = false; }
  });
  q('#librarySearch').addEventListener('input', render);
  q('#libraryFilter').addEventListener('change', render);
})();
