"use strict";

// frame-buster: the Pages copy cannot send frame-ancestors (ignored in a meta CSP)
if (window.top !== window.self) {
  document.documentElement.style.display = "none";
  try { window.top.location = window.self.location.href; } catch {}
  throw new Error("framed");
}

const SIZE = 10;
const FLEET = [5, 4, 3, 3, 2];
const NAMES = ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"];
const COLS = "ABCDEFGHIJ";
const CLOSE_REPLACED = 4000; // server closes an older socket when the same seat joins again

// the static copy on tools.zvondis.dev talks to the game server cross-origin
const API = location.host === "tools.zvondis.dev" ? "https://ships.zvondis.dev" : location.origin;

const $ = (id) => document.getElementById(id);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: the token stays in memory, so the seat survives reconnects but not a reload */ } },
};

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

function notice(eyebrow, title, text) {
  $("notice-eyebrow").textContent = eyebrow;
  $("notice-title").textContent = title;
  $("notice-text").textContent = text;
  setStatus("");
  show("notice");
}

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
      toast(e.message === "429" ? "Too many new games from here. Wait a minute and try again." : "Could not open a new game. Try again in a moment.");
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

  setStatus("Connecting…", "wait");
  show("notice");
  $("notice-eyebrow").textContent = "Raising the signal";
  $("notice-title").textContent = "Connecting…";
  $("notice-text").textContent = "";
  $("notice-home").hidden = true;

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    else toast("Not connected. Reconnecting…");
  }

  function stop(eyebrow, title, text) {
    stopped = true;
    if (ws) ws.close();
    $("notice-home").hidden = false;
    notice(eyebrow, title, text);
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
          stop("Seats taken", "This game is full", "Two captains are already at this table. Start your own game instead.");
        } else {
          toast(msg.msg);
        }
      }
    });
    sock.addEventListener("close", (e) => {
      if (stopped || ws !== sock) return;
      if (e.code === CLOSE_REPLACED) {
        stop("Signal moved", "Open in another tab", "This game was opened in another tab or window. Continue there, or reload this page to take it back here.");
        $("notice-home").hidden = true;
        return;
      }
      setStatus("Connection lost. Reconnecting…", "bad");
      if (opened) return reconnectLater();
      // never got a socket: ask whether the room exists at all
      fetch(`${API}/ws/${encodeURIComponent(id)}`).then((r) => {
        if (r.status === 404) stop("Uncharted", "Game not found", "This link is wrong or the game has expired. Games are cleared after a while without players.");
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
    if (placed.length >= FLEET.length) return toast("All ships placed. Press Ready.");
    const s = { x, y, len: FLEET[placed.length], dir };
    if (!fits(s, placed)) return toast("That ship does not fit there. Ships must not touch, not even at a corner.");
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
    if (view.turn !== view.seat) return toast("Hold fire. It is not your turn.");
    if (view.enemy.shots.some((s) => s.x === x && s.y === y)) return toast(`Already fired at ${coord(x, y)}.`);
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
      $("copy").textContent = "Copied";
      setTimeout(() => { $("copy").textContent = "Copy link"; }, 2000);
    } catch {
      input.focus();
      input.select();
      toast("Press Ctrl+C (or Cmd+C) to copy the link.");
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
      if (hulls[i]) words.push("your ship");
      if (shot) { cls.push(shot.hit ? "hit" : "miss"); words.push(shot.hit ? "hit" : "miss"); }
      if (sunkCells.has(i)) { cls.push("sunk"); words.push("sunk"); }
      if (candCells.has(i)) {
        const k = candCells.get(i);
        cls.push(candOk ? "preview-ok" : "preview-bad", "preview-" + cand.dir, k === 0 ? "preview-bow" : "", k === cand.len - 1 ? "preview-stern" : "");
      }
      if (i === last) cls.push("last");
      if (placing()) cls.push("placeable");
      if (!words.length) words.push("open water");
      return { cls, label: `${coord(x, y)}, ${words.join(", ")}`, mark: shot ? (shot.hit ? "✕" : "") : "" };
    });

    const afloat = ships.length - ships.filter((s) => cells(s).every(([x, y]) => shots.get(y * SIZE + x)?.hit)).length;
    $("my-tally").textContent = placing() ? `${placed.length}/${FLEET.length} placed` : `${afloat}/${FLEET.length} afloat`;
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
      if (shot) { cls.push(shot.hit ? "hit" : "miss"); words.push(shot.hit ? "hit" : "miss"); }
      if (hulls[i]) { cls.push("sunk"); words.push("sunk ship"); }
      if (afloat[i]) { cls.push("revealed"); words.push("ship still afloat"); }
      if (i === last) cls.push("last");
      const open = armed && !shot;
      if (open) cls.push("target");
      if (!words.length) words.push("unknown");
      return { cls, label: `${coord(x, y)}, ${words.join(", ")}`, mark: shot ? (shot.hit ? "✕" : "") : "" };
    });
    for (const [i, b] of enemyBtns.entries()) b.setAttribute("aria-disabled", String(!(armed && !shots.has(i))));

    $("enemy-tally").textContent = `${view.enemy.sunk.length}/${FLEET.length} sunk`;
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
      name.textContent = NAMES[i];
      const meta = document.createElement("span");
      meta.className = "dock-meta";
      meta.textContent = i < placed.length ? "placed" : `${len} cells`;
      li.append(hull, name, meta);
      list.append(li);
    });
    const all = placed.length === FLEET.length;
    $("dock-hint").textContent = all
      ? "Fleet in position. Press Ready when you are happy with it."
      : `Choose a cell on your chart to place the ${NAMES[placed.length]} (${FLEET[placed.length]}). Heading: ${dir === "h" ? "east" : "south"}.`;
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
    return `${coord(ls.x, ls.y)}: ${ls.sunk ? "hit and sunk" : ls.hit ? "hit" : "miss"}`;
  }

  function render() {
    const v = view;
    const opp = v.opponent;
    setStatus(opp.connected ? "Opponent on deck" : "Opponent offline. They can rejoin with their link.", opp.connected ? "ok" : "bad");

    if (v.phase === "waiting") {
      $("share-url").value = location.origin + location.pathname + location.search;
      setStatus("Waiting for opponent", "wait");
      document.title = "Waiting · Battleships";
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
      $("announcer").textContent = ls.by === v.seat ? `You fired at ${shotWords(ls)}.` : `Enemy fired at ${shotWords(ls)}.`;
    }
    lastShotKey = lsKey;

    if (v.phase === "placing") {
      if (isPlacing) {
        banner("Deploy your fleet", opp.ready ? "Your opponent is ready and waiting on you." : "Your opponent is deploying too.", "neutral");
        document.title = "Deploy · Battleships";
      } else {
        banner("Fleet deployed", "Waiting for your opponent to finish placing ships.", "wait");
        document.title = "Waiting · Battleships";
      }
    } else if (v.phase === "playing") {
      const mine = v.turn === v.seat;
      const prev = ls ? (ls.by === v.seat ? `Your shot at ${shotWords(ls)}. ` : `Enemy shot at ${shotWords(ls)}. `) : "";
      const again = ls && ls.hit; // a hit earns the shooter another shot
      const next = mine ? (again ? "A hit. Fire again." : "Pick a target in enemy waters.") : again ? "They hit, so they fire again." : "Hold steady.";
      banner(mine ? "Your turn" : "Enemy is aiming", prev + next, mine ? "mine" : "theirs");
      document.title = (mine ? "Your turn" : "Their turn") + " · Battleships";
    } else if (v.phase === "over") {
      const won = v.winner === v.seat;
      const asked = v.me.wantsRematch;
      const btn = $("rematch");
      btn.textContent = asked ? "Rematch requested" : opp.wantsRematch ? "Accept rematch" : "Rematch";
      btn.setAttribute("aria-disabled", String(asked));
      const text = (won ? "The enemy fleet is on the seabed." : "Your fleet has been sunk.")
        + (opp.wantsRematch ? " Your opponent wants a rematch." : asked ? " Waiting for your opponent to accept." : "");
      banner(won ? "Victory" : "Defeat", text, won ? "won" : "lost");
      document.title = (won ? "Victory" : "Defeat") + " · Battleships";
    }

    $("rematch").hidden = v.phase !== "over";
    renderDock();
    paintMine();
    if (!isPlacing) paintEnemy();
  }

  connect();
}

const route = (new URLSearchParams(location.search).get("g") ?? "").match(/^[A-Za-z0-9-]{1,64}$/);
if (route) game(route[0]);
else landing();
