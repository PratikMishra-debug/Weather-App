/* ================================================================
   SkyView Weather App — script.js
   Uses Open-Meteo API (100% free, no API key required)
   ================================================================ */

/* ── API ENDPOINTS ── */
const GEO_URL     = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

/* ── STATE ── */
let map         = null;
let marker      = null;
let currentMode = 'world';
let currentLat  = 20.59;
let currentLon  = 78.96;


/* ================================================================
   CLOCK & DATE
   ================================================================ */
function updateClock() {
  const now = new Date();

  const timeStr = now.toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
  });

  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });

  document.getElementById('clock').textContent        = timeStr;
  document.getElementById('date-display').textContent = dateStr;

  /* update sky scene to current hour */
  updateSkyScene(now.getHours());
}

/* Run immediately, then every second */
updateClock();
setInterval(updateClock, 1000);


/* ================================================================
   ANIMATED SKY SCENE
   Changes gradient + sun/moon based on hour of day
   ================================================================ */
function updateSkyScene(hour) {
  const ball  = document.getElementById('skyball');
  const scene = document.getElementById('scene');

  const isDaytime = hour >= 6 && hour < 18;

  if (isDaytime) {
    ball.classList.remove('night');

    /* arc position: peaks high at noon */
    const progress = (hour - 6) / 12;
    const topPx    = 80 - Math.sin(progress * Math.PI) * 50;
    ball.style.top = Math.max(10, topPx) + 'px';

    if (hour < 10) {
      /* Sunrise — warm orange/pink */
      scene.style.background =
        'linear-gradient(170deg, #1a2a5c 0%, #c06030 30%, #e89040 55%, #87ceeb 100%)';
    } else if (hour >= 16) {
      /* Sunset — red/purple */
      scene.style.background =
        'linear-gradient(170deg, #3a1a5c 0%, #c04030 25%, #e06020 50%, #f0a040 75%, #87ceeb 100%)';
    } else {
      /* Midday — clear blue */
      scene.style.background =
        'linear-gradient(170deg, #0d1f3a 0%, #1a6fa8 35%, #2d9ccf 60%, #87ceeb 100%)';
    }
  } else {
    /* Night */
    ball.classList.add('night');
    ball.style.top = '50px';
    scene.style.background =
      'linear-gradient(170deg, #050a15 0%, #0d1b2a 40%, #1a2a4a 70%, #1e3555 100%)';
  }
}


/* ================================================================
   LEAFLET MAP
   ================================================================ */
function initMap() {
  map = L.map('map', {
    zoomControl:       true,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
  }).addTo(map);

  /* Default world view centred on India */
  map.setView([currentLat, currentLon], 4);
}

/**
 * Switch between World and India map views.
 * @param {string} mode  - 'world' | 'india'
 * @param {HTMLElement} btn - the clicked tab button
 */
function switchMap(mode, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentMode = mode;

  if (!map) return;

  if (mode === 'india') {
    map.setView([20.59, 78.96], 5);
  } else {
    map.setView([currentLat, currentLon], 4);
  }
}

/**
 * Drop / move the pin on the map.
 */
function setMapPin(lat, lon) {
  currentLat = lat;
  currentLon = lon;

  if (!map) return;

  /* Build a custom yellow dot icon */
  const icon = L.divIcon({
    html: `<div style="
      width:18px;height:18px;
      background:#f0c040;
      border-radius:50%;
      border:3px solid #fff;
      box-shadow:0 0 10px rgba(0,0,0,0.45);
    "></div>`,
    iconSize:   [18, 18],
    iconAnchor: [9, 9],
    className:  '',
  });

  if (marker) map.removeLayer(marker);
  marker = L.marker([lat, lon], { icon }).addTo(map);

  const zoom = currentMode === 'india' ? 7 : 6;
  map.setView([lat, lon], zoom);
}


/* ================================================================
   WEATHER ICON (emoji) & DESCRIPTION  — WMO weather code
   ================================================================ */
function wmoIcon(code, isDay) {
  if (code === 0)            return isDay ? '☀️'  : '🌙';
  if (code <= 2)             return isDay ? '🌤️' : '🌥️';
  if (code <= 3)             return '☁️';
  if (code <= 49)            return '🌫️';
  if (code <= 57)            return '🌦️';
  if (code <= 67)            return '🌧️';
  if (code <= 77)            return '❄️';
  if (code <= 82)            return '🌨️';
  if (code <= 84)            return '🌩️';
  if (code <= 99)            return '⛈️';
  return '🌡️';
}

const WMO_DESCRIPTIONS = {
  0:  'Clear sky',
  1:  'Mainly clear',
  2:  'Partly cloudy',
  3:  'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

function wmoDesc(code) {
  return WMO_DESCRIPTIONS[code] || 'Unknown';
}

/**
 * Convert wind degrees to a compass direction string.
 */
function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Convert a 2-letter ISO country code into a flag emoji.
 */
function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return code
    .toUpperCase()
    .replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}


/* ================================================================
   SEARCH
   ================================================================ */

/* Wire up Enter key */
document.getElementById('search-input')
  .addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (q) searchCity(q);
}

/**
 * Geocode a city name then fetch its weather.
 * @param {string} city
 */
