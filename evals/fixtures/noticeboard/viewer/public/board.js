const button = document.querySelector('#reload');
const status = document.querySelector('#status');
const list = document.querySelector('#notices');
async function reload() {
  button.disabled = true;
  status.textContent = 'Loading';
  try {
    const response = await fetch('/api/notices', { cache: 'no-store' });
    if (!response.ok) throw new Error('Request failed');
    const data = await response.json();
    list.replaceChildren(
      ...data.items.map((item) => {
        const li = document.createElement('li');
        li.textContent = item.title;
        return li;
      }),
    );
    status.textContent = data.total ? `${data.total} notices` : 'No notices';
  } catch {
    list.replaceChildren();
    status.textContent = 'Unable to load notices. Try reloading.';
  } finally {
    button.disabled = false;
  }
}
button.addEventListener('click', reload);
reload();
