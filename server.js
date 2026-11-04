// 披薩大盜 · 質因數追逐戰(權威伺服器)
// 1 個大盜 vs 最多 4 個店員。每走一格都要把那格的數字質因數分解。
// 所有判定(移動、抓到、披薩、道具、計時)都在這裡算,前端只負責顯示與送出輸入。
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

// 加入用 QR code:掃了直接打開「加入房間」並帶好房號
app.get("/qr/:code.svg", async (req, res) => {
  const code = String(req.params.code).replace(/\D/g, "").slice(0, 4);
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0];
  const url = `${proto}://${req.get("host")}/?join=${code}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#3b2418", light: "#ffffff" } });
  res.type("image/svg+xml").send(svg);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ================= 規則參數(改這裡調平衡) =================
const COUNTDOWN    = 3000;
const MISS_CD      = 1000;  // 打錯:暈 1 秒
const CHILI_MS     = 6000;  // 🌶️ 鍵盤打亂
const CHILI_RANGE  = 3;     // 🌶️ 影響範圍(步數)
const TABLE_MS     = 12000; // 🪑 桌子維持多久
const TABLE_RANGE  = 2;     // 🪑 可以放多遠
const SCOOT_MOVES  = 3;     // 🛵 免解題的步數
const ITEM_MAX     = 2;     // 大盜身上最多帶幾個道具
const START_ITEMS  = 1;     // 開局送幾個道具
const MAX_CHASERS  = 4;

// 自動難度:每個「店員人數」各自一個 d。d 越大對店員越難。
// 店員贏 → d += 0.7,店員輸 → d -= 0.3。長期平衡點:p·0.7 = (1-p)·0.3 → p = 30%。
const STEP_WIN = 0.7, STEP_LOSE = 0.3;
const MATCH_S_OVERRIDE = Number(process.env.MATCH_S) || 0; // 測試用:強制一場幾秒
function params(k, d) {
  const timeS = MATCH_S_OVERRIDE || clamp(Math.round(150 - 10 * d), 60, 300);
  const need = clamp(Math.round(6 - 0.5 * d), 2, 12);
  return { timeS, need };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 地圖:# = 桌子/烤爐(永久障礙)。1~2 個店員用小地圖,3~4 個用大地圖。
const LAYOUTS = {
  small: [            // 9×9
    ".........",
    ".##...##.",
    ".#.....#.",
    "...#.#...",
    ".........",
    "...#.#...",
    ".#.....#.",
    ".##...##.",
    ".........",
  ],
  big: [              // 11×11
    "...........",
    ".##..#..##.",
    ".#.......#.",
    "...##.##...",
    "...........",
    ".#..#.#..#.",
    "...........",
    "...##.##...",
    ".#.......#.",
    ".##..#..##.",
    "...........",
  ],
};
const PIZZAS_ON = { small: 3, big: 4 }; // 場上同時有幾片披薩

// ================= 出題(格子上的數字) =================
function factorize(n) {
  const f = [];
  for (let d = 2; d * d <= n; d++) while (n % d === 0) { f.push(d); n /= d; }
  if (n > 1) f.push(n);
  return f;
}
function isPrime(n) {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}
const maxRun = (f) => { let best = 1, run = 1; for (let i = 1; i < f.length; i++) { run = f[i] === f[i - 1] ? run + 1 : 1; best = Math.max(best, run); } return best; };

// 四種地形,讓地圖有好走和難走的路:
//   easy  兩位數合數            12 = 2×2×3
//   mid   三位數、小質因數堆疊   210 = 2×3×5×7
//   hard  三位數、有大質因數     437 = 19×23、143 = 11×13(看起來很像質數)
//   prime 兩位數質數(捷徑)     97 —— 只要認得出它是質數,一下就過
const POOL = (() => {
  const easy = [], mid = [], hard = [], prime = [];
  for (let n = 10; n <= 999; n++) {
    const f = factorize(n);
    if (f.length === 1) { if (n <= 97) prime.push(n); continue; }
    const mx = f[f.length - 1];
    if (mx > 37 || maxRun(f) > 3) continue;
    if (n < 100) easy.push(n);
    else if ((mx >= 17 || f.length === 2) && f.length <= 3) hard.push(n);
    else if (f.length >= 3 && f.length <= 4) mid.push(n);
  }
  return { easy, mid, hard, prime };
})();
const MIX = [["easy", 35], ["mid", 30], ["hard", 20], ["prime", 15]];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
function genNum() {
  let x = Math.random() * 100;
  for (const [k, w] of MIX) { if ((x -= w) < 0) return rnd(POOL[k]); }
  return rnd(POOL.easy);
}

// ================= 道具 =================
const ITEMS = {
  table: { emoji: "🪑", name: "翻桌",   desc: "在 2 格內放一張桌子擋路 12 秒" },
  scoot: { emoji: "🛵", name: "外送車", desc: "接下來 3 步免解題" },
  chili: { emoji: "🌶️", name: "辣椒粉", desc: "3 步內的店員鍵盤亂掉 6 秒" },
};
const ITEM_KEYS = Object.keys(ITEMS);

// ================= 難度紀錄(存檔) =================
const DATA_FILE = path.join(__dirname, "data", "difficulty.json");
let DIFF = { byK: {} };
try { DIFF = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { /* 第一次跑,沒檔案 */ }
function diffOf(k) {
  const key = String(k);
  if (!DIFF.byK[key]) DIFF.byK[key] = { d: 0, games: 0, wins: 0, recent: [] };
  return DIFF.byK[key];
}
function saveDiff() {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(DIFF, null, 2)); }
  catch (e) { console.error("難度存檔失敗", e.message); }
}

// ================= 日誌 =================
const rooms = new Map();
let liveConns = 0, totalGames = 0;
function slog(text) {
  const t = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Taipei" });
  const playing = [...rooms.values()].filter((r) => r.phase === "playing").length;
  console.log(`[${t}] ${text} | 線上 ${liveConns} · 房 ${rooms.size} · 進行中 ${playing}`);
}

// ================= 小工具 =================
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const people = (r) => (r.boss ? [r.boss, ...r.chasers] : r.chasers.slice());
const online = (p) => p && p.ws && p.ws.readyState === 1;
function broadcast(r, o) { people(r).forEach((p) => send(p.ws, o)); r.screens.forEach((s) => send(s, o)); }
function log(r, text, kind) { broadcast(r, { t: "log", text, kind: kind || "sys" }); }
function note(p, text, kind) { send(p.ws, { t: "log", text, kind: kind || "sys" }); }
const rc = (r, i) => [Math.floor(i / r.cols), i % r.cols];
const dist = (r, a, b) => { const [ar, ac] = rc(r, a), [br, bc] = rc(r, b); return Math.abs(ar - br) + Math.abs(ac - bc); };
function newCode() { let c; do { c = String(1000 + Math.floor(Math.random() * 9000)); } while (rooms.has(c)); return c; }
function mkPlayer(ws, name, tok, role) {
  return { id: crypto.randomUUID().slice(0, 8), ws, tok: String(tok || "").slice(0, 40), role,
           name: (String(name || "").trim() || (role === "boss" ? "大盜" : "店員")).slice(0, 8),
           pos: -1, aim: null, aimN: 0, rem: 0, got: [], cdUntil: 0, stunUntil: 0, scrambleUntil: 0,
           moves: 0, misses: 0, items: [], freeMoves: 0, pizzas: 0 };
}

// ================= 大廳 =================
function lobbyMsg(r) {
  const k = Math.max(1, r.chasers.length);
  const df = diffOf(k);
  const recent = df.recent.slice(-20);
  return {
    t: "lobby", code: r.code,
    boss: r.boss ? { name: r.boss.name, online: online(r.boss) } : null,
    chasers: r.chasers.map((p) => ({ name: p.name, online: online(p) })),
    k: r.chasers.length, d: Math.round(df.d * 10) / 10, ...params(k, df.d),
    games: df.games, wins: df.wins, recentGames: recent.length, recentWins: recent.filter(Boolean).length,
    items: ITEMS,
  };
}
function pushLobby(r) {
  const m = lobbyMsg(r);
  people(r).forEach((p) => send(p.ws, { ...m, you: p.role }));
  r.screens.forEach((s) => send(s, { ...m, you: "screen" }));
}

// ================= 對局 =================
function walkable(r, idx, mover) {
  if (idx < 0 || idx >= r.rows * r.cols) return false;
  if (r.walls[idx] || r.tables.has(idx)) return false;
  // 店員之間互相擋路(可以用來堵人);大盜不能走進店員的格子;店員走進大盜的格子 = 抓到
  if (r.chasers.some((q) => q !== mover && q.pos === idx)) return false;
  return true;
}
function startGame(r) {
  const k = r.chasers.length;
  const lay = k <= 2 ? "small" : "big";
  const grid = LAYOUTS[lay];
  r.layout = lay; r.rows = grid.length; r.cols = grid[0].length; r.k = k;
  r.walls = grid.join("").split("").map((ch) => ch === "#");
  r.nums = r.walls.map((w) => (w ? 0 : genNum()));
  r.tables = new Map(); r.pizzas = new Set();
  const df = diffOf(k);
  const pr = params(k, df.d);
  r.need = pr.need; r.timeS = pr.timeS;
  r.startedAt = Date.now(); r.endsAt = r.startedAt + pr.timeS * 1000;

  const R = r.rows, C = r.cols;
  const corners = [0, R * C - 1, C - 1, (R - 1) * C];
  const reset = (p) => Object.assign(p, { aim: null, aimN: 0, rem: 0, got: [], cdUntil: 0, stunUntil: 0, scrambleUntil: 0,
                                          moves: 0, misses: 0, items: [], freeMoves: 0, pizzas: 0 });
  reset(r.boss); r.boss.pos = Math.floor(R / 2) * C + Math.floor(C / 2);
  for (let i = 0; i < START_ITEMS; i++) r.boss.items.push(rnd(ITEM_KEYS));
  r.chasers.forEach((p, i) => { reset(p); p.pos = corners[i]; });
  for (let i = 0; i < PIZZAS_ON[lay]; i++) spawnPizza(r);

  r.phase = "playing";
  broadcast(r, { t: "start", rows: R, cols: C, walls: r.walls, items: ITEMS, need: r.need });
  clearInterval(r.tick);
  r.tick = setInterval(() => onTick(r), 250);
  totalGames++;
  slog(`▶ 開局 #${r.code} 🦹${r.boss.name} vs ${r.chasers.map((p) => "👨‍🍳" + p.name).join(" ")} · d=${df.d.toFixed(1)} · ${pr.timeS}s / ${pr.need}🍕`);
  pushState(r);
}
function spawnPizza(r) {
  const cand = [];
  for (let i = 0; i < r.rows * r.cols; i++) {
    if (r.walls[i] || r.tables.has(i) || r.pizzas.has(i)) continue;
    if (people(r).some((p) => p.pos === i)) continue;
    if (dist(r, i, r.boss.pos) < 3) continue;
    cand.push(i);
  }
  if (cand.length) r.pizzas.add(rnd(cand));
}
function onTick(r) {
  if (r.phase !== "playing") return;
  const now = Date.now();
  let dirty = false;
  for (const [idx, until] of r.tables) if (now >= until) { r.tables.delete(idx); dirty = true; }
  if (now >= r.endsAt) return endGame(r, "time");
  if (dirty) pushState(r);
}
function snapFor(r, me) {
  const now = Date.now();
  const b = r.boss;
  const ppl = [{ id: b.id, role: "boss", name: b.name, pos: b.pos, online: online(b), stun: now < Math.max(b.stunUntil, b.cdUntil) }]
    .concat(r.chasers.map((p, i) => ({ id: p.id, role: "chaser", idx: i, name: p.name, pos: p.pos, online: online(p), stun: now < Math.max(p.stunUntil, p.cdUntil) })));
  const s = {
    t: "state", msLeft: Math.max(0, r.endsAt - now), got: b.pizzas, need: r.need,
    nums: r.nums, tables: [...r.tables.keys()], pizzas: [...r.pizzas],
    people: ppl,
  };
  if (me) s.me = { id: me.id, role: me.role, pos: me.pos, aim: me.aim, aimN: me.aimN, rem: me.rem, got: me.got,
                   cdMs: Math.max(0, me.cdUntil - now), stunMs: Math.max(0, me.stunUntil - now),
                   scrambleMs: Math.max(0, me.scrambleUntil - now), items: me.items, freeMoves: me.freeMoves };
  return s;
}
function pushState(r) {
  if (r.phase !== "playing") return;
  people(r).forEach((p) => send(p.ws, snapFor(r, p)));
  if (r.screens.length) { const s = snapFor(r, null); r.screens.forEach((w) => send(w, s)); }
}

