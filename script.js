/**
 * EcoSelva 3D - Lógica Principal (Modelo 3D Real con Three.js, Mapa, Tarjetas, Clima y Gestión Local)
 */

let avistamientosGlobales = [];
let marcadoresLayer = null;
let mapaGlobalRef = null;

document.addEventListener("DOMContentLoaded", () => {
  inicializarAppEcoSelva();
});

async function inicializarAppEcoSelva() {
  console.log("Iniciando EcoSelva 3D...");
  
  // 1. Inicializar mapa
  mapaGlobalRef = L.map('map').setView([-26.8753, -54.6515], 8);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapaGlobalRef);

  marcadoresLayer = L.layerGroup().addTo(mapaGlobalRef);

  // 2. Iniciar Modelo 3D en el panel derecho
  iniciarPlanetaSelva3D();

  // 3. Cargar clima y avistamientos
  cargarClimaMisiones();
  await cargarAvistamientos();

  // 4. Configurar buscador y modales
  configurarBuscador();
  configurarModales();
}

// ==========================================
// RENDERIZADO DEL MODELO 3D (THREE.JS)
// ==========================================
function iniciarPlanetaSelva3D() {
  // Buscar el contenedor del visor 3D (el cuadro que dice "Renderizando ecosistema 3D...")
  const textos = Array.from(document.querySelectorAll('div, p, span'));
  const elementoCarga = textos.find(el => el.textContent && el.textContent.trim() === 'Renderizando ecosistema 3D...');
  
  if (!elementoCarga) return;
  const contenedor3D = elementoCarga.parentElement;

  // Cargar librería Three.js dinámicamente si no existe
  if (typeof THREE === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => construirEscena3D(contenedor3D);
    document.head.appendChild(script);
  } else {
    construirEscena3D(contenedor3D);
  }
}

function construirEscena3D(contenedor) {
  // Limpiar el mensaje de carga y preparar el lienzo
  contenedor.innerHTML = '';
  contenedor.style.position = 'relative';
  contenedor.style.overflow = 'hidden';
  contenedor.style.cursor = 'grab';

  const ancho = contenedor.clientWidth || 350;
  const alto = contenedor.clientHeight || 220;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 1000);
  camara.position.z = 3.2;

  const renderizador = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderizador.setSize(ancho, alto);
  renderizador.setPixelRatio(window.devicePixelRatio);
  contenedor.appendChild(renderizador.domElement);

  // 1. Esfera principal (Núcleo del ecosistema)
  const geometriaEsfera = new THREE.SphereGeometry(1, 32, 32);
  const materialEsfera = new THREE.MeshPhongMaterial({
    color: 0x064e3b,
    emissive: 0x022c22,
    specular: 0x10b981,
    shininess: 30,
    wireframe: false
  });
  const planeta = new THREE.Mesh(geometriaEsfera, materialEsfera);
  escena.add(planeta);

  // 2. Red geodésica externa (Malla ecológica brillante)
  const geometriaMalla = new THREE.IcosahedronGeometry(1.03, 2);
  const materialMalla = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const mallaEco = new THREE.Mesh(geometriaMalla, materialMalla);
  planeta.add(mallaEco);

  // 3. Punto marcador iluminado sobre Misiones, Argentina
  const puntoMisionesGeo = new THREE.SphereGeometry(0.045, 16, 16);
  const puntoMisionesMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const marcadorMisiones = new THREE.Mesh(puntoMisionesGeo, puntoMisionesMat);
  marcadorMisiones.position.set(0.6, -0.45, 0.7);
  planeta.add(marcadorMisiones);

  // 4. Partículas ambientales (luciérnagas / esporas de la selva)
  const particulasGeo = new THREE.BufferGeometry();
  const cantidadParticulas = 180;
  const posiciones = new Float32Array(cantidadParticulas * 3);

  for (let i = 0; i < cantidadParticulas * 3; i++) {
    posiciones[i] = (Math.random() - 0.5) * 5;
  }
  particulasGeo.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const particulasMat = new THREE.PointsMaterial({
    color: 0x34d399,
    size: 0.035,
    transparent: true,
    opacity: 0.8
  });
  const sistemaParticulas = new THREE.Points(particulasGeo, particulasMat);
  escena.add(sistemaParticulas);

  // Iluminación
  const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.6);
  escena.add(luzAmbiental);
  const luzDireccional = new THREE.DirectionalLight(0x6ee7b7, 1.2);
  luzDireccional.position.set(5, 3, 5);
  escena.add(luzDireccional);

  // Interacción con el mouse para rotar el planeta manualmente
  let arrastrando = false;
  let mousePrevio = { x: 0, y: 0 };

  contenedor.addEventListener('mousedown', (e) => {
    arrastrando = true;
    contenedor.style.cursor = 'grabbing';
    mousePrevio = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => {
    arrastrando = false;
    contenedor.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', (e) => {
    if (!arrastrando) return;
    const deltaX = e.clientX - mousePrevio.x;
    const deltaY = e.clientY - mousePrevio.y;
    planeta.rotation.y += deltaX * 0.008;
    planeta.rotation.x += deltaY * 0.008;
    mousePrevio = { x: e.clientX, y: e.clientY };
  });

  // Etiqueta sutil inferior
  const badge = document.createElement('div');
  badge.innerHTML = '<span>🌎 Arrastra para rotar</span>';
  badge.style.cssText = 'position:absolute; bottom:8px; right:10px; font-size:10px; color:#6ee7b7; background:rgba(6,78,59,0.6); padding:2px 8px; border-radius:999px; pointer-events:none;';
  contenedor.appendChild(badge);

  // Bucle de animación
  function animar() {
    requestAnimationFrame(animar);
    if (!arrastrando) {
      planeta.rotation.y += 0.004;
    }
    sistemaParticulas.rotation.y -= 0.0015;
    sistemaParticulas.rotation.x += 0.001;
    renderizador.render(escena, camara);
  }
  animar();

  // Ajustar si cambia el tamaño de la ventana
  window.addEventListener('resize', () => {
    const nuevoAncho = contenedor.clientWidth;
    const nuevoAlto = contenedor.clientHeight;
    if (nuevoAncho > 0 && nuevoAlto > 0) {
      camara.aspect = nuevoAncho / nuevoAlto;
      camara.updateProjectionMatrix();
      renderizador.setSize(nuevoAncho, nuevoAlto);
    }
  });
}

