"use strict";

// frame-buster: the Pages copy cannot send frame-ancestors (ignored in a meta CSP)
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top.location = window.self.location.href; } catch {}
  throw new Error("framed");
}

const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2];
const COLS = "ABCDEFGHIJ";
const CLOSE_REPLACED = 4000; // server closes an older socket when the same seat joins again

// the static copy on tools.zvondis.dev talks to the game server cross-origin
const API = location.host === "tools.zvondis.dev" ? "https://ships.zvondis.dev" : location.origin;

const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: the token stays in memory, so the seat survives reconnects but not a reload */ } },
};

// ---------- Language: Czech and English, like every tools.zvondis.dev page ----------
// ?lang= (links from zvondis.dev), then the saved choice (shared with the tools site), then the browser.

const COPY = {
  cs: {
    title: "Lodě",
    navHome: "Domů", navCv: "CV", navSemester: "Semestr", navUses: "Vybavení", navPrivacy: "Soukromí",
    navTools: "Nástroje", navShips: "Lodě", navAria: "Stránky",
    h1: "Potop nepřátelskou flotilu", h1Light: "dřív než ona tu tvou.",
    lede: "Založ hru, pošli odkaz kamarádovi a střídejte se ve střelbě na mapu 10×10. Lodě zůstávají skryté na serveru, takže nikdo nemůže podvádět.",
    newGame: "Nová hra", fleet: "Flotila", rules: "Pravidla",
    rule1: "Rozmísti pět lodí vodorovně nebo svisle. Nesmí se překrývat ani dotýkat, ani rohem.",
    rule2: "Střídejte se ve střelbě. Zásah znamená další výstřel, rána vedle předá tah.",
    rule3: "Vyhrává ten, kdo první potopí celou nepřátelskou flotilu.",
    ships: ["Letadlová loď", "Bitevní loď", "Křižník", "Ponorka", "Torpédoborec"],
    shipsAcc: ["letadlovou loď", "bitevní loď", "křižník", "ponorku", "torpédoborec"],
    cells: (n) => (n >= 5 ? `${n} polí` : `${n} pole`),
    startNew: "Založit novou hru",
    waitTitle: "Čekáme na soupeře",
    waitText: "Pošli tenhle odkaz tomu, s kým chceš hrát. Hra začne, jakmile ho otevře.",
    gameLink: "Odkaz na hru", copy: "Kopírovat odkaz", copied: "Zkopírováno",
    yourFleet: "Tvoje flotila", enemyWaters: "Nepřátelské vody", roster: "Seznam lodí",
    rotate: "Otočit", undo: "Zpět", random: "Náhodně", ready: "Hotovo",
    tooMany: "Odsud vzniklo moc nových her. Počkej minutu a zkus to znovu.",
    cantOpen: "Novou hru se nepodařilo založit. Zkus to za chvíli.",
    notConnected: "Bez spojení. Připojuji znovu…",
    allPlaced: "Všechny lodě jsou rozmístěné. Dej Hotovo.",
    noFit: "Tahle loď se sem nevejde. Lodě se nesmí dotýkat, ani rohem.",
    holdFire: "Počkej, teď nejsi na tahu.",
    already: (c) => `Na ${c} se už střílelo.`,
    pressCopy: "Odkaz zkopíruješ přes Ctrl+C (nebo Cmd+C).",
    serverError: (m) => `Tah se nepovedl (${m}).`,
    connecting: ["Navazuji spojení", "Připojuji…", ""], connectingStatus: "Připojuji…",
    full: ["Obsazeno", "Tahle hra je plná", "U stolu už sedí dva kapitáni. Založ si vlastní hru."],
    moved: ["Hra jinde", "Otevřeno v jiné kartě", "Tahle hra se otevřela v jiné kartě nebo okně. Pokračuj tam, nebo obnov tuhle stránku a vezmi si ji zpátky."],
    notFound: ["Neznámé vody", "Hra nenalezena", "Odkaz je špatně, nebo hra vypršela. Hry bez hráčů se po čase mažou."],
    connLost: "Spojení se přerušilo. Připojuji znovu…",
    yourShip: "tvoje loď", hit: "zásah", miss: "vedle", sunk: "potopená", openWater: "volná voda",
    sunkShip: "potopená loď", afloat: "loď, která ještě pluje", unknown: "neznámé",
    hitSunk: "zásah, loď potopena",
    placedN: (n, m) => `${n}/${m} rozmístěno`, afloatN: (n, m) => `${n}/${m} na hladině`, sunkN: (n, m) => `${n}/${m} potopeno`,
    placed: "rozmístěna",
    hintAll: "Flotila je na místě. Pokud ti rozmístění vyhovuje, dej Hotovo.",
    hintPlace: (i, len, v) => `Vyber pole na své mapě pro ${COPY.cs.shipsAcc[i]} (${len}). Směr: ${v ? "na jih" : "na východ"}.`,
    youFired: (s) => `Tvoje střela na ${s}.`, enemyFired: (s) => `Soupeřova střela na ${s}.`,
    oppOn: "Soupeř je ve hře", oppOff: "Soupeř je offline. Může se vrátit přes svůj odkaz.", waitingOpp: "Čekáme na soupeře",
    docWaiting: "Čekání", docDeploy: "Rozmístění", docYour: "Tvůj tah", docTheir: "Tah soupeře",
    deployTitle: "Rozmísti flotilu", oppReady: "Soupeř je připravený a čeká na tebe.", oppDeploying: "Soupeř taky rozmisťuje.",
    deployedTitle: "Lodě na místě", deployedText: "Čekáme, až soupeř rozmístí lodě.",
    fireAgain: "Zásah. Střílej znovu.", pickTarget: "Vyber cíl v nepřátelských vodách.",
    theyAgain: "Soupeř zasáhl, takže střílí znovu.", holdSteady: "Vydrž.",
    yourTurn: "Tvůj tah", enemyAiming: "Nepřítel míří",
    rematch: "Odveta", rematchRequested: "Odveta vyžádána", acceptRematch: "Přijmout odvetu",
    victory: "Vítězství", defeat: "Porážka",
    wonText: "Nepřátelská flotila leží na dně.", lostText: "Tvoje flotila byla potopena.",
    oppWants: " Soupeř chce odvetu.", waitAccept: " Čekáme, až soupeř odvetu přijme.",
  },
  en: {
    title: "Battleships",
    navHome: "Home", navCv: "CV", navSemester: "Semester", navUses: "Uses", navPrivacy: "Privacy",
    navTools: "Tools", navShips: "Battleships", navAria: "Pages",
    h1: "Sink the enemy fleet", h1Light: "before they sink yours.",
    lede: "Open a game, send the link to a friend, and take turns firing across a 10×10 chart. Ships stay hidden on the server, so nobody can peek.",
    newGame: "New game", fleet: "Fleet", rules: "Rules",
    rule1: "Place the five ships across or down. They may not overlap or touch, not even at a corner.",
    rule2: "Take turns firing. A hit earns another shot, a miss passes the turn.",
    rule3: "The first to sink the whole enemy fleet wins.",
    ships: ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"],
    cells: (n) => `${n} cells`,
    startNew: "Start a new game",
    waitTitle: "Waiting for your opponent",
    waitText: "Send this link to the person you want to play. The game starts as soon as they open it.",
    gameLink: "Game link", copy: "Copy link", copied: "Copied",
    yourFleet: "Your fleet", enemyWaters: "Enemy waters", roster: "Fleet roster",
    rotate: "Rotate", undo: "Undo", random: "Random", ready: "Ready",
    tooMany: "Too many new games from here. Wait a minute and try again.",
    cantOpen: "Could not open a new game. Try again in a moment.",
    notConnected: "Not connected. Reconnecting…",
    allPlaced: "All ships placed. Press Ready.",
    noFit: "That ship does not fit there. Ships must not touch, not even at a corner.",
    holdFire: "Hold fire. It is not your turn.",
    already: (c) => `Already fired at ${c}.`,
    pressCopy: "Press Ctrl+C (or Cmd+C) to copy the link.",
    serverError: (m) => m,
    connecting: ["Raising the signal", "Connecting…", ""], connectingStatus: "Connecting…",
    full: ["Seats taken", "This game is full", "Two captains are already at this table. Start your own game instead."],
    moved: ["Signal moved", "Open in another tab", "This game was opened in another tab or window. Continue there, or reload this page to take it back here."],
    notFound: ["Uncharted", "Game not found", "This link is wrong or the game has expired. Games are cleared after a while without players."],
    connLost: "Connection lost. Reconnecting…",
    yourShip: "your ship", hit: "hit", miss: "miss", sunk: "sunk", openWater: "open water",
    sunkShip: "sunk ship", afloat: "ship still afloat", unknown: "unknown",
    hitSunk: "hit and sunk",
    placedN: (n, m) => `${n}/${m} placed`, afloatN: (n, m) => `${n}/${m} afloat`, sunkN: (n, m) => `${n}/${m} sunk`,
    placed: "placed",
    hintAll: "Fleet in position. Press Ready when you are happy with it.",
    hintPlace: (i, len, v) => `Choose a cell on your chart to place the ${COPY.en.ships[i]} (${len}). Heading: ${v ? "south" : "east"}.`,
    youFired: (s) => `You fired at ${s}.`, enemyFired: (s) => `Enemy fired at ${s}.`,
    oppOn: "Opponent on deck", oppOff: "Opponent offline. They can rejoin with their link.", waitingOpp: "Waiting for opponent",
    docWaiting: "Waiting", docDeploy: "Deploy", docYour: "Your turn", docTheir: "Their turn",
    deployTitle: "Deploy your fleet", oppReady: "Your opponent is ready and waiting on you.", oppDeploying: "Your opponent is deploying too.",
    deployedTitle: "Fleet deployed", deployedText: "Waiting for your opponent to finish placing ships.",
    fireAgain: "A hit. Fire again.", pickTarget: "Pick a target in enemy waters.",
    theyAgain: "They hit, so they fire again.", holdSteady: "Hold steady.",
    yourTurn: "Your turn", enemyAiming: "Enemy is aiming",
    rematch: "Rematch", rematchRequested: "Rematch requested", acceptRematch: "Accept rematch",
    victory: "Victory", defeat: "Defeat",
    wonText: "The enemy fleet is on the seabed.", lostText: "Your fleet has been sunk.",
    oppWants: " Your opponent wants a rematch.", waitAccept: " Waiting for your opponent to accept.",
  },
};
for (const l of ["cs", "en"]) for (const n of [2, 3, 4, 5]) COPY[l]["cells" + n] = COPY[l].cells(n);
for (const l of ["cs", "en"]) COPY[l].ships.forEach((s, i) => { COPY[l]["ship" + i] = s; });

