(() => {
  "use strict";

  /* ---------------------------------------------------------
     Config
  --------------------------------------------------------- */
  const CACHE_KEY = "weather-cache-v1";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  const FALLBACK_COORDS = { lat: -33.8688, lon: 151.2093, name: "Sydney, Australia" };

  const els = {
    clock: document.getElementById("clock"),
    date: document.getElementById("date"),
    greeting: document.getElementById("greeting"),
    location: document.getElementById("location"),
    tempEl: document.getElementById("temp"),
    conditionEl: document.getElementById("condition"),
    humidityEl: document.getElementById("humidity"),
    iconEl: document.getElementById("weather-icon"),
    updatedEl: document.getElementById("updated"),
    themeToggle: document.getElementById("theme-toggle"),
    panel: document.getElementById("panel"),
  };

  /* ---------------------------------------------------------
     Clock + date
  --------------------------------------------------------- */
  function tickClock() {
    const now = new Date();
    els.clock.textContent = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    els.date.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const h = now.getHours();
    const greeting =
      h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Good night";
    els.greeting.textContent = greeting;
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------------------------------------------------------
     Weather icons (inline SVG, keyed by simplified condition)
  --------------------------------------------------------- */
  const ICONS = {
    clear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" stroke-linecap="round"/></svg>`,
    cloudy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 18.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.8 3.8 0 0 0 7.5 18.5Z" stroke-linejoin="round"/></svg>`,
    fog: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 9h13M3 12.5h16M4 16h13M8 19.3h8"/></svg>`,
    rain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 14.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.8 3.8 0 0 0 7.5 14.5Z" stroke-linejoin="round"/><path d="M8.5 17.5l-1.3 2.6M12.5 17.5l-1.3 2.6M16.5 17.5l-1.3 2.6" stroke-linecap="round"/></svg>`,
    storm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 13.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.8 3.8 0 0 0 7.5 13.5Z" stroke-linejoin="round"/><path d="M13 14.5l-3 4.2h3.2L11 22.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
    snow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7.5 14.5h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.8 3.8 0 0 0 7.5 14.5Z" stroke-linejoin="round"/><path d="M9 18v3M9 18l-1.3 1.4M9 18l1.3 1.4M15 18v3M15 18l-1.3 1.4M15 18l1.3 1.4" stroke-linecap="round"/></svg>`,
  };

  // WMO weather_code -> { label, icon, isRain }
  function describeWeatherCode(code) {
    const map = {
      0: ["Clear sky", "clear"],
      1: ["Mostly clear", "clear"],
      2: ["Partly cloudy", "cloudy"],
      3: ["Overcast", "cloudy"],
      45: ["Fog", "fog"],
      48: ["Fog", "fog"],
      51: ["Light drizzle", "rain"],
      53: ["Drizzle", "rain"],
      55: ["Dense drizzle", "rain"],
      56: ["Freezing drizzle", "rain"],
      57: ["Freezing drizzle", "rain"],
      61: ["Light rain", "rain"],
      63: ["Rain", "rain"],
      65: ["Heavy rain", "rain"],
      66: ["Freezing rain", "rain"],
      67: ["Freezing rain", "rain"],
      71: ["Light snow", "snow"],
      73: ["Snow", "snow"],
      75: ["Heavy snow", "snow"],
      77: ["Snow grains", "snow"],
      80: ["Rain showers", "rain"],
      81: ["Rain showers", "rain"],
      82: ["Violent showers", "rain"],
      85: ["Snow showers", "snow"],
      86: ["Snow showers", "snow"],
      95: ["Thunderstorm", "storm"],
      96: ["Thunderstorm, hail", "storm"],
      99: ["Thunderstorm, hail", "storm"],
    };
    const [label, icon] = map[code] || ["Conditions unclear", "cloudy"];
    const isRain = icon === "rain" || icon === "storm" || icon === "snow";
    return { label, icon, isRain };
  }

  /* ---------------------------------------------------------
     Ambient horizon color — reflects time of day + weather
  --------------------------------------------------------- */
  function updateHorizon(isRain) {
    const h = new Date().getHours();
    const isDaytime = h >= 6 && h < 18;
    const isDawnDusk = (h >= 5 && h < 7) || (h >= 17 && h < 19);

    let a = "var(--accent-night)";
    let b = "var(--accent-night)";

    if (isRain) {
      a = "var(--accent-rain)";
      b = "var(--accent-night)";
    } else if (isDawnDusk) {
      a = "var(--accent-day)";
      b = "var(--accent-night)";
    } else if (isDaytime) {
      a = "var(--accent-day)";
      b = "var(--accent-day)";
    } else {
      a = "var(--accent-night)";
      b = "var(--accent-rain)";
    }

    document.documentElement.style.setProperty("--horizon-a", a);
    document.documentElement.style.setProperty("--horizon-b", b);
  }

  /* ---------------------------------------------------------
     Location: geolocation -> reverse geocode (no API key)
  --------------------------------------------------------- */
  async function resolveLocationName(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      if (!res.ok) throw new Error("reverse geocode failed");
      const data = await res.json();
      const parts = [data.locality, data.principalSubdivision || data.countryName].filter(Boolean);
      return parts.length ? parts.join(", ") : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch {
      return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
  }

  function getCoords() {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve({ ...FALLBACK_COORDS, isFallback: true });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, isFallback: false }),
        () => resolve({ ...FALLBACK_COORDS, isFallback: true }),
        { timeout: 8000, maximumAge: 10 * 60 * 1000 }
      );
    });
  }

  /* ---------------------------------------------------------
     Weather fetch with localStorage cache (10 min TTL)
  --------------------------------------------------------- */
  function readCache(cacheKey) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.key !== cacheKey) return null;
      if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(cacheKey, data) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ key: cacheKey, fetchedAt: Date.now(), data })
      );
    } catch {
      /* storage unavailable — fail silently, just skip caching */
    }
  }

  async function fetchWeather(lat, lon) {
    const roundedLat = lat.toFixed(2);
    const roundedLon = lon.toFixed(2);
    const cacheKey = `${roundedLat},${roundedLon}`;

    const cached = readCache(cacheKey);
    if (cached) return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true };

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("weather fetch failed");
    const data = await res.json();
    writeCache(cacheKey, data);
    return { data, fetchedAt: Date.now(), fromCache: false };
  }

  function renderWeather(result) {
    const c = result.data.current;
    const { label, icon, isRain } = describeWeatherCode(c.weather_code);

    els.tempEl.textContent = `${Math.round(c.temperature_2m)}\u00b0`;
    els.conditionEl.textContent = label;
    els.humidityEl.textContent = `${Math.round(c.relative_humidity_2m)}%`;
    els.iconEl.innerHTML = ICONS[icon] || ICONS.cloudy;

    updateHorizon(isRain);

    const stamp = new Date(result.fetchedAt).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    els.updatedEl.textContent = `Updated ${stamp}${result.fromCache ? " · cached" : ""}`;
  }

  async function refreshWeather(coords) {
    try {
      const result = await fetchWeather(coords.lat, coords.lon);
      renderWeather(result);
    } catch {
      els.conditionEl.textContent = "Weather unavailable right now";
      els.tempEl.textContent = "\u2014\u00b0";
      updateHorizon(false);
    }
  }

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  let currentCoords = null;

  async function boot() {
    currentCoords = await getCoords();

    els.location.textContent = currentCoords.isFallback
      ? "Location unavailable"
      : "Locating\u2026";

    if (!currentCoords.isFallback) {
      resolveLocationName(currentCoords.lat, currentCoords.lon).then((name) => {
        els.location.textContent = name;
      });
    } else if (currentCoords.name) {
      // Using fallback coords silently to still show weather; be upfront about it.
      els.location.textContent = "Location unavailable";
    }

    await refreshWeather(currentCoords);

    // Refresh weather every 10 minutes while the page stays open.
    setInterval(() => {
      if (currentCoords) refreshWeather(currentCoords);
    }, CACHE_TTL_MS);
  }

  boot();

  /* ---------------------------------------------------------
     Theme toggle (persisted, respects system preference)
  --------------------------------------------------------- */
  const THEME_KEY = "theme-preference";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      applyTheme(saved);
      return;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(prefersDark ? "dark" : "light");
  }

  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  });

  initTheme();
})();