// ==========================================
// CLIMA, MAPA, TARJETAS Y GESTIÓN LOCAL
// ==========================================
async function cargarClimaMisiones() {
  try {
    const respuesta = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-25.6953&longitude=-54.4367&current=temperature_2m,relative_humidity_2m,wind_speed_10m');
    const data = await respuesta.json();
    if (data.current) {
      document.getElementById('temp-display').textContent = `${data.current.temperature_2m}°C (Iguazú)`;
      document.getElementById('humedad-val').textContent = `${data.current.relative_humidity_2m}%`;
      document.getElementById('viento-val').textContent = `${data.current.wind_speed_10m} km/h`;
    }
  } catch (error) {
    console.error("Error al cargar clima:", error);
    document.getElementById('temp-display').textContent = "24°C (Selva Misionera)";
    document.getElementById('humedad-val').textContent = "85%";
    document.getElementById('viento-val').textContent = "12 km/h";
  }
}

async function cargarAvistamientos() {
  let avistamientosAPI = [];
  try {
    const respuesta = await fetch('https://api.inaturalist.org/v1/observations?place_id=7191&per_page=40');
    if (respuesta.ok) {
      const data = await respuesta.json();
      avistamientosAPI = data.results || [];
    }
  } catch (error) {
    console.warn("Aviso: No se pudo conectar con iNaturalist. Usando registros locales.", error);
  }

  let avistamientosLocales = JSON.parse(localStorage.getItem('misAvistamientosEcoSelva') || '[]');
  
  let modificado = false;
  avistamientosLocales = avistamientosLocales.map((item, idx) => {
    if (!item.id) {
      item.id = `local_${idx}_${Date.now()}`;
      modificado = true;
    }
    return item;
  });
  if (modificado) {
    localStorage.setItem('misAvistamientosEcoSelva', JSON.stringify(avistamientosLocales));
  }

  avistamientosGlobales = [...avistamientosLocales, ...avistamientosAPI];
  renderizarTodo(avistamientosGlobales);
}

function renderizarTodo(avistamientos) {
  renderizarMarcadoresMapa(avistamientos);
  renderizarTarjetasResultados(avistamientos);
}