// zvondis.dev pages in the rail ([data-main]); same table as the tools site's assets/lang.js.
const MAIN = {
  home: { cs: "/", en: "/en/" },
  cv: { cs: "/cv", en: "/en/cv" },
  semester: { cs: "/semestr", en: "/en/semester" },
  uses: { cs: "/vybaveni", en: "/en/uses" },
  privacy: { cs: "/soukromi", en: "/en/privacy" },
};

let lang = (() => {
  const asked = new URLSearchParams(location.search).get("lang");
  if (asked === "cs" || asked === "en") return asked;
  const saved = store.get("lang");
  if (saved === "cs" || saved === "en") return saved;
  return (navigator.language || "").startsWith("cs") ? "cs" : "en";
})();
const t = (k, ...a) => { const v = COPY[lang][k]; return typeof v === "function" ? v(...a) : v; };
const relang = []; // screens re-render their own text after a switch
let pageTitle = () => t("title");

function setLang(l) {
  lang = l;
  store.set("lang", l);
  document.documentElement.lang = l; // theme.js relabels its switch from this
  for (const el of document.querySelectorAll("[data-t]")) el.textContent = t(el.dataset.t);
  for (const el of document.querySelectorAll("[data-t-aria]")) el.setAttribute("aria-label", t(el.dataset.tAria));
  for (const el of document.querySelectorAll("[data-main]")) el.href = "https://zvondis.dev" + MAIN[el.dataset.main][l];
  const b = $("lang");
  b.textContent = l === "en" ? "CZ" : "EN";
  b.lang = l === "en" ? "cs" : "en";
  b.setAttribute("aria-label", l === "en" ? "CZ, přepnout do češtiny" : "EN, switch to English");
  document.title = pageTitle();
  relang.forEach((f) => f());
}
$("lang").addEventListener("click", () => setLang(lang === "en" ? "cs" : "en"));

