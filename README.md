# 🌿 EcoSelva 3D - Explorador de la Selva Misionera

## 📌 Público Objetivo, Problema y Propuesta de Valor
**EcoSelva 3D** está diseñado para estudiantes, investigadores, turistas y entusiastas de la naturaleza interesados en la biodiversidad de la provincia de Misiones, Argentina. Muchas veces, la información sobre avistamientos de fauna/flora y las condiciones climáticas regionales se encuentra dispersa. **EcoSelva 3D** resuelve este problema integrando avistamientos biológicos en tiempo real junto con datos meteorológicos locales en un mapa interactivo y visualizaciones 3D, ofreciendo una herramienta educativa y visualmente atractiva para concientizar y explorar la riqueza natural misionera.

---

## 🛠️ APIs Utilizadas
1. **[iNaturalist API](https://www.inaturalist.org/pages/api+reference):** Para obtener registros, ubicaciones geográficas y datos biológicos de avistamientos de flora y fauna en la región de Misiones.
2. **[Open-Meteo API](https://open-meteo.com/):** Para consultar datos meteorológicos en tiempo real (temperatura, humedad, velocidad del viento) de la Selva Misionera.

---

## 🚀 Requisitos Técnicos e Interacción
- **Mapa Interactivo:** Renderizado dinámico de marcadores de avistamientos con Leaflet.js.
- **Visualización 3D:** Globo interactivo y partículas ambientales desarrollados sobre Canvas 3D.
- **Filtros y Búsqueda:** Filtrado por categorías (Mamíferos, Aves, Reptiles, Plantas) y buscador directo por nombre de especie.
- **Persistencia de Datos:** Manejo de favoritos guardados localmente con `localStorage`.
- **Manejo de Estados:** Indicadores visuales de carga, interfaz ante fallas de red/API y panel para búsquedas sin resultados.
- **Diseño Responsive:** Adaptado para dispositivos móviles y de escritorio.

---

## 👥 Integrantes y Roles
- **guido (Datos y APIs):** Consumo e integración de las APIs (iNaturalist y Open-Meteo), manejo de errores y llamadas asíncronas.
- **kevin (Interfaz y Diseño):** Maquetación HTML/CSS responsive, diseño del tema oscuro selva, integración de mapa (Leaflet) y elemento 3D.
- **gero (Lógica e Integración):** Lógica de búsqueda, filtros por categoría, persistencia con `localStorage`, documentación (`README.md`) y despliegue en GitHub Pages.

---

## 📸 Capturas de Pantalla
![Vista Principal de EcoSelva 3D](file:///D:/apis/index.html) 

---

## 🔗 Sitio Publicado
🌐 **Link de GitHub Pages:** [https://gacheguido-oss.github.io/ecoselva3d/](https://gacheguido-oss.github.io/ecoselva3d/)