(() => {
  'use strict';
  const API = window.UNED_LUGO_LIBRARY_API_BASE;
  const TOKEN_KEY = 'unedLugoLibraryOwner.v1';
  const MAX_BYTES = 20 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = new Set(['pdf', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp', 'docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods']);
  const q = selector => document.querySelector(selector);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const status = (message, isError = false) => {
    const element = q('#libraryStatus');
    element.textContent = message;
    element.className = `status ${isError ? 'error' : 'ok'}`;
  };
  const toBase64Url = bytes => {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const makeToken = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
  };
  let memoryToken;
  let warnedStorage = false;
  const token = () => {
    if (memoryToken) return memoryToken;
    try {
      const current = localStorage.getItem(TOKEN_KEY);
      if (current && /^[A-Za-z0-9_-]{43}$/.test(current)) return (memoryToken = current);
      const next = makeToken();
      localStorage.setItem(TOKEN_KEY, next);
      if (localStorage.getItem(TOKEN_KEY) !== next) throw new Error('storage verification failed');
      return (memoryToken = next);
    } catch (_) {
      memoryToken = makeToken();
      if (!warnedStorage) {
        warnedStorage = true;
        const warning = document.createElement('p');
        warning.className = 'notice';
        warning.setAttribute('role', 'status');
        warning.textContent = 'Este navegador no puede conservar tu identificador de biblioteca. Podrás aportar ahora, pero no podrás retirar tus aportes tras recargar.';
        q('#libraryForm').before(warning);
      }
      return memoryToken;
    }
  };
  const request = (path = '', options = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token()}`);
    return fetch(`${API}${path}`, { ...options, headers, credentials: 'omit' });
  };
  const responseJson = async response => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación de biblioteca.');
    return body;
  };
  const extensionOf = filename => {
    const dot = String(filename).lastIndexOf('.');
    return dot > 0 ? filename.slice(dot + 1).toLowerCase() : '';
  };
  let items = [];
  const subjects = ACADEMIC_DATA.subjects;
  const subjectName = code => subjects.find(subject => subject.code === code)?.name || code;
  const render = () => {
    const subject = q('#libraryFilter').value;
    const search = q('#librarySearch').value.toLocaleLowerCase('es');
    const filtered = items.filter(item => (!subject || item.subject_code === subject) && (!search || [item.title, item.description, item.original_name].join(' ').toLocaleLowerCase('es').includes(search)));
    q('#libraryList').innerHTML = filtered.length ? filtered.map(item => {
      const downloadUrl = `${API}/${encodeURIComponent(item.id)}`;
      return `<li class="library-item"><div class="library-meta"><span class="badge">${escapeHtml(subjectName(item.subject_code))}</span><span>Aportado por ${escapeHtml(item.uploader_alias)}</span><span>${escapeHtml(String(Math.ceil(item.size_bytes / 1024)))} KB</span></div><h3>${escapeHtml(item.title)}</h3>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<div class="library-actions"><a class="action secondary" href="${downloadUrl}">Descargar ${escapeHtml(item.original_name)}</a>${item.can_delete ? `<button class="action danger library-delete" data-library-delete="${escapeHtml(item.id)}" type="button">Retirar mi aporte</button>` : ''}</div></li>`;
    }).join('') : '<li class="empty">No hay apuntes que coincidan.</li>';
  };
  const load = async () => {
    if (!API) return status('La configuración de biblioteca no está disponible.', true);
    status('Actualizando biblioteca compartida…');
    try {
      const data = await responseJson(await request());
      items = Array.isArray(data.items) ? data.items : [];
      render();
      status(items.length ? 'Biblioteca actualizada.' : 'Aún no hay apuntes compartidos.');
    } catch (error) {
      status(error.message || 'No se pudo cargar la biblioteca.', true);
    }
  };
  for (const subject of subjects) {
    const option = `<option value="${escapeHtml(subject.code)}">${escapeHtml(subject.name)}</option>`;
    q('#librarySubject').insertAdjacentHTML('beforeend', option);
    q('#libraryFilter').insertAdjacentHTML('beforeend', option);
  }
  q('#libraryForm').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.elements.file.files[0];
    if (!file) return status('Selecciona un archivo para compartir.', true);
    if (file.size > MAX_BYTES) return status('El archivo supera el máximo de 20 MB.', true);
    if (!ALLOWED_EXTENSIONS.has(extensionOf(file.name))) return status('Ese tipo de archivo no está permitido.', true);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status('Subiendo y verificando archivo…');
    try {
      await responseJson(await request('', { method: 'POST', body: new FormData(form) }));
      form.reset();
      form.elements.alias.value = 'Compañero/a';
      await load();
      status('Apunte compartido. Puedes retirarlo desde este navegador.');
    } catch (error) {
      status(error.message || 'No se pudo compartir el apunte.', true);
    } finally {
      button.disabled = false;
    }
  });
  document.addEventListener('click', async event => {
    const tab = event.target.closest('button[data-tab="biblioteca"]');
    if (tab) load();
    const refresh = event.target.closest('#refreshLibrary');
    if (refresh) load();
    const button = event.target.closest('[data-library-delete]');
    if (!button || !confirm('¿Retirar este apunte compartido?')) return;
    button.disabled = true;
    try {
      await responseJson(await request(`/${encodeURIComponent(button.dataset.libraryDelete)}`, { method: 'DELETE' }));
      await load();
      status('Tu aporte se ha retirado.');
    } catch (error) {
      status(error.message || 'No se pudo retirar el apunte.', true);
    } finally {
      button.disabled = false;
    }
  });
  q('#librarySearch').addEventListener('input', render);
  q('#libraryFilter').addEventListener('change', render);
})();