function show(id) {
  document.body.dataset.screen = id; // the game drops the site rail for a slim masthead
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
}

let toastTimer;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

function setStatus(text, tone) {
  const s = $("status");
  s.textContent = text;
  s.dataset.tone = tone || "";
}

// key: one of the [eyebrow, title, text] entries in COPY; kept so a language switch can redraw it
let noticeKey = "";
function notice(key, status = "") {
  noticeKey = key;
  const [eyebrow, title, text] = t(key);
  $("notice-eyebrow").textContent = eyebrow;
  $("notice-title").textContent = title;
  $("notice-text").textContent = text;
  setStatus(status && t(status), status ? "wait" : "");
  show("notice");
}
relang.push(() => { if (document.body.dataset.screen === "notice" && noticeKey) notice(noticeKey, noticeKey === "connecting" ? "connectingStatus" : ""); });

const coord = (x, y) => COLS[x] + (y + 1);

function cells(s) {
  const out = [];
  for (let i = 0; i < s.len; i++) out.push(s.dir === "h" ? [s.x + i, s.y] : [s.x, s.y + i]);
  return out;
}

// Inside the board and not touching another ship, not even at a corner (the server checks the same).
function fits(s, ships) {
  const taken = new Set(ships.flatMap((o) => cells(o).map(([x, y]) => y * SIZE + x)));
  const near = (x, y) => [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => taken.has((y + dy) * SIZE + x + dx) && x + dx >= 0 && x + dx < SIZE));
  return cells(s).every(([x, y]) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && !near(x, y));
}

