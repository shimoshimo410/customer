
(async () => {
  const { loadJson, getQueryParam, safeText, buildViewerLink, resolveVisibleItems, sortItems } = window.BonusViewerApp;
  const app = document.getElementById('app');

  try {
    const [items, customers] = await Promise.all([
      loadJson('./data/items.json'),
      loadJson('./data/customers.json'),
    ]);

    const userId = getQueryParam('user') || 'demo';
    const customer = customers.find((entry) => entry.id === userId) || customers.find((entry) => entry.id === 'demo');
    const visibleItems = resolveVisibleItems(items, customer);

    renderPage({ items: visibleItems, customer, userId });
  } catch (error) {
    app.innerHTML = `<div class="empty-box">読み込み中にエラーが発生しました。<br>${error.message}</div>`;
  }

  function renderPage({ items, customer, userId }) {
    app.innerHTML = `
      <div class="topbar">
        <div>
          <div class="muted">購入者専用デジタル特典</div>
          <div><strong>${safeText(customer.displayName)}</strong> さん向けコレクション</div>
        </div>
        <div class="chip-row">
          <span class="chip">公開ID: ${safeText(customer.id)}</span>
          <span class="chip">表示件数: ${items.length}件</span>
          <span class="chip">メモ: ${safeText(customer.note)}</span>
        </div>
      </div>

      <section class="hero">
        <h1>棚・キャビネット風のサムネ一覧</h1>
        <p>
          このページは購入者向けの閲覧専用ページです。<br>
          カードやPSAの追加は開発者側でJSONを更新して反映する想定です。
        </p>
      </section>

      <section class="toolbar">
        <input id="searchInput" type="text" placeholder="カード名・セット名・タグで絞り込み">
        <select id="categorySelect">
          <option value="all">すべて表示</option>
          <option value="raw">カード</option>
          <option value="psa">PSA</option>
        </select>
        <select id="sortSelect">
          <option value="new">新しい順</option>
          <option value="name">名前順</option>
          <option value="type">種別順</option>
        </select>
        <button id="copyButton" type="button">共有URLをコピー</button>
      </section>

      <section class="gallery-section">
        <div class="gallery-header">
          <h2>コレクション一覧</h2>
          <div class="muted" id="resultCount"></div>
        </div>
        <div class="shelf">
          <div class="grid" id="itemGrid"></div>
          <div class="shelf-board"></div>
        </div>
      </section>
    `;

    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const sortSelect = document.getElementById('sortSelect');
    const itemGrid = document.getElementById('itemGrid');
    const resultCount = document.getElementById('resultCount');
    const copyButton = document.getElementById('copyButton');

    const draw = () => {
      const searchText = searchInput.value.trim().toLowerCase();
      const category = categorySelect.value;
      const sorted = sortItems(items, sortSelect.value);
      const filtered = sorted.filter((item) => {
        const matchesCategory = category === 'all' || item.category === category;
        const haystack = [item.title, item.setName, ...(item.tags || [])].join(' ').toLowerCase();
        const matchesSearch = !searchText || haystack.includes(searchText);
        return matchesCategory && matchesSearch;
      });

      resultCount.textContent = `${filtered.length}件を表示中`;

      if (!filtered.length) {
        itemGrid.innerHTML = `<div class="empty-box">条件に一致するアイテムがありません。</div>`;
        return;
      }

      itemGrid.innerHTML = filtered.map((item) => {
        const thumbHtml = item.category === 'psa'
          ? `
            <div class="thumb-card psa">
              <div class="slab-label"></div>
              <div class="slab-window" style="background-image:url('${item.frontImage}')"></div>
            </div>
          `
          : `<div class="thumb-card" style="background-image:url('${item.frontImage}')"></div>`;

        return `
          <a class="item-card" href="${buildViewerLink(item.id, userId)}">
            <div class="thumb-stage">${thumbHtml}</div>
            <div class="item-meta">
              <h3>${safeText(item.title)}</h3>
              <p>${safeText(item.cardLabel)}<br>${safeText(item.setName)}</p>
            </div>
          </a>
        `;
      }).join('');
    };

    searchInput.addEventListener('input', draw);
    categorySelect.addEventListener('change', draw);
    sortSelect.addEventListener('change', draw);
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyButton.textContent = 'コピーしました';
        setTimeout(() => {
          copyButton.textContent = '共有URLをコピー';
        }, 1500);
      } catch (error) {
        alert('クリップボードへコピーできませんでした。URLを手動でコピーしてください。');
      }
    });

    draw();
  }
})();
