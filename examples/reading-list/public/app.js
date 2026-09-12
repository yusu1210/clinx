const $ = (id) => document.getElementById(id);
let token = sessionStorage.getItem('reading-room-demo-code') ?? '';
let role = null;
let identityVersion = 0;
let listVersion = 0;
function feedback(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle('error', error);
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(
      'Cannot reach the local server. Check that it is running, then refresh the list before retrying a save.',
    );
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'The request could not be completed.');
  return data;
}
function renderBooks(books) {
  $('books').replaceChildren();
  $('count').textContent = String(books.length);
  $('empty').hidden = books.length > 0;
  for (const book of books) {
    const row = document.createElement('li');
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = book.title;
    const author = document.createElement('p');
    author.textContent = `by ${book.author}`;
    copy.append(title, author);
    const action = document.createElement('div');
    action.className = 'book-action';
    const state = document.createElement('span');
    state.className = `badge ${book.read ? 'read' : ''}`;
    state.textContent = book.read ? 'Read' : 'To read';
    action.append(state);
    if (role === 'librarian' && !book.read) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quiet';
      button.textContent = 'Mark as read';
      button.setAttribute('aria-label', `Mark ${book.title} as read`);
      button.addEventListener('click', async () => {
        const identity = identityVersion;
        button.disabled = true;
        feedback('list-feedback', 'Saving read status…');
        try {
          await api(`/api/books/${book.id}/read`, {
            method: 'PATCH',
            body: JSON.stringify({ read: true }),
          });
          if (identity !== identityVersion) return;
          await loadBooks(`“${book.title}” marked as read.`);
        } catch (error) {
          if (identity !== identityVersion) return;
          feedback('list-feedback', error.message, true);
          button.disabled = false;
        }
      });
      action.append(button);
    }
    row.append(copy, action);
    $('books').append(row);
  }
}
async function loadBooks(success = '') {
  const identity = identityVersion;
  const request = ++listVersion;
  const current = () => identity === identityVersion && request === listVersion;
  $('refresh').disabled = true;
  $('books').setAttribute('aria-busy', 'true');
  feedback('list-feedback', 'Loading reading list…');
  try {
    const { books } = await api('/api/books');
    if (!current()) return;
    renderBooks(books);
    feedback('list-feedback', success || 'Reading list is up to date.');
  } catch (error) {
    if (current()) feedback('list-feedback', error.message, true);
  } finally {
    if (current()) {
      $('refresh').disabled = false;
      $('books').setAttribute('aria-busy', 'false');
    }
  }
}
async function login() {
  const identity = ++identityVersion;
  $('login-button').disabled = true;
  feedback('login-feedback', 'Checking demo access code…');
  try {
    const session = await api('/api/session');
    if (identity !== identityVersion) return;
    role = session.role;
    sessionStorage.setItem('reading-room-demo-code', token);
    $('role').textContent = role;
    $('role-hint').textContent =
      role === 'reader'
        ? 'Readers recommend books. The librarian updates read status.'
        : 'As librarian, you can mark recommendations as read.';
    $('identity').hidden = true;
    $('room').hidden = false;
    $('access-code').value = '';
    feedback('login-feedback', '');
    await loadBooks();
    if (identity === identityVersion) $('title').focus();
  } catch (error) {
    if (identity !== identityVersion) return;
    token = '';
    sessionStorage.removeItem('reading-room-demo-code');
    feedback('login-feedback', error.message, true);
  } finally {
    if (identity === identityVersion) $('login-button').disabled = false;
  }
}
$('login-form').addEventListener('submit', (event) => {
  event.preventDefault();
  token = $('access-code').value.trim();
  if (!token)
    return feedback(
      'login-feedback',
      'Enter the demo access code printed in the server terminal.',
      true,
    );
  login();
});
$('logout').addEventListener('click', () => {
  identityVersion++;
  listVersion++;
  token = '';
  role = null;
  sessionStorage.removeItem('reading-room-demo-code');
  $('room').hidden = true;
  $('identity').hidden = false;
  $('book-form').reset();
  $('books').replaceChildren();
  $('books').setAttribute('aria-busy', 'false');
  $('refresh').disabled = false;
  $('save-button').disabled = false;
  $('login-button').disabled = false;
  feedback('form-feedback', '');
  $('access-code').focus();
});
$('book-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const identity = identityVersion;
  const title = $('title').value.trim();
  const author = $('author').value.trim();
  for (const [id, value] of [
    ['title', title],
    ['author', author],
  ]) {
    $(id).removeAttribute('aria-invalid');
    if (!value || value.length > 120) {
      $(id).setAttribute('aria-invalid', 'true');
      $(id).focus();
      return feedback(
        'form-feedback',
        `${id === 'title' ? 'Book title' : 'Author'} must contain 1–120 characters.`,
        true,
      );
    }
  }
  $('save-button').disabled = true;
  feedback('form-feedback', 'Saving recommendation…');
  try {
    await api('/api/books', { method: 'POST', body: JSON.stringify({ title, author }) });
    if (identity !== identityVersion) return;
    $('book-form').reset();
    feedback('form-feedback', `“${title}” added to the reading list.`);
    await loadBooks();
    if (identity === identityVersion) $('title').focus();
  } catch (error) {
    if (identity === identityVersion) feedback('form-feedback', error.message, true);
  } finally {
    if (identity === identityVersion) $('save-button').disabled = false;
  }
});
$('refresh').addEventListener('click', () => loadBooks());
if (token) login();