function randomFleet() {
  const ships = [];
  const rand = (n) => Math.floor(Math.random() * n);
  for (const len of FLEET) {
    let s;
    do {
      const dir = Math.random() < 0.5 ? "h" : "v";
      s = { x: rand(dir === "h" ? SIZE - len + 1 : SIZE), y: rand(dir === "v" ? SIZE - len + 1 : SIZE), len, dir };
    } while (!fits(s, ships));
    ships.push(s);
  }
  return ships;
}

// Builds a labelled 10x10 board of buttons with roving tabindex and arrow-key movement.
function buildBoard(el, onPick, onHover) {
  el.textContent = "";
  const corner = document.createElement("span");
  corner.className = "axis corner";
  corner.setAttribute("aria-hidden", "true");
  el.append(corner);
  for (let x = 0; x < SIZE; x++) {
    const h = document.createElement("span");
    h.className = "axis col";
    h.setAttribute("aria-hidden", "true");
    h.textContent = COLS[x];
    el.append(h);
  }
  const btns = [];
  for (let y = 0; y < SIZE; y++) {
    const r = document.createElement("span");
    r.className = "axis row";
    r.setAttribute("aria-hidden", "true");
    r.textContent = String(y + 1);
    el.append(r);
    for (let x = 0; x < SIZE; x++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.tabIndex = x === 0 && y === 0 ? 0 : -1;
      const mark = document.createElement("span");
      mark.className = "mark";
      mark.setAttribute("aria-hidden", "true");
      b.append(mark);
      b.addEventListener("click", () => onPick(x, y));
      b.addEventListener("mouseenter", () => onHover(x, y));
      b.addEventListener("focus", () => {
        for (const o of btns) o.tabIndex = -1;
        b.tabIndex = 0;
        onHover(x, y);
      });
      b.addEventListener("keydown", (e) => {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!d) return;
        e.preventDefault();
        const nx = Math.min(SIZE - 1, Math.max(0, x + d[0]));
        const ny = Math.min(SIZE - 1, Math.max(0, y + d[1]));
        btns[ny * SIZE + nx].focus();
      });
      btns.push(b);
      el.append(b);
    }
  }
  el.addEventListener("mouseleave", () => onHover(null));
  el.addEventListener("focusout", (e) => { if (!el.contains(e.relatedTarget)) onHover(null); });
  return btns;
}

// ---------- Landing ----------

function landing() {
  noticeKey = "";
  show("landing");
  const btn = $("new-game");
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const res = await fetch(API + "/api/new", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const { id } = await res.json();
      location.href = "?g=" + encodeURIComponent(id);
    } catch (e) {
      toast(t(e.message === "429" ? "tooMany" : "cantOpen"));
      btn.disabled = false;
    }
  });
}

// ---------- Game ----------