function onAim(r, p, idx) {
  if (r.phase !== "playing" || !Number.isInteger(idx)) return;
  if (p.aim === idx) return;                                   // 同一格再點一次:保留進度
  if (dist(r, p.pos, idx) !== 1) return;
  if (!walkable(r, idx, p)) return note(p, "那格走不過去", "bad");
  if (p.role === "boss" && idx === p.pos) return;
  p.aim = idx; p.aimN = r.nums[idx]; p.rem = p.aimN; p.got = [];
  if (p.role === "boss" && p.freeMoves > 0) { p.freeMoves--; return doMove(r, p); }
  pushState(r);
}
function onGuess(r, p, v) {
  if (r.phase !== "playing" || p.aim === null) return;
  const now = Date.now();
  if (now < p.cdUntil || now < p.stunUntil) return;
  v = Number(v);
  if (!Number.isInteger(v) || v < 2 || v > 9999) return;
  if (!isPrime(v) || p.rem % v !== 0) {
    p.cdUntil = now + MISS_CD; p.misses++;
    note(p, !isPrime(v) ? `✗ ${v} 不是質數` : `✗ ${v} 除不盡 ${p.rem}`, "bad");
    send(p.ws, { t: "fx", kind: "miss" });
    setTimeout(() => pushState(r), MISS_CD + 30);  // 暈完再推一次,讓別人畫面上的暈眩圈消失
    return pushState(r);
  }
  p.rem /= v; p.got.push(v);
  if (p.rem === 1) return doMove(r, p);
  pushState(r);
}
function refreshTile(r, idx) {
  r.nums[idx] = genNum();
  people(r).forEach((q) => {
    if (q.aim === idx) { q.aimN = r.nums[idx]; q.rem = q.aimN; q.got = []; note(q, "那格被人踩過,數字換了!", "bad"); }
  });
}
function doMove(r, p) {
  const idx = p.aim;
  p.aim = null; p.rem = 0; p.got = [];
  if (!walkable(r, idx, p) || dist(r, p.pos, idx) !== 1) { note(p, "被擋住了!", "bad"); return pushState(r); }
  if (p.role === "chaser" && r.boss.pos === idx) { p.pos = idx; p.moves++; return endGame(r, "caught", p); }
  p.pos = idx; p.moves++;
  refreshTile(r, idx);
  const now = Date.now();
  if (p.role === "boss" && r.pizzas.has(idx)) {
    r.pizzas.delete(idx); p.pizzas++;
    let extra = "";
    if (p.items.length < ITEM_MAX) { const it = rnd(ITEM_KEYS); p.items.push(it); extra = `,撿到 ${ITEMS[it].emoji}`; }
    log(r, `🍕 大盜偷到第 ${p.pizzas} 片披薩${p.pizzas < r.need ? `(還差 ${r.need - p.pizzas} 片)` : ""}`, "pizza");
    if (extra) note(p, `你${extra.slice(1)} ${ITEMS[p.items[p.items.length - 1]].name}`, "skill");
    if (p.pizzas >= r.need) return endGame(r, "pizza");
    spawnPizza(r);
  }
  pushState(r);
}
function onItem(r, p, slot, target) {
  if (r.phase !== "playing" || p.role !== "boss") return;
  const key = p.items[slot];
  if (!key) return;
  const now = Date.now();
  if (key === "table") {
    if (!Number.isInteger(target) || target < 0 || target >= r.rows * r.cols) return;
    if (r.walls[target] || r.tables.has(target) || r.pizzas.has(target)) return note(p, "那格不能放桌子", "bad");
    if (people(r).some((q) => q.pos === target)) return note(p, "有人站在那裡", "bad");
    if (dist(r, p.pos, target) > TABLE_RANGE) return note(p, `只能放在 ${TABLE_RANGE} 格以內`, "bad");
    r.tables.set(target, now + TABLE_MS);
    r.chasers.forEach((q) => { if (q.aim === target) { q.aim = null; q.rem = 0; q.got = []; note(q, "🪑 前面被翻桌擋住了!", "bad"); } });
    log(r, "🪑 大盜翻桌了!", "skill");
  } else if (key === "scoot") {
    p.freeMoves += SCOOT_MOVES;
    log(r, `🛵 大盜騎上外送車,接下來 ${SCOOT_MOVES} 步免解題!`, "skill");
  } else if (key === "chili") {
    const hit = r.chasers.filter((q) => dist(r, q.pos, p.pos) <= CHILI_RANGE);
    hit.forEach((q) => { q.scrambleUntil = now + CHILI_MS; send(q.ws, { t: "fx", kind: "scramble", ms: CHILI_MS }); });
    log(r, hit.length ? `🌶️ 辣椒粉!${hit.map((q) => q.name).join("、")} 的鍵盤亂了` : "🌶️ 大盜灑了辣椒粉…但沒人在附近", "skill");
  }
  p.items.splice(slot, 1);
  pushState(r);
}
function endGame(r, why, catcher) {
  if (r.phase !== "playing") return;
  r.phase = "over";
  clearInterval(r.tick);
  const chasersWin = why === "caught";
  const df = diffOf(r.k);
  const before = df.d;
  if (!r.aborted) {
    df.games++; if (chasersWin) df.wins++;
    df.recent.push(chasersWin); df.recent = df.recent.slice(-50);
    df.d = Math.round((df.d + (chasersWin ? STEP_WIN : -STEP_LOSE)) * 100) / 100;
    saveDiff();
  }
  const elapsed = Math.round((Date.now() - r.startedAt) / 1000);
  const stats = people(r).map((p) => ({ name: p.name, role: p.role, moves: p.moves, misses: p.misses }));
  broadcast(r, { t: "over", why, chasersWin, catcher: catcher ? catcher.name : null,
                 got: r.boss.pizzas, need: r.need, elapsed, stats, boss: r.boss.name,
                 d: df.d, dBefore: before });
  slog(`■ 結束 #${r.code} ${chasersWin ? "店員勝" : "大盜勝"}(${why}) · ${elapsed}s · 🍕${r.boss.pizzas}/${r.need} · d ${before}→${df.d} · 累計 ${totalGames} 場`);
}

