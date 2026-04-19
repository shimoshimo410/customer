
async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`JSONの読み込みに失敗しました: ${path}`);
  }
  return response.json();
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function safeText(value, fallback = '―') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value);
}

function buildViewerLink(itemId, userId) {
  const url = new URL('./viewer.html', window.location.href);
  url.searchParams.set('item', itemId);
  if (userId) {
    url.searchParams.set('user', userId);
  }
  return url.toString();
}

function resolveVisibleItems(items, customer) {
  const allowSet = new Set(customer.visibleItemIds || []);
  return items.filter((item) => allowSet.has(item.id));
}

function sortItems(items, sortValue) {
  const copied = [...items];
  switch (sortValue) {
    case 'name':
      copied.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
      break;
    case 'type':
      copied.sort((a, b) => a.category.localeCompare(b.category, 'ja') || a.title.localeCompare(b.title, 'ja'));
      break;
    case 'new':
    default:
      copied.sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0));
      break;
  }
  return copied;
}

window.BonusViewerApp = {
  loadJson,
  getQueryParam,
  safeText,
  buildViewerLink,
  resolveVisibleItems,
  sortItems,
};
