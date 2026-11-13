/**
 * EcoSelva 3D - Lógica Principal (Filtros corregidos, Clima Open-Meteo, Emojis y Gestión Local)
 */

let avistamientosGlobales = [];
let marcadoresLayer = null;
let mapaGlobalRef = null;

document.addEventListener("DOMContentLoaded", () => {
  inicializarAppEcoSelva();
});

async function inicializarAppEcoSelva() {
  console.log("Iniciando EcoSelva 3D...");
  
  // Inicializar mapa centrado en Misiones
  mapaGlobalRef = L.map('map').setView([-26.8753, -54.6515], 8);

  // Mapa base CartoDB Dark Matter (oscuro, rápido y sin bloqueos)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapaGlobalRef);

  marcadoresLayer = L.layerGroup().addTo(mapaGlobalRef);

  // 1. Cargar datos meteorológicos de Open-Meteo
  cargarClimaMisiones();

  // 2. Cargar avistamientos (API + LocalStorage)
  await cargarAvistamientos();

  // 3. Configurar modal de registro por clic en el mapa
  configurarModales();
}

// Consumo de la API de Open-Meteo para el clima de Misiones
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

// Cargar avistamientos desde iNaturalist y localStorage con respaldo
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
  
  // Asegurar ID único a registros antiguos
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
  renderizarMarcadoresMapa(avistamientosGlobales);
}

// Renderizar marcadores en el mapa de Leaflet
function renderizarMarcadoresMapa(avistamientos) {
  if (!marcadoresLayer) return;
  marcadoresLayer.clearLayers();

  avistamientos.forEach((obs) => {
    if (!obs.geojson || !obs.geojson.coordinates) return;

    const [lng, lat] = obs.geojson.coordinates;
    const taxon = obs.taxon || {};

    const fotoMini = obs.photos?.[0]?.url || taxon.default_photo?.square_url || "🐾";
    const fotoGrande = obs.photos?.[0]?.url?.replace("square", "medium") || taxon.default_photo?.medium_url || fotoMini;

    const nombreComun = taxon.preferred_common_name || taxon.name || "Especie silvestre";
    const nombreCientifico = taxon.name || "Taxón sin clasificar";
    const categoria = taxon.iconic_taxon_name || "Biodiversidad";
    const lugar = obs.place_guess || "Misiones, Argentina";
    const fecha = obs.observed_on || "Fecha no registrada";

    const esLocal = obs.id && String(obs.id).startsWith('local_');
    const botonEliminarHTML = esLocal ? `
      <button onclick="window.solicitarEliminacion('${obs.id}')" style="width:100%; margin-top:8px; background:#dc2626; color:#fff; border:none; padding:6px; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px;">
        <i class="fa-solid fa-trash"></i> Eliminar mi registro
      </button>
    ` : '';

    const esEmoji = typeof fotoMini === 'string' && !fotoMini.startsWith('http') && !fotoMini.startsWith('data:');

    const htmlMarcador = esEmoji 
      ? `<div class="custom-species-marker" style="display:flex; align-items:center; justify-content:center; font-size:22px; background:#064e3b;">${fotoMini}</div>`
      : `<div class="custom-species-marker"><img src="${fotoMini}" alt="${nombreComun}" loading="lazy"></div>`;

    const iconoPersonalizado = L.divIcon({
      className: "",
      html: htmlMarcador,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const mediaPopupHTML = esEmoji
      ? `<div style="width:100%; height:110px; background:linear-gradient(135deg, #064e3b, #0f2922); display:flex; align-items:center; justify-content:center; font-size:48px; border-bottom:1px solid rgba(16,185,129,0.3);">${fotoGrande}</div>`
      : `<img src="${fotoGrande}" alt="${nombreComun}" style="width:100%; height:130px; object-fit:cover; display:block;">`;

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

// Función global para filtrar especies por categoría desde los botones superiores
window.filtrarEspecie = function(categoriaSeleccionada) {
  // Actualizar diseño visual de los botones de categoría
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('bg-[#10b981]', 'text-[#0b1315]', 'font-bold');
    btn.classList.add('bg-[#14262c]', 'border', 'border-[#1b343a]', 'text-[#f0fdf4]');
  });
  event.target.classList.remove('bg-[#14262c]', 'border', 'border-[#1b343a]', 'text-[#f0fdf4]');
  event.target.classList.add('bg-[#10b981]', 'text-[#0b1315]', 'font-bold');

  if (categoriaSeleccionada === 'todos') {
    renderizarMarcadoresMapa(avistamientosGlobales);
  } else {
    const filtrados = avistamientosGlobales.filter(obs => {
      const catObs = (obs.taxon?.iconic_taxon_name || '').toLowerCase();
      const nombreObs = (obs.taxon?.name || obs.taxon?.preferred_common_name || '').toLowerCase();
      const catSel = categoriaSeleccionada.toLowerCase();

      return catObs.includes(catSel) || 
             (catSel === 'mamiferos' && (catObs.includes('mammalia') || catObs.includes('mammal'))) ||
             (catSel === 'aves' && (catObs.includes('aves') || catObs.includes('bird'))) ||
             (catSel === 'reptiles' && (catObs.includes('reptilia') || catObs.includes('reptile'))) ||
             (catSel === 'plantas' && (catObs.includes('plantae') || catObs.includes('plant'))) ||
             (catSel === 'insectos' && (catObs.includes('insecta') || catObs.includes('insect')));
    });
    renderizarMarcadoresMapa(filtrados);
  }
};

// Selector de emojis específicos según la especie ingresada
function obtenerEmojiPorEspecie(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('yaguaret') || n.includes('jaguar') || n.includes('puma') || n.includes('felino')) return '🐆';
  if (n.includes('tucan') || n.includes('tucán') || n.includes('ave') || n.includes('pajaro') || n.includes('loro')) return '🦜';
  if (n.includes('coati') || n.includes('coatí')) return '🦝';
  if (n.includes('mono') || n.includes('caraya') || n.includes('cai')) return '🐒';
  if (n.includes('mariposa') || n.includes('morpho')) return '🦋';
  if (n.includes('orquidea') || n.includes('orquídea') || n.includes('flor')) return '🌸';
  if (n.includes('carpincho') || n.includes('tapir') || n.includes('roedor')) return '🦫';
  if (n.includes('serpiente') || n.includes('yarara') || n.includes('yacare') || n.includes('reptil')) return '🐍';
  if (n.includes('planta') || n.includes('arbol') || n.includes('hoja')) return '🌿';
  return '🐾';
}

// Función global para abrir el modal de confirmación personalizado de eliminación
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
  renderizarMarcadoresMapa(avistamientosGlobales);
}

// Configuración de modales de registro y eliminación
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
      renderizarMarcadoresMapa(avistamientosGlobales);

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