async function searchCity(city) {
  setStatus('🔍 Searching for ' + city + '…', 'info');
  document.getElementById('search-input').value = city;

  try {
    const url = `${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const geo  = await fetch(url).then(r => r.json());

    if (!geo.results || geo.results.length === 0) {
      setStatus('❌ City not found. Try another name.', 'error');
      return;
    }

    const loc = geo.results[0];
    setStatus('⛅ Loading weather…', 'info');

    await fetchWeather(
      loc.latitude,
      loc.longitude,
      loc.name,
      loc.country     || '',
      loc.admin1      || '',
      loc.country_code || '',
    );

  } catch (err) {
    console.error(err);
    setStatus('❌ Network error. Check your connection and try again.', 'error');
  }
}


/* ================================================================
   WEATHER DATA  (Open-Meteo — free, no key needed)
   ================================================================ */
async function fetchWeather(lat, lon, city, country, region, countryCode) {

  /* Current weather variables */
  const currentVars = [
    'temperature_2m',
    'apparent_temperature',
    'relative_humidity_2m',
    'precipitation',
    'wind_speed_10m',
    'wind_direction_10m',
    'visibility',
    'surface_pressure',
    'cloud_cover',
    'weathercode',
    'is_day',
    'uv_index',
    'dew_point_2m',
  ].join(',');

  /* Hourly variables (today only) */
  const hourlyVars = [
    'temperature_2m',
    'precipitation_probability',
    'weathercode',
    'precipitation',
  ].join(',');

  try {
    const [currRes, hourRes] = await Promise.all([
      fetch(`${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=${currentVars}&timezone=auto`)
        .then(r => r.json()),
      fetch(`${WEATHER_URL}?latitude=${lat}&longitude=${lon}&hourly=${hourlyVars}&timezone=auto&forecast_days=1`)
        .then(r => r.json()),
    ]);

    const c      = currRes.current;
    const isDay  = c.is_day === 1;

    /* ── Hero card ── */
    document.getElementById('city-name').innerHTML =
      `${city} <span class="country-flag">${countryFlag(countryCode)}</span>`;

    document.getElementById('region-name').textContent =
      `${region ? region + ', ' : ''}${country}`;

    document.getElementById('weather-icon').textContent  = wmoIcon(c.weathercode, isDay);
    document.getElementById('temp-val').textContent      = Math.round(c.temperature_2m);
    document.getElementById('weather-desc').textContent  = wmoDesc(c.weathercode);
    document.getElementById('feels-like').textContent    =
      `Feels like ${Math.round(c.apparent_temperature)}°C`;

    /* ── Stat row ── */
    document.getElementById('wind-val').textContent  = Math.round(c.wind_speed_10m);
    document.getElementById('humid-val').textContent = Math.round(c.relative_humidity_2m);
    document.getElementById('rain-val').textContent  = c.precipitation.toFixed(1);

    /* ── Details card ── */
    document.getElementById('vis-val').textContent     =
      (c.visibility / 1000).toFixed(1) + ' km';
    document.getElementById('pres-val').textContent    =
      Math.round(c.surface_pressure) + ' hPa';
    document.getElementById('dew-val').textContent     =
      Math.round(c.dew_point_2m) + '°C';
    document.getElementById('cloud-val').textContent   =
      Math.round(c.cloud_cover) + ' %';
    document.getElementById('winddir-val').textContent =
      windDir(c.wind_direction_10m) + ' ' + Math.round(c.wind_direction_10m) + '°';
    document.getElementById('uv-val').textContent      =
      (c.uv_index !== undefined && c.uv_index !== null)
        ? c.uv_index.toFixed(1)
        : '—';

    /* ── Map ── */
    setMapPin(lat, lon);

    /* ── Hourly forecast ── */
    renderHourly(hourRes.hourly);

    setStatus('', 'info');

  } catch (err) {
    console.error(err);
    setStatus('❌ Failed to load weather data. Please try again.', 'error');
  }
}


/* ================================================================
   HOURLY FORECAST RENDER
   ================================================================ */
function renderHourly(h) {
  const now     = new Date();
  const curHour = now.getHours();
  const today   = now.getDate();

  const times = h.time || [];
  let html    = '';

  for (let i = 0; i < times.length; i++) {
    const t = new Date(times[i]);

    /* skip hours already passed today */
    if (t.getDate() === today && t.getHours() < curHour) continue;

    const hr    = t.getHours();
    const isDay = hr >= 6 && hr < 18;
    const icon  = wmoIcon(h.weathercode[i], isDay);
    const rain  = h.precipitation_probability
      ? (h.precipitation_probability[i] ?? 0)
      : 0;

    const label = (t.getDate() === today && hr === curHour)
      ? 'Now'
      : t.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });

    html += `
      <div class="hour-item">
        <div class="hour-time">${label}</div>
        <div class="hour-icon">${icon}</div>
        <div class="hour-temp">${Math.round(h.temperature_2m[i])}°</div>
        <div class="hour-rain">💧 ${rain}%</div>
      </div>`;
  }

  document.getElementById('hourly-row').innerHTML =
    html || '<div class="no-data-msg">No hourly data available</div>';
}


/* ================================================================
   UTILITY — STATUS MESSAGE
   ================================================================ */
/**
 * Show a status / error message below the search bar.
 * @param {string} msg   - message text (empty string hides the bar)
 * @param {'info'|'error'} type
 */
function setStatus(msg, type = 'info') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className   = msg ? type : '';
}


/* ================================================================
   INIT
   ================================================================ */
window.addEventListener('load', () => {
  initMap();
  /* Load Delhi by default */
  searchCity('Delhi');
});