function game(id) {
  const key = "bs:" + id;
  let ws = null;
  let view = null;
  let retry = 0;
  let stopped = false;
  let dir = "h";
  let placed = [];
  let hover = null;
  let token = store.get(key); // memory first, so a failing localStorage never loses the seat
  let firing = false;
  let lastShotKey = "";

  const myBtns = buildBoard($("my-board"), pickMine, (x, y) => { hover = x == null ? null : [x, y]; paintMine(); });
  const enemyBtns = buildBoard($("enemy-board"), fire, () => {});

  $("notice-home").hidden = true;
  notice("connecting", "connectingStatus");

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    else toast(t("notConnected"));
  }

  function stop(key) {
    stopped = true;
    if (ws) ws.close();
    $("notice-home").hidden = false;
    notice(key);
  }

  function reconnectLater() {
    const delay = Math.min(10000, 1000 * 2 ** retry);
    retry++;
    setTimeout(connect, delay);
  }

  function connect() {
    if (stopped) return;
    const sock = new WebSocket(`${API.replace(/^http/, "ws")}/ws/${encodeURIComponent(id)}`);
    ws = sock;
    let opened = false;
    sock.addEventListener("open", () => {
      opened = true;
      sock.send(JSON.stringify({ t: "join", token: token || store.get(key) || undefined }));
    });
    sock.addEventListener("message", (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.t === "joined") {
        token = msg.token;
        store.set(key, msg.token);
        retry = 0;
      } else if (msg.t === "state") {
        firing = false;
        view = msg.view;
        render();
      } else if (msg.t === "error") {
        firing = false;
        if (msg.msg === "room full") {
          stop("full");
        } else {
          toast(t("serverError", msg.msg));
        }
      }
    });
    sock.addEventListener("close", (e) => {
      if (stopped || ws !== sock) return;
      if (e.code === CLOSE_REPLACED) {
        stop("moved");
        $("notice-home").hidden = true;
        return;
      }
      setStatus(t("connLost"), "bad");
      if (opened) return reconnectLater();
      // never got a socket: ask whether the room exists at all
      fetch(`${API}/ws/${encodeURIComponent(id)}`).then((r) => {
        if (r.status === 404) stop("notFound");
        else reconnectLater();
      }, reconnectLater);
    });
  }

  // ----- placement -----

  const placing = () => view && view.phase === "placing" && !view.me.ready;

  function candidate() {
    if (!hover || placed.length >= FLEET.length) return null;
    return { x: hover[0], y: hover[1], len: FLEET[placed.length], dir };
  }

  function pickMine(x, y) {
    if (!placing()) return;
    if (placed.length >= FLEET.length) return toast(t("allPlaced"));
    const s = { x, y, len: FLEET[placed.length], dir };
    if (!fits(s, placed)) return toast(t("noFit"));
    placed.push(s);
    renderDock();
    paintMine();
  }

  function rotate() {
    dir = dir === "h" ? "v" : "h";
    renderDock();
    paintMine();
  }

  $("rotate").addEventListener("click", rotate);
  $("undo").addEventListener("click", () => { placed.pop(); renderDock(); paintMine(); });
  $("random").addEventListener("click", () => { placed = randomFleet(); renderDock(); paintMine(); });
  $("ready").addEventListener("click", () => { if (placed.length === FLEET.length) send({ t: "place", ships: placed }); });
  document.addEventListener("keydown", (e) => {
    if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey && placing()
      && !(e.target instanceof HTMLInputElement)) rotate();
  });

  // ----- firing -----

  function canFire() {
    return view && view.phase === "playing" && view.turn === view.seat && !firing;
  }

  function fire(x, y) {
    if (!view || view.phase !== "playing") return;
    if (view.turn !== view.seat) return toast(t("holdFire"));
    if (view.enemy.shots.some((s) => s.x === x && s.y === y)) return toast(t("already", coord(x, y)));
    if (firing) return;
    firing = true;
    send({ t: "fire", x, y });
  }

  // ----- share / rematch -----

  // aria-disabled rather than disabled, so keyboard focus stays on the button after a click
  $("rematch").addEventListener("click", () => {
    if (view && view.phase === "over" && !view.me.wantsRematch) send({ t: "rematch" });
  });

  $("copy").addEventListener("click", async () => {
    const input = $("share-url");
    try {
      await navigator.clipboard.writeText(input.value);
      $("copy").textContent = t("copied");
      setTimeout(() => { $("copy").textContent = t("copy"); }, 2000);
    } catch {
      input.focus();
      input.select();
      toast(t("pressCopy"));
    }
  });

  // ----- rendering -----

  function hullClasses(map, ships) {
    for (const s of ships) {
      cells(s).forEach(([x, y], i) => {
        map[y * SIZE + x] = ["ship", "hull-" + s.dir, i === 0 ? "bow" : "", i === s.len - 1 ? "stern" : ""];
      });
    }
  }

  function paint(btns, info) {
    btns.forEach((b, i) => {
      const { cls, label, mark } = info(i % SIZE, Math.floor(i / SIZE), i);
      b.className = "cell " + cls.filter(Boolean).join(" ");
      b.setAttribute("aria-label", label);
      b.firstChild.textContent = mark;
    });
  }

  function paintMine() {
    if (!view) return;
    const ships = placing() ? placed : view.me.ships;
    const hulls = {};
    hullClasses(hulls, ships);
    const shots = new Map(view.me.shots.map((s) => [s.y * SIZE + s.x, s]));
    const sunkCells = new Set();
    for (const s of ships) {
      const cs = cells(s).map(([x, y]) => y * SIZE + x);
      if (cs.every((c) => shots.get(c)?.hit)) cs.forEach((c) => sunkCells.add(c));
    }
    const cand = placing() ? candidate() : null;
    const candOk = cand && fits(cand, placed);
    // off-board cells are dropped so a preview past the edge doesn't wrap onto the next row
    // cell -> position along the ship; off-board cells collapse to -1, which no cell uses
    const candCells = new Map(cand ? cells(cand).map(([x, y], k) => [x < SIZE && y < SIZE ? y * SIZE + x : -1, k]) : []);
    const last = view.lastShot && view.lastShot.by !== view.seat ? view.lastShot.y * SIZE + view.lastShot.x : -1;

    paint(myBtns, (x, y, i) => {
      const shot = shots.get(i);
      const cls = [...(hulls[i] || [])];
      const words = [];
      if (hulls[i]) words.push(t("yourShip"));
      if (shot) { cls.push(shot.hit ? "hit" : "miss"); words.push(t(shot.hit ? "hit" : "miss")); }
      if (sunkCells.has(i)) { cls.push("sunk"); words.push(t("sunk")); }
      if (candCells.has(i)) {
        const k = candCells.get(i);
        cls.push(candOk ? "preview-ok" : "preview-bad", "preview-" + cand.dir, k === 0 ? "preview-bow" : "", k === cand.len - 1 ? "preview-stern" : "");
      }
      if (i === last) cls.push("last");
      if (placing()) cls.push("placeable");
      if (!words.length) words.push(t("openWater"));
      return { cls, label: `${coord(x, y)}, ${words.join(", ")}`, mark: shot ? (shot.hit ? "✕" : "") : "" };
    });

    const afloat = ships.length - ships.filter((s) => cells(s).every(([x, y]) => shots.get(y * SIZE + x)?.hit)).length;
    $("my-tally").textContent = placing() ? t("placedN", placed.length, FLEET.length) : t("afloatN", afloat, FLEET.length);
  }

  function paintEnemy() {
    const hulls = {};
    hullClasses(hulls, view.enemy.sunk);
    const afloat = {};
    hullClasses(afloat, view.enemy.afloat); // only filled once the game is over
    const shots = new Map(view.enemy.shots.map((s) => [s.y * SIZE + s.x, s]));
    const armed = canFire();
    const last = view.lastShot && view.lastShot.by === view.seat ? view.lastShot.y * SIZE + view.lastShot.x : -1;
    $("enemy-board").classList.toggle("armed", armed);

    paint(enemyBtns, (x, y, i) => {
      const shot = shots.get(i);
      const cls = [...(hulls[i] || afloat[i] || [])];
      const words = [];
      if (shot) { cls.push(shot.hit ? "hit" : "miss"); words.push(t(shot.hit ? "hit" : "miss")); }
      if (hulls[i]) { cls.push("sunk"); words.push(t("sunkShip")); }
      if (afloat[i]) { cls.push("revealed"); words.push(t("afloat")); }
      if (i === last) cls.push("last");
      const open = armed && !shot;
      if (open) cls.push("target");
      if (!words.length) words.push(t("unknown"));
      return { cls, label: `${coord(x, y)}, ${words.join(", ")}`, mark: shot ? (shot.hit ? "✕" : "") : "" };
    });
    for (const [i, b] of enemyBtns.entries()) b.setAttribute("aria-disabled", String(!(armed && !shots.has(i))));

    $("enemy-tally").textContent = t("sunkN", view.enemy.sunk.length, FLEET.length);
  }

  function renderDock() {
    const list = $("dock-list");
    list.textContent = "";
    FLEET.forEach((len, i) => {
      const li = document.createElement("li");
      li.className = i < placed.length ? "done" : i === placed.length ? "next" : "";
      const hull = document.createElement("span");
      hull.className = "hull";
      hull.dataset.len = String(len);
      const name = document.createElement("span");
      name.className = "dock-name";
      name.textContent = t("ships")[i];
      const meta = document.createElement("span");
      meta.className = "dock-meta";
      meta.textContent = i < placed.length ? t("placed") : t("cells", len);
      li.append(hull, name, meta);
      list.append(li);
    });
    const all = placed.length === FLEET.length;
    $("dock-hint").textContent = all
      ? t("hintAll")
      : t("hintPlace", placed.length, FLEET[placed.length], dir === "v");
    $("rotate").setAttribute("aria-pressed", String(dir === "v"));
    $("undo").disabled = placed.length === 0;
    $("ready").disabled = !all;
  }

  function banner(title, text, tone) {
    $("banner-title").textContent = title;
    $("banner-text").textContent = text;
    $("banner").dataset.tone = tone;
  }

  function shotWords(ls) {
    return `${coord(ls.x, ls.y)}: ${t(ls.sunk ? "hitSunk" : ls.hit ? "hit" : "miss")}`;
  }

  function title(k) {
    pageTitle = () => `${t(k)} · ${t("title")}`;
    document.title = pageTitle();
  }
  relang.push(() => { if (view) render(); });

  function render() {
    const v = view;
    const opp = v.opponent;
    setStatus(t(opp.connected ? "oppOn" : "oppOff"), opp.connected ? "ok" : "bad");

    if (v.phase === "waiting") {
      $("share-url").value = location.origin + location.pathname + location.search;
      setStatus(t("waitingOpp"), "wait");
      title("docWaiting");
      show("waiting");
      return;
    }
    show("game");
    if (v.phase !== "placing") placed = []; // fresh dock for the next rematch

    const isPlacing = placing();
    $("game").dataset.phase = isPlacing ? "placing" : v.phase === "placing" ? "deployed" : v.phase;
    $("dock").hidden = !isPlacing;
    $("enemy-chart").hidden = isPlacing; // shown empty and quiet once your fleet is deployed

    const ls = v.lastShot;
    const lsKey = ls ? JSON.stringify(ls) + v.me.shots.length + v.enemy.shots.length : "";
    if (ls && lsKey !== lastShotKey) {
      $("announcer").textContent = t(ls.by === v.seat ? "youFired" : "enemyFired", shotWords(ls));
    }
    lastShotKey = lsKey;

    if (v.phase === "placing") {
      if (isPlacing) {
        banner(t("deployTitle"), t(opp.ready ? "oppReady" : "oppDeploying"), "neutral");
        title("docDeploy");
      } else {
        banner(t("deployedTitle"), t("deployedText"), "wait");
        title("docWaiting");
      }
    } else if (v.phase === "playing") {
      const mine = v.turn === v.seat;
      const prev = ls ? t(ls.by === v.seat ? "youFired" : "enemyFired", shotWords(ls)) + " " : "";
      const again = ls && ls.hit; // a hit earns the shooter another shot
      const next = t(mine ? (again ? "fireAgain" : "pickTarget") : again ? "theyAgain" : "holdSteady");
      banner(t(mine ? "yourTurn" : "enemyAiming"), prev + next, mine ? "mine" : "theirs");
      title(mine ? "docYour" : "docTheir");
    } else if (v.phase === "over") {
      const won = v.winner === v.seat;
      const asked = v.me.wantsRematch;
      const btn = $("rematch");
      btn.textContent = t(asked ? "rematchRequested" : opp.wantsRematch ? "acceptRematch" : "rematch");
      btn.setAttribute("aria-disabled", String(asked));
      const text = t(won ? "wonText" : "lostText") + (opp.wantsRematch ? t("oppWants") : asked ? t("waitAccept") : "");
      banner(t(won ? "victory" : "defeat"), text, won ? "won" : "lost");
      title(won ? "victory" : "defeat");
    }

    $("rematch").hidden = v.phase !== "over";
    renderDock();
    paintMine();
    if (!isPlacing) paintEnemy();
  }

  connect();
}

setLang(lang);
const route = (new URLSearchParams(location.search).get("g") ?? "").match(/^[A-Za-z0-9-]{1,64}$/);
if (route) game(route[0]);
else landing();