function obtenerUrlFotoOptima(obs, taxon) {
  let url = obs.photos?.[0]?.url || taxon.default_photo?.medium_url || taxon.default_photo?.square_url;
  if (url && typeof url === 'string' && url.startsWith('http')) {
    return url.replace('square', 'medium').replace('small', 'medium');
  }
  return null;
}

function obtenerEmojiPorEspecie(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('yaguaret') || n.includes('jaguar') || n.includes('puma') || n.includes('felino')) return '🐆';
  if (n.includes('tucan') || n.includes('tucán') || n.includes('ave') || n.includes('pajaro') || n.includes('loro') || n.includes('duck') || n.includes('cormorant') || n.includes('stork') || n.includes('spoonbill')) return '🦜';
  if (n.includes('coati') || n.includes('coatí')) return '🦝';
  if (n.includes('mono') || n.includes('caraya') || n.includes('cai')) return '🐒';
  if (n.includes('mariposa') || n.includes('morpho')) return '🦋';
  if (n.includes('orquidea') || n.includes('orquídea') || n.includes('flor')) return '🌸';
  if (n.includes('carpincho') || n.includes('tapir') || n.includes('roedor')) return '🦫';
  if (n.includes('serpiente') || n.includes('yarara') || n.includes('yacare') || n.includes('reptil')) return '🐍';
  if (n.includes('planta') || n.includes('arbol') || n.includes('hoja')) return '🌿';
  return '🐾';
}

