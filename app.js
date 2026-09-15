(function () {
  "use strict";

  const TABS = [
    { id: "inicio", label: "Inicio" },
    ...GUIDE.days.map((d) => ({ id: d.id, label: d.shortLabel })),
    { id: "comer", label: "Comer" },
    { id: "info", label: "Info" },
    { id: "tren", label: "Tren" },
  ];

  const TRIP_START = new Date(2026, 8, 15);
  const TRIP_END = new Date(2026, 8, 19);
  const DAY_BY_DATE = {
    15: "martes",
    16: "miercoles",
    17: "jueves",
    18: "viernes",
    19: "sabado",
  };

  const main = document.getElementById("app-main");
  const nav = document.getElementById("tab-nav");
  const headerDates = document.getElementById("header-dates");

  let activeTab = "inicio";
  let foodFilter = "restaurants";
  let hideVisited = false;
  let onlyEssentials = false;

  const VISITED_KEY = "romaguia-visited-v1";
  const CHOSEN_KEY = "romaguia-food-chosen-v1";
  const ACCESS_KEY = "romaguia-access-unlocked-v1";

  function isAccessUnlocked() {
    try {
      return localStorage.getItem(ACCESS_KEY) === "1";
    } catch {
      return false;
    }
  }

  function setAccessUnlocked(ok) {
    try {
      if (ok) localStorage.setItem(ACCESS_KEY, "1");
      else localStorage.removeItem(ACCESS_KEY);
    } catch {
      /* ignore */
    }
  }

  function loadVisited() {
    try {
      return JSON.parse(localStorage.getItem(VISITED_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveVisited(map) {
    localStorage.setItem(VISITED_KEY, JSON.stringify(map));
  }

  function isVisited(id) {
    return Boolean(loadVisited()[id]);
  }

  function toggleVisited(id) {
    const map = loadVisited();
    if (map[id]) delete map[id];
    else map[id] = Date.now();
    saveVisited(map);
  }

  function loadChosen() {
    try {
      return JSON.parse(localStorage.getItem(CHOSEN_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveChosen(map) {
    localStorage.setItem(CHOSEN_KEY, JSON.stringify(map));
  }

  function foodKey(f) {
    return `${f.day || ""}|${f.name || ""}`;
  }

  function isChosen(f) {
    return Boolean(loadChosen()[foodKey(f)]);
  }

  function toggleChosen(key) {
    const map = loadChosen();
    if (map[key]) delete map[key];
    else map[key] = Date.now();
    saveChosen(map);
  }

  function dayProgress(day) {
    const stops = day.sections.flatMap((s) => s.stops);
    const done = stops.filter((s) => isVisited(s.id)).length;
    return { done, total: stops.length };
  }

  function tripDayIdForDate(date) {
    if (date.getFullYear() === 2026 && date.getMonth() === 8) {
      return DAY_BY_DATE[date.getDate()] || null;
    }
    return null;
  }

  function formatCountdown(ms) {
    if (ms <= 0) return "ya toca / en curso";
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h <= 0) return `en ${m} min`;
    return `en ${h}h ${m} min`;
  }

  function nextTicket(now) {
    return GUIDE.tickets
      .filter((t) => t.booked && t.at)
      .map((t) => ({ ...t, whenDate: new Date(t.at) }))
      .filter((t) => t.whenDate.getTime() + 60 * 60 * 1000 > now.getTime())
      .sort((a, b) => a.whenDate - b.whenDate)[0];
  }

  function nextStopForDay(day) {
    if (!day) return null;
    const stops = day.sections.flatMap((s) => s.stops);
    return stops.find((s) => !isVisited(s.id)) || null;
  }

  function renderHoyWidget() {
    const now = new Date();
    const dayId = tripDayIdForDate(now);
    const day = dayId ? GUIDE.days.find((d) => d.id === dayId) : null;
    const beforeTrip = now < TRIP_START;
    const afterTrip = now > TRIP_END;
    const ticket = nextTicket(now);
    const stop = nextStopForDay(day);

    let headline = "Antes del viaje";
    let sub = "15–19 sep 2026 · Monti (Via dei Capocci, 86)";
    if (day) {
      headline = `Hoy · ${day.label}`;
      sub = day.subtitle;
    } else if (afterTrip) {
      headline = "Viaje terminado";
      sub = "Podéis repasar los días o las listas de Comer.";
    } else if (beforeTrip) {
      const daysLeft = Math.ceil((TRIP_START - now) / 86400000);
      sub = `Faltan ${daysLeft} día${daysLeft === 1 ? "" : "s"} · revisad entradas y apps offline`;
    }

    const ticketBlock = ticket
      ? `<div class="mt-3 p-3 rounded-xl bg-porphyry/10">
          <p class="text-xs font-bold uppercase tracking-wide text-porphyry">Próxima entrada</p>
          <p class="font-semibold mt-1">${escapeHtml(ticket.name)}</p>
          <p class="text-sm text-ink/70">${escapeHtml(ticket.when)} · ${formatCountdown(ticket.whenDate - now)}</p>
          ${
            ticket.arriveEarlyMin
              ? `<p class="text-sm text-ink/60 mt-1">Llegar ${ticket.arriveEarlyMin} min antes</p>`
              : ""
          }
          ${
            ticket.dayId
              ? `<button type="button" data-tab-jump="${escapeHtml(ticket.dayId)}" class="mt-3 w-full min-h-[44px] rounded-xl bg-porphyry text-white text-sm font-semibold">Ir al día →</button>`
              : ""
          }
        </div>`
      : `<p class="text-sm text-ink/60 mt-3">No hay más entradas compradas pendientes.</p>`;

    const stopBlock = stop
      ? `<div class="mt-3 p-3 rounded-xl bg-white/80 border border-ink/5">
          <p class="text-xs font-bold uppercase tracking-wide text-ink/50">Siguiente parada</p>
          <p class="font-semibold mt-1">${escapeHtml(stop.time || "")} · ${escapeHtml(stop.title)}</p>
          ${day ? `<button type="button" data-tab-jump="${escapeHtml(day.id)}" class="mt-3 w-full min-h-[44px] rounded-xl border border-ink/15 text-sm font-semibold">Abrir ${escapeHtml(day.shortLabel)}</button>` : ""}
        </div>`
      : day
        ? `<p class="text-sm text-maps mt-3 font-medium">✓ Día completado (o todo marcado visitado)</p>`
        : "";

    return `
      <section class="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm">
        <p class="text-xs font-bold uppercase tracking-widest text-porphyry">Ahora</p>
        <h2 class="font-display text-2xl mt-1">${escapeHtml(headline)}</h2>
        <p class="text-sm text-ink/70 mt-1">${escapeHtml(sub)}</p>
        ${day && day.note ? `<p class="text-sm text-ink/75 mt-3 leading-relaxed">${escapeHtml(day.note)}</p>` : ""}
        ${day && day.foodWarning ? `<p class="text-sm mt-3 p-3 rounded-xl bg-star/15 border border-star/20">${escapeHtml(day.foodWarning)}</p>` : ""}
        ${ticketBlock}
        ${stopBlock}
      </section>`;
  }

  function renderInstallBlock() {
    return `
      <section class="p-5 rounded-2xl bg-white/80 border border-ink/5">
        <h2 class="font-display text-xl">Añadir a la pantalla de inicio</h2>
        <p class="text-sm text-ink/70 mt-2">Así la abres como una app, sin buscar el enlace.</p>
        <ul class="mt-3 space-y-2 text-sm text-ink/80 leading-relaxed list-disc pl-5">
          <li><span class="font-semibold">Android (Chrome):</span> menú ⋮ → “Añadir a pantalla de inicio” / “Instalar app”.</li>
          <li><span class="font-semibold">iPhone (Safari):</span> compartir □↑ → “Añadir a pantalla de inicio”.</li>
        </ul>
        <p class="text-xs text-ink/50 mt-3">URL: https://javir11.github.io/romaguia/</p>
      </section>`;
  }

  function renderPocketKit() {
    const kit = GUIDE.pocketKit;
    if (!kit) return "";
    const emergencies = (kit.emergencies || [])
      .map(
        (e) => `
        <a href="${escapeHtml(e.href)}" class="flex items-center justify-between min-h-[48px] px-4 rounded-xl bg-white border border-ink/10 font-semibold">
          <span>${escapeHtml(e.label)}</span>
          <span class="text-porphyry tabular-nums">${escapeHtml(e.value)}</span>
        </a>`
      )
      .join("");
    const items = (kit.items || [])
      .map(
        (i) => `
        <li class="mb-3 p-4 rounded-2xl bg-white/80 border border-ink/5">
          <h3 class="font-semibold">${escapeHtml(i.title)}</h3>
          <p class="text-sm mt-1.5 text-ink/75 leading-relaxed">${escapeHtml(i.text)}</p>
        </li>`
      )
      .join("");

    return `
      <section>
        <h2 class="font-display text-xl mb-2">Kit de bolsillo</h2>
        <p class="text-sm text-ink/65 mb-3">${escapeHtml(kit.weather || "")}</p>
        <div class="p-4 rounded-2xl bg-white/80 border border-ink/5 mb-4">
          <p class="text-xs font-bold uppercase tracking-wide text-ink/50">Casa</p>
          <p class="font-semibold mt-1">${escapeHtml(GUIDE.meta.homeAddress)}</p>
          <div class="flex gap-2 mt-3">
            <button type="button" data-copy="${escapeHtml(GUIDE.meta.homeAddress)}" class="flex-1 min-h-[48px] rounded-xl border border-ink/15 text-sm font-semibold">Copiar dirección</button>
          </div>
          ${mapsButton(GUIDE.meta.homeMaps, "mt-2 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-maps text-white text-sm font-semibold")}
          ${kit.pharmacyMaps ? mapsButton(kit.pharmacyMaps, "mt-2 flex w-full min-h-[48px] items-center justify-center rounded-xl border border-maps text-maps text-sm font-semibold").replace("📍 Abrir en Maps", "📍 Farmacia cerca") : ""}
        </div>
        <p class="text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">Emergencias</p>
        <div class="space-y-2 mb-4">${emergencies}</div>
        <ul class="list-none p-0 m-0">${items}</ul>
      </section>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stars(n) {
    if (!n) return "";
    return `<span class="text-star text-sm tracking-tight" aria-label="${n} estrellas">${"★".repeat(n)}</span>`;
  }

  function mapsButton(url, className) {
    if (!url) return "";
    const cls =
      className ||
      "mt-4 flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-maps text-white text-base font-semibold shadow-sm active:scale-[0.98] transition-transform";
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="${cls}">📍 Abrir en Maps</a>`;
  }

  function badges(stop) {
    const b = [];
    if (stop.ticket) b.push("Entrada comprada");
    if (stop.optional) b.push("Opcional");
    if (stop.free) b.push("Gratis");
    if (!b.length) return "";
    return `<div class="flex flex-wrap gap-1.5 mt-2">${b
      .map(
        (t) =>
          `<span class="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-porphyry/10 text-porphyry">${escapeHtml(t)}</span>`
      )
      .join("")}</div>`;
  }

  function walkConnector(walk) {
    if (!walk) return "";
    return `
      <div class="pl-8 py-2">
        <p class="inline-flex max-w-full items-start gap-2 text-sm font-medium text-ink/70 bg-white/60 border border-ink/10 rounded-full px-3 py-1.5">
          <span class="text-porphyry shrink-0" aria-hidden="true">↓</span>
          <span>${escapeHtml(walk)}</span>
        </p>
      </div>`;
  }

  function renderStopCard(stop, isLast, showWalk) {
    const visited = isVisited(stop.id);
    const visitedBtn = `
      <button type="button" data-visit="${escapeHtml(stop.id)}"
        class="mt-3 w-full min-h-[48px] rounded-2xl border text-sm font-semibold transition-colors ${
          visited
            ? "bg-maps text-white border-maps"
            : "bg-white text-ink border-ink/20"
        }">
        ${visited ? "✓ Visitado — tocar para desmarcar" : "Marcar como visitado"}
      </button>`;

    return `
      <li class="relative pl-8 ${isLast ? "pb-2" : "pb-2"}">
        ${showWalk ? walkConnector(stop.walk) : ""}
        <span class="absolute left-0 ${showWalk && stop.walk ? "top-[3.25rem]" : "top-1.5"} w-3 h-3 rounded-full ${
          visited ? "bg-maps" : "bg-porphyry"
        } ring-4 ring-marble" aria-hidden="true"></span>
        ${!isLast ? `<span class="absolute left-[5px] ${showWalk && stop.walk ? "top-[3.75rem]" : "top-4"} bottom-0 w-0.5 timeline-line" aria-hidden="true"></span>` : ""}
        <article class="rounded-2xl border p-5 shadow-sm ${
          visited
            ? "bg-maps/5 border-maps/30 opacity-80"
            : "bg-white/80 border-ink/5"
        }">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <time class="text-sm font-bold text-porphyry tabular-nums">${escapeHtml(stop.time || "")}</time>
            <h3 class="text-lg font-semibold leading-snug flex-1 min-w-[10rem] ${visited ? "line-through decoration-maps/40" : ""}">${escapeHtml(stop.title)}</h3>
            ${stars(stop.stars)}
          </div>
          ${badges(stop)}
          ${stop.duration ? `<p class="text-sm text-ink/60 mt-2"><span class="font-medium text-ink/80">Tiempo en el sitio:</span> ${escapeHtml(stop.duration)}</p>` : ""}
          ${stop.walk && !showWalk ? `<p class="text-sm text-ink/60 mt-1"><span class="font-medium text-ink/80">Desde el anterior:</span> ${escapeHtml(stop.walk)}</p>` : ""}
          ${stop.note ? `<p class="text-[15px] leading-relaxed text-ink/85 mt-3">${escapeHtml(stop.note)}</p>` : ""}
          ${stop.entrance ? `<p class="text-sm mt-3 p-3 rounded-xl bg-porphyry/5 text-ink/80"><span class="font-semibold text-porphyry">Por dónde entrar:</span> ${escapeHtml(stop.entrance)}</p>` : ""}
          ${stop.tip ? `<p class="text-sm mt-3 p-3 rounded-xl bg-star/15 text-ink/85 border border-star/20"><span class="font-semibold text-star">Tip:</span> ${escapeHtml(stop.tip)}</p>` : ""}
          ${stop.lookFor ? renderLookFor(stop.lookFor) : ""}
          ${mapsButton(stop.mapsUrl)}
          ${visitedBtn}
        </article>
      </li>`;
  }

  function renderLookFor(lookFor) {
    const items = normalizeLookFor(lookFor);
    if (!items.length) return "";
    const body = items
      .map((item) => {
        if (item.title) {
          return `<li class="mb-2 last:mb-0"><span class="font-semibold text-ink">${escapeHtml(item.title)}:</span> ${escapeHtml(item.text)}</li>`;
        }
        return `<li class="mb-2 last:mb-0">${escapeHtml(item.text)}</li>`;
      })
      .join("");
    return `
      <div class="text-sm mt-3 p-3 rounded-xl bg-star/10 text-ink/85">
        <p class="font-semibold text-star mb-2">En qué fijarse</p>
        <ul class="list-disc pl-4 space-y-1 leading-relaxed">${body}</ul>
      </div>`;
  }

  function normalizeLookFor(lookFor) {
    if (!lookFor) return [];
    if (typeof lookFor === "string") return [{ text: lookFor }];
    if (!Array.isArray(lookFor)) return [];
    return lookFor.map((item) => {
      if (typeof item === "string") return { text: item };
      return { title: item.title || item.label || "", text: item.text || "" };
    }).filter((i) => i.text);
  }

  function foodForDay(dayKey) {
    const types = ["restaurants", "gelato", "street"];
    const items = [];
    types.forEach((t) => {
      GUIDE.food[t].forEach((f) => {
        if (f.day === dayKey || (dayKey === "sabado" && f.dayLabel?.includes("Sábado"))) {
          items.push({ ...f, type: t });
        }
        if (dayKey === "martes" && f.dayLabel?.includes("Martes / Sábado")) {
          items.push({ ...f, type: t });
        }
      });
    });
    return items;
  }

  function renderFoodShortcuts(dayKey) {
    const items = foodForDay(dayKey).filter((f) => f.mapsUrl && !f.pending);
    if (!items.length) return "";
    const cards = items
      .slice(0, 6)
      .map(
        (f) => `
        <div class="rounded-xl border border-ink/5 bg-white/70 p-4">
          <p class="font-semibold">${escapeHtml(f.name)}</p>
          <p class="text-xs text-ink/55 mt-1">${escapeHtml(f.address || f.desc || "")}</p>
          ${mapsButton(f.mapsUrl, "mt-3 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-maps text-white text-sm font-semibold")}
        </div>`
      )
      .join("");
    return `
      <section class="mt-8">
        <h2 class="text-xs font-bold uppercase tracking-widest text-ink/50 mb-3">Comer cerca</h2>
        <div class="grid gap-3">${cards}</div>
        <p class="text-sm text-ink/55 mt-3">Más opciones en la pestaña <strong>Comer</strong>.</p>
      </section>`;
  }

  function renderDay(day) {
    const { done, total } = dayProgress(day);
    const sections = day.sections
      .map((sec) => {
        let stops = sec.stops.slice();
        if (hideVisited) stops = stops.filter((s) => !isVisited(s.id));
        if (onlyEssentials) stops = stops.filter((s) => (s.stars || 0) >= 3);
        if (!stops.length) {
          return `
            <section class="mb-6">
              <h2 class="text-xs font-bold uppercase tracking-widest text-porphyry mb-4">${escapeHtml(sec.label)}</h2>
              <p class="text-sm text-ink/55 pl-1">Nada que mostrar con estos filtros.</p>
            </section>`;
        }
        return `
        <section class="mb-6">
          <h2 class="text-xs font-bold uppercase tracking-widest text-porphyry mb-4">${escapeHtml(sec.label)}</h2>
          <ol class="list-none m-0 p-0 relative">${stops
            .map((s, i) => renderStopCard(s, i === stops.length - 1, i > 0))
            .join("")}</ol>
        </section>`;
      })
      .join("");

    return `
      <div class="animate-in fade-in duration-300">
        <header class="mb-6 px-1">
          <h2 class="font-display text-2xl text-ink">${escapeHtml(day.label)}</h2>
          <p class="text-porphyry font-medium">${escapeHtml(day.subtitle)}</p>
          <p class="text-sm mt-2 text-ink/60">${done} / ${total} visitados</p>
          <div class="flex flex-col gap-2 mt-3">
            <button type="button" data-toggle-pending class="w-full min-h-[48px] rounded-2xl text-sm font-semibold border ${
              hideVisited
                ? "bg-porphyry text-white border-porphyry"
                : "bg-white text-ink border-ink/15"
            }">${hideVisited ? "Mostrando solo pendientes" : "Solo pendientes"}</button>
            <button type="button" data-toggle-essentials class="w-full min-h-[48px] rounded-2xl text-sm font-semibold border ${
              onlyEssentials
                ? "bg-star text-white border-star"
                : "bg-white text-ink border-ink/15"
            }">${onlyEssentials ? "Mostrando solo ★★★" : "Solo ★★★"}</button>
          </div>
          ${day.note ? `<p class="text-[15px] leading-relaxed text-ink/75 mt-3">${escapeHtml(day.note)}</p>` : ""}
          ${day.foodWarning ? `<p class="text-sm mt-3 p-4 rounded-2xl bg-star/15 text-ink border border-star/20">${escapeHtml(day.foodWarning)}</p>` : ""}
        </header>
        ${sections}
        ${renderFoodShortcuts(day.foodDayKey)}
      </div>`;
  }

  function renderAccessGate() {
    const a = GUIDE.access;
    if (!a) return "";

    if (!isAccessUnlocked()) {
      return `
        <section class="p-5 rounded-2xl bg-white border border-ink/10 shadow-sm">
          <h2 class="font-display text-xl">Códigos de acceso</h2>
          <p class="text-sm text-ink/70 mt-2">Protegido. Introduce el código para ver la puerta del edificio y el apartamento.</p>
          <form id="access-unlock-form" class="mt-4 space-y-3" autocomplete="off">
            <label class="block text-sm font-medium text-ink/80" for="access-pin">Código</label>
            <input
              id="access-pin"
              name="pin"
              type="password"
              inputmode="numeric"
              pattern="[0-9]*"
              maxlength="8"
              class="w-full min-h-[52px] px-4 rounded-2xl border border-ink/20 bg-marble text-lg tracking-widest"
              placeholder="••••"
              required
            />
            <p id="access-pin-error" class="text-sm text-porphyry hidden">Código incorrecto.</p>
            <button type="submit" class="w-full min-h-[52px] rounded-2xl bg-porphyry text-white font-semibold">Desbloquear</button>
          </form>
        </section>`;
    }

    const b = a.building;
    const apt = a.apartment;
    return `
      <section class="p-5 rounded-2xl bg-white border border-maps/30 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-display text-xl">Códigos de acceso</h2>
          <button type="button" data-access-lock class="text-xs font-semibold uppercase tracking-wide text-ink/50 min-h-[44px] px-2">Ocultar</button>
        </div>
        <article class="mt-4 p-4 rounded-2xl bg-maps/5 border border-maps/15">
          <h3 class="font-semibold text-porphyry">${escapeHtml(b.title)}</h3>
          <p class="text-3xl font-bold tabular-nums tracking-wider mt-2">${escapeHtml(b.code)}🔑</p>
          <ol class="mt-3 space-y-2 list-decimal pl-5 text-[15px] text-ink/85 leading-relaxed">
            ${b.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
          </ol>
        </article>
        <article class="mt-3 p-4 rounded-2xl bg-maps/5 border border-maps/15">
          <h3 class="font-semibold text-porphyry">${escapeHtml(apt.title)} ${escapeHtml(apt.number)}</h3>
          <p class="text-sm text-ink/70 mt-1">${escapeHtml(apt.where)}</p>
          <p class="text-3xl font-bold tabular-nums tracking-wider mt-2">${escapeHtml(apt.code)}🔑</p>
          <p class="text-sm text-ink/60 mt-2">Mismo gesto: código + 🔑 + abrir.</p>
        </article>
      </section>`;
  }

  function renderFlights() {
    const f = GUIDE.flights;
    if (!f) return "";
    return `
      <section>
        <h2 class="font-display text-xl mb-3">Vuelos</h2>
        <ul class="space-y-2 list-none p-0 m-0">
          <li class="p-4 rounded-2xl bg-white/80 border border-ink/5">
            <p class="text-xs font-bold uppercase tracking-wide text-porphyry">${escapeHtml(f.outbound.label)} · ${escapeHtml(f.outbound.date)}</p>
            <p class="font-semibold text-lg mt-1 tabular-nums">${escapeHtml(f.outbound.summary)}</p>
            <p class="text-sm text-ink/60 mt-1">${escapeHtml(f.outbound.from)} ${escapeHtml(f.outbound.dep)} → ${escapeHtml(f.outbound.to)} ${escapeHtml(f.outbound.arr)}</p>
          </li>
          <li class="p-4 rounded-2xl bg-white/80 border border-ink/5">
            <p class="text-xs font-bold uppercase tracking-wide text-porphyry">${escapeHtml(f.return.label)} · ${escapeHtml(f.return.date)}</p>
            <p class="font-semibold text-lg mt-1 tabular-nums">${escapeHtml(f.return.summary)}</p>
            <p class="text-sm text-ink/60 mt-1">${escapeHtml(f.return.from)} ${escapeHtml(f.return.dep)} → ${escapeHtml(f.return.to)} ${escapeHtml(f.return.arr)}</p>
          </li>
        </ul>
      </section>`;
  }

  function renderInicio() {
    const tickets = GUIDE.tickets
      .map(
        (t) => `
        <li class="flex gap-3 p-4 rounded-2xl bg-white/80 border border-ink/5">
          <span class="text-lg shrink-0">${t.booked ? "✔" : "○"}</span>
          <div>
            <p class="font-semibold">${escapeHtml(t.name)}</p>
            <p class="text-sm text-ink/65">${escapeHtml(t.when)}${t.note ? " · " + escapeHtml(t.note) : ""}</p>
          </div>
        </li>`
      )
      .join("");

    const legend = GUIDE.starLegend
      .map(
        (l) => `
        <li class="py-2 border-b border-ink/5 last:border-0">
          <span class="text-star">${l.level ? "★".repeat(l.level) : "—"}</span>
          <span class="font-semibold text-sm ml-1">${escapeHtml(l.label)}</span>
          <p class="text-sm text-ink/65 mt-0.5">${escapeHtml(l.desc)}</p>
        </li>`
      )
      .join("");

    return `
      <div class="space-y-8">
        ${renderHoyWidget()}
        ${renderFlights()}
        ${renderAccessGate()}
        ${renderInstallBlock()}
        ${renderPocketKit()}
        <section>
          <h2 class="font-display text-xl mb-3">Entradas</h2>
          <ul class="space-y-2">${tickets}</ul>
        </section>
        <section>
          <h2 class="font-display text-xl mb-3">Cómo leer las estrellas</h2>
          <ul>${legend}</ul>
        </section>
        <section class="p-4 rounded-2xl bg-white/70 border border-ink/5 text-sm leading-relaxed">
          ${escapeHtml(GUIDE.foroNote)}
        </section>
        <section>
          <h2 class="font-display text-xl mb-2">Prioridades rápidas</h2>
          <p class="text-sm text-ink/75"><span class="text-star">★★★</span> ${escapeHtml(GUIDE.priorities.three)}</p>
        </section>
        ${renderMapsLists()}
      </div>`;
  }

  function renderFoodItem(f) {
    const tags = [];
    if (f.decided) tags.push("Decidido");
    if (f.extra) tags.push("Extra");
    if (f.pending) tags.push("Pendiente");
    const key = foodKey(f);
    const chosen = isChosen(f);
    if (chosen) tags.push("Elegido");
    return `
      <article class="rounded-2xl border p-5 mb-3 ${
        chosen ? "bg-maps/5 border-maps/30" : "bg-white/80 border-ink/5"
      }">
        <div class="flex justify-between gap-2">
          <h3 class="font-semibold text-lg">${escapeHtml(f.name)}</h3>
          ${f.rating ? `<span class="text-sm text-star font-medium">★ ${f.rating}</span>` : ""}
        </div>
        ${tags.length ? `<p class="text-xs font-bold uppercase text-porphyry mt-1">${tags.join(" · ")}</p>` : ""}
        <p class="text-sm text-ink/55 mt-1">${escapeHtml(f.dayLabel || "")}</p>
        <p class="text-[15px] mt-2 text-ink/85">${escapeHtml(f.desc || "")}</p>
        ${f.address ? `<p class="text-sm mt-2 text-ink/60">📍 ${escapeHtml(f.address)}</p>` : ""}
        ${f.walk ? `<p class="text-sm text-ink/55">${escapeHtml(f.walk)}</p>` : ""}
        ${f.mapsUrl ? mapsButton(f.mapsUrl) : ""}
        ${
          f.pending
            ? ""
            : `<button type="button" data-choose="${escapeHtml(key)}" class="mt-3 w-full min-h-[48px] rounded-2xl border text-sm font-semibold ${
                chosen
                  ? "bg-maps text-white border-maps"
                  : "bg-white text-ink border-ink/20"
              }">${chosen ? "✓ Elegido — tocar para quitar" : "Marcar como elegido"}</button>`
        }
      </article>`;
  }

  function renderMapsLists(highlightId) {
    const lists = GUIDE.food.lists || [];
    if (!lists.length) return "";
    return `
      <section class="mb-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-widest text-ink/50">Listas en Google Maps</h2>
        <p class="text-sm text-ink/65 -mt-1">Abren Maps con todos los sitios que apuntaste.</p>
        ${lists
          .map((list) => {
            const hot = highlightId && list.id === highlightId;
            return `
            <a href="${escapeHtml(list.url)}" target="_blank" rel="noopener noreferrer"
              class="flex items-center gap-3 w-full min-h-[60px] px-4 py-3 rounded-2xl font-semibold shadow-sm active:scale-[0.98] transition-transform ${
                hot
                  ? "bg-maps text-white"
                  : "bg-white text-ink border border-ink/10"
              }">
              <span class="text-xl shrink-0" aria-hidden="true">📍</span>
              <span class="text-left flex-1">
                <span class="block text-base">${escapeHtml(list.label)}</span>
                <span class="block text-xs font-medium ${hot ? "text-white/80" : "text-ink/55"} mt-0.5">${escapeHtml(list.desc)}</span>
              </span>
              <span class="text-sm ${hot ? "text-white/90" : "text-maps"} shrink-0">Abrir →</span>
            </a>`;
          })
          .join("")}
      </section>`;
  }

  function renderComer() {
    const filters = [
      { id: "restaurants", label: "Restaurantes" },
      { id: "gelato", label: "Helados" },
      { id: "street", label: "Para llevar" },
    ];
    const chips = filters
      .map(
        (f) => `
        <button type="button" data-food="${f.id}" class="food-chip shrink-0 px-4 min-h-[44px] rounded-full text-sm font-semibold border ${
          foodFilter === f.id
            ? "bg-porphyry text-white border-porphyry"
            : "bg-white/80 text-ink border-ink/15"
        }">${escapeHtml(f.label)}</button>`
      )
      .join("");

    const items = GUIDE.food[foodFilter] || [];
    let lastDay = "";
    const body = items
      .map((f) => {
        let head = "";
        if (f.dayLabel && f.dayLabel !== lastDay) {
          lastDay = f.dayLabel;
          head = `<h2 class="text-xs font-bold uppercase tracking-widest text-ink/45 mt-6 mb-2 first:mt-0">${escapeHtml(f.dayLabel)}</h2>`;
        }
        return head + renderFoodItem(f);
      })
      .join("");

    return `
      <div>
        <h2 class="font-display text-2xl mb-4">Comer</h2>
        ${renderMapsLists(foodFilter)}
        <div class="flex gap-2 overflow-x-auto pb-4 tab-scroll">${chips}</div>
        <p class="text-xs text-ink/50 mb-2">Por día (de la guía)</p>
        <div id="food-list">${body}</div>
      </div>`;
  }

  function renderInfo() {
    const entrances = GUIDE.entrances
      .map(
        (e) => `
        <li class="mb-4 p-4 rounded-2xl bg-white/80 border border-ink/5">
          <h3 class="font-semibold text-porphyry">${escapeHtml(e.title)}</h3>
          <p class="text-[15px] mt-2 leading-relaxed text-ink/85">${escapeHtml(e.text)}</p>
        </li>`
      )
      .join("");

    const tips = (GUIDE.tips || [])
      .map(
        (e) => `
        <li class="mb-3 p-4 rounded-2xl bg-white/80 border border-ink/5">
          <h3 class="font-semibold">${escapeHtml(e.title)}</h3>
          <p class="text-sm mt-2 text-ink/80 leading-relaxed">${escapeHtml(e.text)}</p>
        </li>`
      )
      .join("");

    const apps = GUIDE.apps
      .map(
        (a) => `
        <li class="mb-3 p-4 rounded-2xl border ${
          a.recommend ? "border-maps/40 bg-maps/5" : "border-ink/5 bg-white/80"
        }">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-semibold">${escapeHtml(a.name)}</p>
            ${a.recommend ? '<span class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-maps text-white">Recomendada</span>' : ""}
          </div>
          ${a.platforms ? `<p class="text-xs text-ink/50 mt-1">${escapeHtml(a.platforms)}</p>` : ""}
          <p class="text-sm text-ink/75 mt-2 leading-relaxed">${escapeHtml(a.desc)}</p>
        </li>`
      )
      .join("");

    return `
      <div class="space-y-8">
        ${renderPocketKit()}
        <section>
          <h2 class="font-display text-2xl mb-2">Por dónde entrar</h2>
          <p class="text-[15px] leading-relaxed text-ink/75 mb-4">${escapeHtml(GUIDE.entrancesIntro || "")}</p>
          <ul class="list-none p-0 m-0">${entrances}</ul>
        </section>
        <section>
          <h2 class="font-display text-xl mb-3">Consejos prácticos</h2>
          <ul class="list-none p-0 m-0">${tips}</ul>
        </section>
        <section>
          <h2 class="font-display text-xl mb-2">En qué fijarse</h2>
          <p class="text-sm text-ink/65 mb-4">Los mismos detalles aparecen en cada parada del día. Aquí los tienes reunidos.</p>
          ${renderLookForCatalog()}
        </section>
        <section>
          <h2 class="font-display text-xl mb-2">Apps útiles</h2>
          <p class="text-sm text-ink/65 mb-4">Las marcadas como recomendadas son las que más os van a ahorrar tiempo en la calle. El resto son opcionales.</p>
          <ul class="list-none p-0">${apps}</ul>
        </section>
      </div>`;
  }

  function renderLookForCatalog() {
    const dayBlocks = GUIDE.days
      .map((day) => {
        const stops = day.sections
          .flatMap((s) => s.stops)
          .filter((s) => s.lookFor);
        if (!stops.length) return "";
        const cards = stops
          .map((stop) => {
            const items = normalizeLookFor(stop.lookFor);
            return `
              <article class="mb-3 p-4 rounded-2xl bg-white/80 border border-ink/5">
                <h3 class="font-semibold text-porphyry">${escapeHtml(stop.title)}</h3>
                <ul class="mt-2 text-sm text-ink/80 leading-relaxed list-disc pl-4 space-y-1.5">
                  ${items
                    .map((item) =>
                      item.title
                        ? `<li><span class="font-semibold text-ink">${escapeHtml(item.title)}:</span> ${escapeHtml(item.text)}</li>`
                        : `<li>${escapeHtml(item.text)}</li>`
                    )
                    .join("")}
                </ul>
              </article>`;
          })
          .join("");
        return `
          <div class="mb-6">
            <h3 class="text-xs font-bold uppercase tracking-widest text-ink/45 mb-3">${escapeHtml(day.label)} · ${escapeHtml(day.subtitle)}</h3>
            ${cards}
          </div>`;
      })
      .join("");
    return dayBlocks || "<p class='text-sm text-ink/60'>Sin detalles todavía.</p>";
  }

  function renderTren() {
    const arr = GUIDE.trains.arrival.options
      .map(
        (o) => `
        <li class="p-4 rounded-2xl border ${o.recommended ? "border-maps bg-maps/5" : "border-ink/5 bg-white/70"} mb-2">
          ${o.recommended ? '<p class="text-xs font-bold uppercase text-maps mb-1">Recomendado</p>' : ""}
          <p class="font-medium">${escapeHtml(o.dep)} Fiumicino → Termini ${escapeHtml(o.arr)}</p>
          <p class="text-sm text-ink/60">En casa ${escapeHtml(o.home)}</p>
        </li>`
      )
      .join("");

    const dep = GUIDE.trains.departure.options
      .map(
        (o) => `
        <li class="p-4 rounded-2xl border ${o.recommended ? "border-maps bg-maps/5" : "border-ink/5 bg-white/70"} mb-2">
          ${o.recommended ? '<p class="text-xs font-bold uppercase text-maps mb-1">Recomendado</p>' : ""}
          <p class="font-medium">Salir ${escapeHtml(o.leaveHome)} · Termini ${escapeHtml(o.termini)}</p>
          <p class="text-sm">Tren ${escapeHtml(o.train)} → Fiumicino ${escapeHtml(o.fiumicino)}</p>
        </li>`
      )
      .join("");

    const metro = GUIDE.metro
      .map(
        (m) => `
        <li class="mb-4 p-4 rounded-2xl bg-white/80 border border-ink/5">
          <h3 class="font-semibold">${escapeHtml(m.title)}</h3>
          <p class="text-sm mt-2 text-ink/80 leading-relaxed">${escapeHtml(m.text)}</p>
        </li>`
      )
      .join("");

    const routes = (GUIDE.metroRoutes || [])
      .map(
        (r) => `
        <article class="mb-5 p-5 rounded-2xl bg-white/80 border border-ink/5">
          <h3 class="font-semibold text-lg text-porphyry">${escapeHtml(r.title)}</h3>
          ${r.subtitle ? `<p class="text-sm text-ink/60 mt-1">${escapeHtml(r.subtitle)}</p>` : ""}
          <ol class="mt-4 space-y-3 list-none p-0 m-0">
            ${(r.steps || [])
              .map(
                (step, i) => `
              <li class="flex gap-3">
                <span class="shrink-0 w-8 h-8 rounded-full bg-porphyry text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
                <p class="text-[15px] leading-relaxed text-ink/85 pt-1">${escapeHtml(step)}</p>
              </li>`
              )
              .join("")}
          </ol>
        </article>`
      )
      .join("");

    const fromPlane = GUIDE.trains.fromPlane;
    const fromPlaneBlock = fromPlane
      ? `
      <section>
        <h2 class="font-display text-2xl">${escapeHtml(fromPlane.title)}</h2>
        ${fromPlane.subtitle ? `<p class="text-sm text-porphyry font-medium mt-1">${escapeHtml(fromPlane.subtitle)}</p>` : ""}
        <ol class="mt-4 space-y-4 list-none p-0 m-0">
          ${(fromPlane.steps || [])
            .map(
              (step, i) => `
            <li class="p-5 rounded-2xl bg-white/80 border border-ink/5">
              <div class="flex gap-3 items-start">
                <span class="shrink-0 w-8 h-8 rounded-full bg-porphyry text-white text-sm font-bold flex items-center justify-center">${i + 1}</span>
                <div class="min-w-0">
                  <h3 class="font-semibold text-ink">${escapeHtml(step.title)}</h3>
                  <p class="text-[15px] leading-relaxed text-ink/85 mt-2">${escapeHtml(step.text)}</p>
                  ${
                    step.bullets && step.bullets.length
                      ? `<ul class="mt-3 space-y-2 text-sm text-ink/80 list-disc pl-5 leading-relaxed">${step.bullets
                          .map((b) => `<li>${escapeHtml(b)}</li>`)
                          .join("")}</ul>`
                      : ""
                  }
                </div>
              </div>
            </li>`
            )
            .join("")}
        </ol>
      </section>`
      : "";

    return `
      <div class="space-y-8">
        <section>
          <h2 class="font-display text-2xl">Leonardo Express</h2>
          <p class="text-[15px] leading-relaxed text-ink/80 mt-3">${escapeHtml(GUIDE.trains.intro)}</p>
          <p class="text-sm text-ink/65 mt-2">${escapeHtml(GUIDE.trains.purchase)}</p>
        </section>
        ${fromPlaneBlock}
        <section>
          <h3 class="font-display text-lg">${escapeHtml(GUIDE.trains.arrival.label)}</h3>
          <ul class="list-none p-0 mt-3">${arr}</ul>
        </section>
        <section>
          <h3 class="font-display text-lg">${escapeHtml(GUIDE.trains.departure.label)}</h3>
          <p class="text-sm text-ink/60 mb-2">${escapeHtml(GUIDE.trains.departure.flight)}</p>
          <ul class="list-none p-0">${dep}</ul>
          <p class="text-sm mt-3 p-3 rounded-xl bg-star/10">${escapeHtml(GUIDE.days.find((d) => d.id === "sabado").note)}</p>
        </section>
        <section>
          <h2 class="font-display text-xl mb-3">Metro cercano y cómo llegar</h2>
          <ul class="list-none p-0">${metro}</ul>
        </section>
        <section>
          <h2 class="font-display text-xl mb-3">Rutas paso a paso</h2>
          ${routes}
        </section>
      </div>`;
  }

  function renderTabs() {
    nav.innerHTML = TABS.map((t) => {
      const active = t.id === activeTab;
      return `<button type="button" data-tab="${t.id}" class="tab-chip shrink-0 px-4 min-h-[48px] rounded-full text-sm font-semibold transition-colors ${
        active
          ? "bg-porphyry text-white shadow-md"
          : "bg-white text-ink border border-ink/10"
      }">${escapeHtml(t.label)}</button>`;
    }).join("");
  }

  function renderMain() {
    headerDates.textContent = GUIDE.meta.dates;
    const homeBtn = document.getElementById("home-maps-btn");
    if (homeBtn && GUIDE.meta.homeMaps) homeBtn.href = GUIDE.meta.homeMaps;
    renderTabs();

    if (activeTab === "inicio") main.innerHTML = renderInicio();
    else if (activeTab === "comer") main.innerHTML = renderComer();
    else if (activeTab === "info") main.innerHTML = renderInfo();
    else if (activeTab === "tren") main.innerHTML = renderTren();
    else {
      const day = GUIDE.days.find((d) => d.id === activeTab);
      main.innerHTML = day ? renderDay(day) : "<p>Día no encontrado.</p>";
    }

    bindFoodChips();
    bindVisitButtons();
    bindStreetKit();
    scrollActiveTabIntoView();
  }

  function bindFoodChips() {
    document.querySelectorAll(".food-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        foodFilter = btn.getAttribute("data-food");
        renderMain();
      });
    });
  }

  function bindVisitButtons() {
    document.querySelectorAll("[data-visit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleVisited(btn.getAttribute("data-visit"));
        renderMain();
      });
    });
  }

  function bindStreetKit() {
    document.querySelectorAll("[data-choose]").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleChosen(btn.getAttribute("data-choose"));
        renderMain();
      });
    });

    document.querySelectorAll("[data-toggle-pending]").forEach((btn) => {
      btn.addEventListener("click", () => {
        hideVisited = !hideVisited;
        renderMain();
      });
    });

    document.querySelectorAll("[data-toggle-essentials]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onlyEssentials = !onlyEssentials;
        renderMain();
      });
    });

    document.querySelectorAll("[data-tab-jump]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setTab(btn.getAttribute("data-tab-jump"));
      });
    });

    document.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const text = btn.getAttribute("data-copy") || "";
        try {
          await navigator.clipboard.writeText(text);
          const prev = btn.textContent;
          btn.textContent = "Copiado ✓";
          setTimeout(() => {
            btn.textContent = prev;
          }, 1500);
        } catch {
          btn.textContent = "No se pudo copiar";
        }
      });
    });

    const form = document.getElementById("access-unlock-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("access-pin");
        const err = document.getElementById("access-pin-error");
        const pin = (input && input.value ? input.value.trim() : "");
        if (pin === (GUIDE.access && GUIDE.access.unlockPin)) {
          setAccessUnlocked(true);
          renderMain();
        } else if (err) {
          err.classList.remove("hidden");
          if (input) {
            input.value = "";
            input.focus();
          }
        }
      });
    }

    document.querySelectorAll("[data-access-lock]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setAccessUnlocked(false);
        renderMain();
      });
    });
  }

  function scrollActiveTabIntoView() {
    const active = nav.querySelector(`[data-tab="${activeTab}"]`);
    if (active) active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  function setTab(id) {
    if (!TABS.some((t) => t.id === id)) return;
    activeTab = id;
    location.hash = id;
    renderMain();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function defaultTabFromDate() {
    const now = new Date();
    if (now >= TRIP_START && now <= TRIP_END) {
      const key = DAY_BY_DATE[now.getDate()];
      if (key && now.getMonth() === 8 && now.getFullYear() === 2026) return key;
    }
    return "inicio";
  }

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (btn) setTab(btn.getAttribute("data-tab"));
  });

  window.addEventListener("hashchange", () => {
    const id = location.hash.replace("#", "") || defaultTabFromDate();
    if (id !== activeTab) {
      activeTab = id;
      renderMain();
    }
  });

  activeTab = location.hash.replace("#", "") || defaultTabFromDate();
  if (!TABS.some((t) => t.id === activeTab)) activeTab = "inicio";
  renderMain();
})();
