(async () => {
  const { loadJson, getQueryParam, safeText, buildViewerLink } = window.BonusViewerApp;
  const canvas = document.getElementById("scene");
  const infoPanel = document.getElementById("infoPanel");
  const pageUserId = getQueryParam("user") || "demo";
  const itemId = getQueryParam("item");

  if (!itemId) {
    infoPanel.innerHTML = `<div class="empty-box">item パラメータがありません。</div>`;
    return;
  }

  try {
    const [items, customers] = await Promise.all([
      loadJson("./data/items.json"),
      loadJson("./data/customers.json"),
    ]);

    const customer =
      customers.find((entry) => entry.id === pageUserId) ||
      customers.find((entry) => entry.id === "demo");

    const allowSet = new Set(customer.visibleItemIds || []);
    const item = items.find((entry) => entry.id === itemId && allowSet.has(entry.id));

    if (!item) {
      infoPanel.innerHTML = `<div class="empty-box">この購入者IDでは指定アイテムを表示できません。</div>`;
      return;
    }

    document.getElementById("backLink").href = `./index.html?user=${encodeURIComponent(pageUserId)}`;
    document.getElementById("viewerHeading").textContent = safeText(item.title);
    document.getElementById("viewerSubheading").textContent = `${safeText(item.cardLabel)} / ${safeText(item.setName)}`;

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
          <div class="info-row"><dt>種別</dt><dd>${item.category === "psa" ? "PSA" : "カード"}</dd></div>
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
          ${(item.tags || []).map((tag) => `<span class="chip">${safeText(tag)}</span>`).join("") || '<span class="muted">タグなし</span>'}
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
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0.02, 4.6);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x223355, 1.08);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(1.4, 1.2, 2.6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xaecbff, 0.45);
    fillLight.position.set(-1.8, 0.2, 1.8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x88bbff, 0.42);
    rimLight.position.set(-1.6, -0.2, -2.5);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    const loader = new THREE.TextureLoader();

    const frontTexture = loader.load(item.frontImage);
    const backTexture = loader.load(item.backImage);

    frontTexture.encoding = THREE.sRGBEncoding;
    backTexture.encoding = THREE.sRGBEncoding;

    const isPsa = item.category === "psa";

    const W = isPsa ? 1.10 : 1.02;
    const H = W * (88 / 63);
    const D = isPsa ? 0.045 : 0.018;
    const R = isPsa ? 0.06 : 0.055;

    const roundedShape = createRoundedRectShape(W, H, R);

    const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape, {
      depth: D,
      bevelEnabled: false,
      curveSegments: 24,
      steps: 1,
    });

    bodyGeometry.center();

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: isPsa ? "#e4e8ef" : "#f9f9fb",
      roughness: isPsa ? 0.38 : 0.52,
      metalness: 0.02,
    });

    const body = new THREE.Mesh(bodyGeometry, edgeMaterial);
    group.add(body);

    const roundedMaskTexture = createRoundedMaskTexture(1024, 1024, 72);

    const frontMaterial = new THREE.MeshStandardMaterial({
      map: frontTexture,
      alphaMap: roundedMaskTexture,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.88,
      metalness: 0.0,
    });

    const backMaterial = new THREE.MeshStandardMaterial({
      map: backTexture,
      alphaMap: roundedMaskTexture,
      transparent: true,
      alphaTest: 0.5,
      roughness: 0.9,
      metalness: 0.0,
    });

    const frontPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.01, H - 0.01, 1, 1),
      frontMaterial
    );
    frontPlane.position.z = D / 2 + 0.001;
    group.add(frontPlane);

    const backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.01, H - 0.01, 1, 1),
      backMaterial
    );
    backPlane.rotation.y = Math.PI;
    backPlane.position.z = -(D / 2 + 0.001);
    group.add(backPlane);

    const glareTexture = createGlareTexture(1024, 1024);

    const glareFrontMaterial = new THREE.MeshBasicMaterial({
      map: glareTexture,
      alphaMap: roundedMaskTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glareBackMaterial = new THREE.MeshBasicMaterial({
      map: glareTexture,
      alphaMap: roundedMaskTexture,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const glareFront = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.008, H - 0.008, 1, 1),
      glareFrontMaterial
    );
    glareFront.position.z = D / 2 + 0.0025;
    group.add(glareFront);

    const glareBack = new THREE.Mesh(
      new THREE.PlaneGeometry(W - 0.008, H - 0.008, 1, 1),
      glareBackMaterial
    );
    glareBack.rotation.y = Math.PI;
    glareBack.position.z = -(D / 2 + 0.0025);
    group.add(glareBack);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.60, 48),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.10,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.95;
    shadow.scale.set(1.0, 0.32, 1);
    scene.add(shadow);

    group.rotation.x = -0.08;
    group.rotation.y = 0.45;
    group.scale.setScalar(isPsa ? 0.76 : 0.72);

    let autoRotate = true;
    let targetY = group.rotation.y;
    let targetX = group.rotation.x;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const autoButton = document.getElementById("autoRotateButton");
    const flipButton = document.getElementById("flipButton");
    const thicknessSlider = document.getElementById("thicknessSlider");
    const thicknessValue = document.getElementById("thicknessValue");
    const edgeColor = document.getElementById("edgeColor");

    autoButton.addEventListener("click", () => {
      autoRotate = !autoRotate;
      autoButton.textContent = autoRotate ? "⏸ 自動回転" : "▶ 自動回転";
    });

    flipButton.addEventListener("click", () => {
      targetY += Math.PI;
    });

    thicknessSlider.value = isPsa ? "45" : "18";
    thicknessValue.textContent = (Number(thicknessSlider.value) / 1000).toFixed(3);

    thicknessSlider.addEventListener("input", () => {
      const thickness = Number(thicknessSlider.value) / 1000;

      const scaleValue = thickness / D;

      body.scale.z = scaleValue;
      frontPlane.position.z = (D * scaleValue) / 2 + 0.001;
      backPlane.position.z = -((D * scaleValue) / 2 + 0.001);
      glareFront.position.z = (D * scaleValue) / 2 + 0.0025;
      glareBack.position.z = -((D * scaleValue) / 2 + 0.0025);

      thicknessValue.textContent = thickness.toFixed(3);
    });

    edgeColor.value = isPsa ? "#e4e8ef" : "#f9f9fb";
    edgeColor.addEventListener("input", () => {
      edgeMaterial.color.set(edgeColor.value);
    });

    const pointerDown = (event) => {
      isDragging = true;
      autoRotate = false;
      autoButton.textContent = "▶ 自動回転";
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
      targetX = Math.max(-0.58, Math.min(0.58, targetX));

      lastX = event.clientX;
      lastY = event.clientY;
    };

    const pointerUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    const clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getDelta();

      if (autoRotate) {
        targetY += elapsed * 0.42;
      }

      group.rotation.y += (targetY - group.rotation.y) * 0.08;
      group.rotation.x += (targetX - group.rotation.x) * 0.08;

      updateGlare(group, glareFrontMaterial, glareBackMaterial);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();
  }

  function createRoundedRectShape(width, height, radius) {
    const x = -width / 2;
    const y = -height / 2;
    const r = Math.min(radius, width / 2, height / 2);

    const shape = new THREE.Shape();

    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);

    return shape;
  }

  function createRoundedMaskTexture(width, height, radius) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#000000";

    drawRoundedRect(ctx, 0, 0, width, height, radius);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createGlareTexture(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0.00, "rgba(255,255,255,0.00)");
    gradient.addColorStop(0.30, "rgba(255,255,255,0.00)");
    gradient.addColorStop(0.48, "rgba(255,255,255,0.08)");
    gradient.addColorStop(0.50, "rgba(255,255,255,0.28)");
    gradient.addColorStop(0.52, "rgba(255,255,255,0.10)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0.00)");
    gradient.addColorStop(1.00, "rgba(255,255,255,0.00)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function updateGlare(group, glareFrontMaterial, glareBackMaterial) {
    const normalizedY = Math.sin(group.rotation.y);
    const normalizedX = Math.sin(group.rotation.x);

    const frontOpacity = Math.max(0.04, Math.min(0.22, 0.10 + normalizedY * 0.08 + Math.abs(normalizedX) * 0.04));
    const backOpacity = Math.max(0.02, Math.min(0.16, 0.06 + (-normalizedY) * 0.06 + Math.abs(normalizedX) * 0.03));

    glareFrontMaterial.opacity = frontOpacity;
    glareBackMaterial.opacity = backOpacity;

    glareFrontMaterial.map.rotation = group.rotation.y * 0.55 + group.rotation.x * 0.25;
    glareBackMaterial.map.rotation = -group.rotation.y * 0.55 + group.rotation.x * 0.25;

    glareFrontMaterial.map.center.set(0.5, 0.5);
    glareBackMaterial.map.center.set(0.5, 0.5);

    glareFrontMaterial.map.offset.x = 0.08 * Math.sin(group.rotation.y * 0.9);
    glareFrontMaterial.map.offset.y = 0.05 * Math.sin(group.rotation.x * 1.1);

    glareBackMaterial.map.offset.x = 0.08 * Math.sin(-group.rotation.y * 0.9);
    glareBackMaterial.map.offset.y = 0.05 * Math.sin(group.rotation.x * 1.1);

    glareFrontMaterial.map.needsUpdate = true;
    glareBackMaterial.map.needsUpdate = true;
  }
})();