function renderizarMarcadoresMapa(avistamientos) {
  if (!marcadoresLayer) return;
  marcadoresLayer.clearLayers();

  avistamientos.forEach((obs) => {
    if (!obs.geojson || !obs.geojson.coordinates) return;

    const [lng, lat] = obs.geojson.coordinates;
    const taxon = obs.taxon || {};
    const nombreComun = taxon.preferred_common_name || taxon.name || "Especie silvestre";
    const nombreCientifico = taxon.name || "Taxón sin clasificar";
    const categoria = taxon.iconic_taxon_name || "Biodiversidad";
    const lugar = obs.place_guess || "Misiones, Argentina";
    const fecha = obs.observed_on || "Fecha no registrada";

    let fotoUrl = obtenerUrlFotoOptima(obs, taxon);
    const emojiFallback = obtenerEmojiPorEspecie(nombreComun);

    const esLocal = obs.id && String(obs.id).startsWith('local_');
    const botonEliminarHTML = esLocal ? `
      <button onclick="window.solicitarEliminacion('${obs.id}')" style="width:100%; margin-top:8px; background:#dc2626; color:#fff; border:none; padding:6px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
        <i class="fa-solid fa-trash"></i> Eliminar mi registro
      </button>
    ` : '';

    const htmlMarcador = fotoUrl 
      ? `<div class="custom-species-marker"><img src="${fotoUrl}" alt="${nombreComun}" loading="lazy" onerror="this.parentElement.innerHTML='${emojiFallback}'"></div>`
      : `<div class="custom-species-marker" style="display:flex; align-items:center; justify-content:center; font-size:22px; background:#064e3b;">${emojiFallback}</div>`;

    const iconoPersonalizado = L.divIcon({
      className: "",
      html: htmlMarcador,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const mediaPopupHTML = fotoUrl
      ? `<img src="${fotoUrl}" alt="${nombreComun}" style="width:100%; height:130px; object-fit:cover; display:block;" onerror="this.style.display='none';">`
      : `<div style="width:100%; height:110px; background:linear-gradient(135deg, #064e3b, #0f2922); display:flex; align-items:center; justify-content:center; font-size:48px; border-bottom:1px solid rgba(16,185,129,0.3);">${emojiFallback}</div>`;

    const popupHTML = `
      <div class="popup-card">
        ${mediaPopupHTML}
        <div style="padding: 12px; font-family:sans-serif; color:#ecfdf5; background:#0f2922;">
          <span style="display:inline-block; background:#065f46; color:#6ee7b7; font-size:10px; font-weight:600; padding:2px 8px; border-radius:999px; margin-bottom:6px;">${categoria}</span>
          <h4 style="margin:0 0 2px 0; font-size:15px; font-weight:700; color:#fff;">${nombreComun}</h4>
          <p style="margin:0 0 8px 0; font-size:12px; font-style:italic; color:#a7f3d0;">${nombreCientifico}</p>
          <div style="font-size:11px; color:#d1fae5; line-height:1.4; border-top:1px solid rgba(16,185,129,0.25); padding-top:6px;">
            <div>📍 ${lugar}</div>
            <div>📅 ${fecha}</div>
          </div>
          ${botonEliminarHTML}
        </div>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: iconoPersonalizado }).bindPopup(popupHTML);
    marker.addTo(marcadoresLayer);
  });
}

function renderizarTarjetasResultados(avistamientos) {
  const container = document.getElementById('resultados-container');
  if (!container) return;
  container.innerHTML = '';

  if (avistamientos.length === 0) {
    container.innerHTML = `<p class="text-gray-400 text-sm col-span-2 text-center py-6 bg-[#0f1d22] rounded-2xl border border-[#1b343a]">No se encontraron especies en esta vista.</p>`;
    return;
  }

  avistamientos.forEach((obs) => {
    const taxon = obs.taxon || {};
    let fotoUrl = obtenerUrlFotoOptima(obs, taxon);
    const emojiFallback = obtenerEmojiPorEspecie(taxon.preferred_common_name || taxon.name);

    const nombreComun = taxon.preferred_common_name || taxon.name || "Especie silvestre";
    const nombreCientifico = taxon.name || "Taxón sin clasificar";
    const categoria = taxon.iconic_taxon_name || "Biodiversidad";
    const lugar = obs.place_guess || "Misiones, Argentina";
    const fecha = obs.observed_on || "Fecha no registrada";

    const mediaHTML = fotoUrl 
      ? `<img src="${fotoUrl}" alt="${nombreComun}" class="w-full h-36 object-cover" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\'w-full h-36 bg-gradient-to-br from-[#064e3b] to-[#0f2922] flex items-center justify-center text-5xl border-b border-[#1b343a]\'>${emojiFallback}</div>'">`
      : `<div class="w-full h-36 bg-gradient-to-br from-[#064e3b] to-[#0f2922] flex items-center justify-center text-5xl border-b border-[#1b343a]">${emojiFallback}</div>`;

    const card = document.createElement('div');
    card.className = "bg-[#0f1d22] border border-[#1b343a] rounded-2xl overflow-hidden shadow flex flex-col justify-between hover:border-[#10b981] transition";
    card.innerHTML = `
      <div>
        ${mediaHTML}
        <div class="p-4">
          <span class="inline-block bg-[#065f46] text-[#6ee7b7] text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2">${categoria}</span>
          <h4 class="font-bold text-white text-base truncate">${nombreComun}</h4>
          <p class="text-xs italic text-[#a7f3d0] truncate mb-3">${nombreCientifico}</p>
          <div class="text-[11px] text-gray-300 space-y-1 border-t border-[#1b343a] pt-2">
            <div>📍 ${lugar}</div>
            <div>📅 ${fecha}</div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function configurarBuscador() {
  const inputBusqueda = document.getElementById('input-busqueda');
  if (!inputBusqueda) return;

  inputBusqueda.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    if (!texto) {
      renderizarTodo(avistamientosGlobales);
      return;
    }
    const filtrados = avistamientosGlobales.filter(obs => {
      const nombreComun = (obs.taxon?.preferred_common_name || '').toLowerCase();
      const nombreCientifico = (obs.taxon?.name || '').toLowerCase();
      const categoria = (obs.taxon?.iconic_taxon_name || '').toLowerCase();
      const lugar = (obs.place_guess || '').toLowerCase();
      return nombreComun.includes(texto) || nombreCientifico.includes(texto) || categoria.includes(texto) || lugar.includes(texto);
    });
    renderizarTodo(filtrados);
  });
}

window.filtrarEspecie = function(categoriaSeleccionada) {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('bg-[#10b981]', 'text-[#0b1315]', 'font-bold');
    btn.classList.add('bg-[#14262c]', 'border', 'border-[#1b343a]', 'text-[#f0fdf4]');
  });
  event.target.classList.remove('bg-[#14262c]', 'border', 'border-[#1b343a]', 'text-[#f0fdf4]');
  event.target.classList.add('bg-[#10b981]', 'text-[#0b1315]', 'font-bold');

  if (categoriaSeleccionada === 'todos') {
    renderizarTodo(avistamientosGlobales);
  } else {
    const filtrados = avistamientosGlobales.filter(obs => {
      const catObs = (obs.taxon?.iconic_taxon_name || '').toLowerCase();
      const catSel = categoriaSeleccionada.toLowerCase();

      return catObs.includes(catSel) || 
             (catSel === 'mamiferos' && (catObs.includes('mammalia') || catObs.includes('mammal'))) ||
             (catSel === 'aves' && (catObs.includes('aves') || catObs.includes('bird'))) ||
             (catSel === 'reptiles' && (catObs.includes('reptilia') || catObs.includes('reptile'))) ||
             (catSel === 'plantas' && (catObs.includes('plantae') || catObs.includes('plant'))) ||
             (catSel === 'insectos' && (catObs.includes('insecta') || catObs.includes('insect')));
    });
    renderizarTodo(filtrados);
  }
};

window.solicitarEliminacion = function(id) {
  if (mapaGlobalRef) mapaGlobalRef.closePopup();
  
  const modalConf = document.getElementById('modal-confirmacion-ecoselva');
  const btnAceptar = document.getElementById('conf-btn-aceptar');
  const btnCancelar = document.getElementById('conf-btn-cancelar');

  if (!modalConf) return;
  modalConf.classList.remove('hidden');

  const nuevoAceptar = btnAceptar.cloneNode(true);
  const nuevoCancelar = btnCancelar.cloneNode(true);
  btnAceptar.parentNode.replaceChild(nuevoAceptar, btnAceptar);
  btnCancelar.parentNode.replaceChild(nuevoCancelar, btnCancelar);

  document.getElementById('conf-btn-aceptar').addEventListener('click', () => {
    modalConf.classList.add('hidden');
    ejecutarEliminacion(id);
  });

  document.getElementById('conf-btn-cancelar').addEventListener('click', () => {
    modalConf.classList.add('hidden');
  });
};

function ejecutarEliminacion(id) {
  let guardados = JSON.parse(localStorage.getItem('misAvistamientosEcoSelva') || '[]');
  guardados = guardados.filter(item => item.id !== id);
  localStorage.setItem('misAvistamientosEcoSelva', JSON.stringify(guardados));

  avistamientosGlobales = avistamientosGlobales.filter(item => item.id !== id);
  renderizarTodo(avistamientosGlobales);
}

function configurarModales() {
  if (!document.getElementById('modal-registro-avistamiento')) {
    const modalRegistroHTML = `
      <div id="modal-registro-avistamiento" class="fixed inset-0 bg-black/70 z-[9999] hidden flex items-center justify-center p-4">
        <div class="bg-[#0f1d22] border border-[#1b343a] rounded-2xl max-w-md w-full p-6 shadow-2xl text-[#f0fdf4]">
          <h3 class="text-lg font-bold text-[#6ee7b7] mb-4 flex items-center space-x-2">
            <i class="fa-solid fa-camera-retro"></i> <span>Registrar Avistamiento en Misiones</span>
          </h3>
          <form id="form-registro-avistamiento" class="space-y-4 text-sm">
            <div>
              <label class="block text-gray-300 mb-1 font-medium">Nombre de la especie *</label>
              <input type="text" id="modal-nombre" required placeholder="Ej. Yaguareté, Tucán, Coatí..." class="w-full px-3 py-2 bg-[#14262c] border border-[#1b343a] rounded-xl text-white focus:outline-none focus:border-[#10b981]">
            </div>
            <div>
              <label class="block text-gray-300 mb-1 font-medium">Categoría</label>
              <select id="modal-categoria" class="w-full px-3 py-2 bg-[#14262c] border border-[#1b343a] rounded-xl text-white focus:outline-none focus:border-[#10b981]">
                <option value="Mamíferos">Mamíferos</option>
                <option value="Aves">Aves</option>
                <option value="Reptiles">Reptiles</option>
                <option value="Plantas">Plantas</option>
                <option value="Insectos">Insectos</option>
              </select>
            </div>
            <div>
              <label class="block text-gray-300 mb-1 font-medium">Lugar / Ubicación</label>
              <input type="text" id="modal-lugar" placeholder="Ej. Parque Nacional Iguazú" value="Misiones, Argentina" class="w-full px-3 py-2 bg-[#14262c] border border-[#1b343a] rounded-xl text-white focus:outline-none focus:border-[#10b981]">
            </div>
            <div>
              <label class="block text-gray-300 mb-1 font-medium">Foto del avistamiento (Opcional)</label>
              <input type="file" id="modal-foto-archivo" accept="image/*" class="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#10b981] file:text-[#0b1315] hover:file:bg-[#059669] cursor-pointer">
              <p class="text-[11px] text-gray-400 mt-1">Si no adjuntas foto, asignaremos un emoji representativo de la especie.</p>
            </div>
            <div class="flex justify-end space-x-3 pt-2">
              <button type="button" id="btn-cancelar-avistamiento" class="px-4 py-2 bg-[#1b343a] hover:bg-[#23444c] rounded-xl font-semibold transition text-gray-300">Cancelar</button>
              <button type="submit" class="px-4 py-2 bg-[#10b981] text-[#0b1315] rounded-xl font-semibold hover:bg-[#059669] transition">Guardar Avistamiento</button>
            </div>
          </form>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalRegistroHTML);
  }

  if (!document.getElementById('modal-confirmacion-ecoselva')) {
    const modalConfirmacionHTML = `
      <div id="modal-confirmacion-ecoselva" class="fixed inset-0 bg-black/70 z-[10000] hidden flex items-center justify-center p-4">
        <div class="bg-[#0f1d22] border border-[#1b343a] rounded-2xl max-w-sm w-full p-6 shadow-2xl text-[#f0fdf4] text-center">
          <div class="text-red-500 text-3xl mb-3"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3 class="text-sm font-semibold text-gray-200 mb-5">¿Estás seguro de que deseas eliminar este avistamiento registrado?</h3>
          <div class="flex justify-center space-x-3">
            <button id="conf-btn-cancelar" class="px-4 py-2 bg-[#1b343a] hover:bg-[#23444c] rounded-xl font-semibold text-xs transition text-gray-300">Cancelar</button>
            <button id="conf-btn-aceptar" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl font-semibold text-xs transition text-white">Sí, eliminar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalConfirmacionHTML);
  }

  const modalReg = document.getElementById('modal-registro-avistamiento');
  const formReg = document.getElementById('form-registro-avistamiento');
  const btnCancelarReg = document.getElementById('btn-cancelar-avistamiento');

  let latTemp = null;
  let lngTemp = null;

  mapaGlobalRef.on('click', function(e) {
    latTemp = e.latlng.lat;
    lngTemp = e.latlng.lng;
    document.getElementById('modal-nombre').value = '';
    document.getElementById('modal-lugar').value = 'Parque Nacional Iguazú, Misiones';
    document.getElementById('modal-foto-archivo').value = '';
    modalReg.classList.remove('hidden');
  });

  btnCancelarReg.addEventListener('click', () => {
    modalReg.classList.add('hidden');
  });

  formReg.addEventListener('submit', function(e) {
    e.preventDefault();
    const nombre = document.getElementById('modal-nombre').value.trim();
    const categoria = document.getElementById('modal-categoria').value;
    const lugar = document.getElementById('modal-lugar').value.trim() || "Misiones, Argentina";
    const inputArchivo = document.getElementById('modal-foto-archivo');

    if (!nombre) return;

    const procesarGuardado = (urlFoto) => {
      const idUnico = 'local_' + Date.now();

      const nuevoAvistamiento = {
        id: idUnico,
        geojson: { coordinates: [lngTemp, latTemp] },
        taxon: { 
          name: nombre, 
          preferred_common_name: nombre, 
          iconic_taxon_name: categoria,
          default_photo: { square_url: urlFoto, medium_url: urlFoto }
        },
        place_guess: lugar,
        observed_on: new Date().toISOString().split('T')[0],
        photos: [{ url: urlFoto }]
      };

      let guardados = JSON.parse(localStorage.getItem('misAvistamientosEcoSelva') || '[]');
      guardados.push(nuevoAvistamiento);
      localStorage.setItem('misAvistamientosEcoSelva', JSON.stringify(guardados));

      avistamientosGlobales.push(nuevoAvistamiento);
      renderizarTodo(avistamientosGlobales);

      modalReg.classList.add('hidden');
    };

    if (inputArchivo.files && inputArchivo.files[0]) {
      const reader = new FileReader();
      reader.onload = function(uploadEvent) {
        procesarGuardado(uploadEvent.target.result);
      };
      reader.readAsDataURL(inputArchivo.files[0]);
    } else {
      const emojiEspecifico = obtenerEmojiPorEspecie(nombre);
      procesarGuardado(emojiEspecifico);
    }
  });
}