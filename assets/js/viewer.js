
(async () => {
  const { loadJson, getQueryParam, safeText, buildViewerLink } = window.BonusViewerApp;
  const canvas = document.getElementById('scene');
  const infoPanel = document.getElementById('infoPanel');
  const pageUserId = getQueryParam('user') || 'demo';
  const itemId = getQueryParam('item');

  if (!itemId) {
    infoPanel.innerHTML = `<div class="empty-box">item パラメータがありません。</div>`;
    return;
  }

  try {
    const [items, customers] = await Promise.all([
      loadJson('./data/items.json'),
      loadJson('./data/customers.json'),
    ]);

    const customer = customers.find((entry) => entry.id === pageUserId) || customers.find((entry) => entry.id === 'demo');
    const allowSet = new Set(customer.visibleItemIds || []);
    const item = items.find((entry) => entry.id === itemId && allowSet.has(entry.id));

    if (!item) {
      infoPanel.innerHTML = `<div class="empty-box">この購入者IDでは指定アイテムを表示できません。</div>`;
      return;
    }

    document.getElementById('backLink').href = `./index.html?user=${encodeURIComponent(pageUserId)}`;
    document.getElementById('viewerHeading').textContent = safeText(item.title);
    document.getElementById('viewerSubheading').textContent = `${safeText(item.cardLabel)} / ${safeText(item.setName)}`;
    renderInfo(item, customer);
    initViewer(item);
  } catch (error) {
    infoPanel.innerHTML = `<div class="empty-box">読み込み中にエラーが発生しました。<br>${error.message}</div>`;
  }

  function renderInfo(item, customer) {
    infoPanel.innerHTML = `
      <h2>${safeText(item.title)}</h2>
      <div class="muted" style="margin-top:8px;">${safeText(item.titleEn)}</div>

      <div class="section">
        <dl class="info-list">
          <div class="info-row"><dt>購入者</dt><dd>${safeText(customer.displayName)}</dd></div>
          <div class="info-row"><dt>種別</dt><dd>${item.category === 'psa' ? 'PSA' : 'カード'}</dd></div>
          <div class="info-row"><dt>カード表記</dt><dd>${safeText(item.cardLabel)}</dd></div>
          <div class="info-row"><dt>セット</dt><dd>${safeText(item.setName)}</dd></div>
          <div class="info-row"><dt>共有URL</dt><dd><a href="${buildViewerLink(item.id, pageUserId)}">この表示URL</a></dd></div>
        </dl>
      </div>

      <div class="section">
        <strong>説明</strong>
        <div class="status-note">${safeText(item.description)}</div>
      </div>

      <div class="section">
        <strong>タグ</strong>
        <div class="chip-row" style="margin-top:10px;">
          ${(item.tags || []).map((tag) => `<span class="chip">${safeText(tag)}</span>`).join('') || '<span class="muted">タグなし</span>'}
        </div>
      </div>

      <div class="section">
        <strong>運用メモ</strong>
        <div class="status-note">
          このページは閲覧専用です。カード追加やPSA追加は開発者側で <code>data/items.json</code> と <code>data/customers.json</code> を更新して反映します。
        </div>
      </div>
    `;
  }

  function initViewer(item) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.02, 2.65);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x334466, 1.1);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(1.2, 1.3, 2.4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x99bbff, 0.65);
    rimLight.position.set(-1.5, -0.1, -2.2);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new THREE.TextureLoader();
    const frontTexture = loader.load(item.frontImage);
    const backTexture = loader.load(item.backImage);
    frontTexture.encoding = THREE.sRGBEncoding;
    backTexture.encoding = THREE.sRGBEncoding;

    const isPsa = item.category === 'psa';
    const W = 1.68;
    const H = W * (88 / 63);
    const D = isPsa ? 0.09 : 0.026;
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: isPsa ? '#d9dde8' : '#ffffff',
      roughness: isPsa ? 0.22 : 0.48,
      metalness: 0.05,
      transparent: true,
      opacity: isPsa ? 0.88 : 1,
    });

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(W, H, D),
      [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, new THREE.MeshBasicMaterial({ map: frontTexture }), new THREE.MeshBasicMaterial({ map: backTexture })]
    );
    group.add(body);

    if (isPsa) {
      const label = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.82, H * 0.1, D * 1.04),
        new THREE.MeshStandardMaterial({ color: '#f4f5f8', roughness: 0.28, metalness: 0.03, opacity: 0.95, transparent: true })
      );
      label.position.set(0, H * 0.42, D * 0.03);
      group.add(label);

      const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.86, H * 0.76, D * 1.02),
        new THREE.MeshStandardMaterial({ color: '#eef2fa', roughness: 0.18, metalness: 0.02, opacity: 0.22, transparent: true })
      );
      windowFrame.position.set(0, -H * 0.07, D * 0.028);
      group.add(windowFrame);
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.78, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.44;
    shadow.scale.set(1.35, 0.52, 1);
    scene.add(shadow);

    group.rotation.x = -0.08;
    group.rotation.y = 0.55;

    let autoRotate = true;
    let targetY = group.rotation.y;
    let targetX = group.rotation.x;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const autoButton = document.getElementById('autoRotateButton');
    const flipButton = document.getElementById('flipButton');
    const thicknessSlider = document.getElementById('thicknessSlider');
    const thicknessValue = document.getElementById('thicknessValue');
    const edgeColor = document.getElementById('edgeColor');

    autoButton.addEventListener('click', () => {
      autoRotate = !autoRotate;
      autoButton.textContent = autoRotate ? '⏸ 自動回転' : '▶ 自動回転';
    });

    flipButton.addEventListener('click', () => {
      targetY += Math.PI;
    });

    thicknessSlider.value = isPsa ? '90' : '26';
    thicknessValue.textContent = (Number(thicknessSlider.value) / 1000).toFixed(3);
    thicknessSlider.addEventListener('input', () => {
      const thickness = Number(thicknessSlider.value) / 1000;
      body.scale.z = thickness / D;
      thicknessValue.textContent = thickness.toFixed(3);
    });

    edgeColor.value = isPsa ? '#d9dde8' : '#ffffff';
    edgeColor.addEventListener('input', () => {
      edgeMaterial.color.set(edgeColor.value);
    });

    const pointerDown = (event) => {
      isDragging = true;
      autoRotate = false;
      autoButton.textContent = '▶ 自動回転';
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const pointerMove = (event) => {
      if (!isDragging) {
        return;
      }
      const deltaX = event.clientX - lastX;
      const deltaY = event.clientY - lastY;
      targetY += deltaX * 0.012;
      targetX += deltaY * 0.006;
      targetX = Math.max(-0.65, Math.min(0.65, targetX));
      lastX = event.clientX;
      lastY = event.clientY;
    };

    const pointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getDelta();

      if (autoRotate) {
        targetY += elapsed * 0.7;
      }

      group.rotation.y += (targetY - group.rotation.y) * 0.08;
      group.rotation.x += (targetX - group.rotation.x) * 0.08;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
  }
})();