// ================= 連線 =================
function findByTok(r, tok) { return tok ? people(r).find((p) => p.tok === tok) : null; }
function reattach(r, p, ws) {
  if (p.ws && p.ws !== ws) { p.ws._room = null; try { p.ws.close(); } catch {} }
  p.ws = ws; ws._room = r.code;
  if (r.phase === "playing") {
    send(ws, { t: "start", rows: r.rows, cols: r.cols, walls: r.walls, items: ITEMS, need: r.need, resume: true });
    pushState(r);
  } else pushLobby(r);
}

wss.on("connection", (ws) => {
  liveConns++;
  ws.on("message", (buf) => {
    let m; try { m = JSON.parse(buf); } catch { return; }
    const r = ws._room ? rooms.get(ws._room) : null;
    const me = r ? people(r).find((p) => p.ws === ws) : null;

    if (m.t === "create") {
      const code = newCode();
      const room = { code, boss: null, chasers: [], screens: [], phase: "lobby", lastActive: Date.now() };
      room.boss = mkPlayer(ws, m.name, m.tok, "boss");
      rooms.set(code, room); ws._room = code;
      slog(`＋ 開房 #${code} 🦹${room.boss.name}`);
      return pushLobby(room);
    }
    if (m.t === "join" || m.t === "resume") {
      const room = rooms.get(String(m.code || "").trim());
      if (!room) return send(ws, { t: "err", msg: "找不到這個房間", quiet: m.t === "resume" });
      const old = findByTok(room, m.tok);
      if (old) return reattach(room, old, ws);
      if (m.t === "resume") return send(ws, { t: "err", msg: "", quiet: true });
      if (room.phase !== "lobby" && room.phase !== "over") return send(ws, { t: "err", msg: "這局已經開始了,等下一局" });
      if (room.chasers.length >= MAX_CHASERS) return send(ws, { t: "err", msg: "店員已經滿 4 個了" });
      room.chasers.push(mkPlayer(ws, m.name, m.tok, "chaser"));
      ws._room = room.code;
      if (room.phase === "over") { room.phase = "lobby"; }
      return pushLobby(room);
    }
    if (m.t === "watch") {
      const room = rooms.get(String(m.code || "").trim());
      if (!room) return send(ws, { t: "err", msg: "找不到這個房間" });
      room.screens.push(ws); ws._room = room.code; ws._screen = true;
      if (room.phase === "playing") { send(ws, { t: "start", rows: room.rows, cols: room.cols, walls: room.walls, items: ITEMS, need: room.need, resume: true }); send(ws, snapFor(room, null)); }
      else pushLobby(room);
      return;
    }

    if (!r || !me) return;
    r.lastActive = Date.now();
    const isBoss = me.role === "boss";
    switch (m.t) {
      case "start":
        if (!isBoss || (r.phase !== "lobby" && r.phase !== "over")) return;
        r.chasers = r.chasers.filter(online);
        if (!r.chasers.length) return send(ws, { t: "err", msg: "至少要有 1 個店員" });
        r.phase = "countdown";
        broadcast(r, { t: "countdown", ms: COUNTDOWN });
        clearTimeout(r.cdTimer);
        r.cdTimer = setTimeout(() => { if (r.phase === "countdown" && r.chasers.length && r.boss) startGame(r); }, COUNTDOWN);
        return;
      case "adj":
        if (!isBoss || r.phase === "playing" || r.phase === "countdown") return;
        { const df = diffOf(Math.max(1, r.chasers.length)); df.d = clamp(Math.round((df.d + (m.v > 0 ? 0.5 : -0.5)) * 10) / 10, -10, 10); saveDiff(); }
        return pushLobby(r);
      case "lobby":
        if (!isBoss || r.phase !== "over") return;
        r.phase = "lobby"; r.chasers = r.chasers.filter(online);
        return pushLobby(r);
      case "kick":
        if (!isBoss || r.phase !== "lobby") return;
        { const q = r.chasers[m.i]; if (q) { r.chasers.splice(m.i, 1); send(q.ws, { t: "err", msg: "你被請出房間了", fatal: true }); q.ws._room = null; } }
        return pushLobby(r);
      case "aim":   return onAim(r, me, m.i);
      case "guess": return onGuess(r, me, m.v);
      case "item":  return onItem(r, me, m.slot, m.target);
    }
  });

  ws.on("close", () => {
    liveConns--;
    const r = ws._room ? rooms.get(ws._room) : null;
    if (!r) return;
    if (ws._screen) { r.screens = r.screens.filter((s) => s !== ws); return; }
    const p = people(r).find((q) => q.ws === ws);
    if (!p) return;
    // 遊戲中斷線先保留位置(手機螢幕關掉很常見),重新打開網頁會自動接回去
    if (r.phase === "lobby" && p.role === "chaser") r.chasers = r.chasers.filter((q) => q !== p);
    if (r.phase === "lobby") pushLobby(r);   // 結算畫面時不要推大廳,否則大家的結算會被瞬間蓋掉
    else if (r.phase === "playing") { log(r, `📴 ${p.name} 斷線了`, "bad"); pushState(r); }
  });
});

// 沒人連著的房間放 15 分鐘就收掉
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    const anyOnline = people(r).some(online) || r.screens.some((s) => s.readyState === 1);
    if (anyOnline) r.lastActive = now;
    else if (now - r.lastActive > 15 * 60 * 1000) { clearInterval(r.tick); clearTimeout(r.cdTimer); rooms.delete(code); }
  }
}, 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`披薩大盜 running on http://localhost:${PORT}`);
  console.log(`題庫:easy ${POOL.easy.length} · mid ${POOL.mid.length} · hard ${POOL.hard.length} · prime ${POOL.prime.length}`);
});
