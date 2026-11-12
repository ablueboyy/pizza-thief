// 披薩大盜 · 插圖(全部手寫 SVG,不用 emoji,每台手機看起來都一樣)
// viewBox 一律 0 0 100 100,外框色統一用 O,線寬 5 左右,縮到 30px 也看得清楚
(function () {
  const O = "#4a2c1d";
  const SKIN = "#ffe1c4", CHEEK = "#ff9b8a", NIGHT = "#2a2342";
  const svg = (body, cls) => `<svg class="${cls || "art"}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const st = (w) => `stroke="${O}" stroke-width="${w || 5}" stroke-linejoin="round" stroke-linecap="round"`;
  const cheeks = (y, dx) => `<ellipse cx="${50 - dx}" cy="${y}" rx="4.6" ry="3" fill="${CHEEK}" opacity=".85"/><ellipse cx="${50 + dx}" cy="${y}" rx="4.6" ry="3" fill="${CHEEK}" opacity=".85"/>`;

  // ---------- 角色(圓形頭像) ----------
  function thief(bg, mood) {
    const eyes = mood === "dizzy"
      ? `<path d="M34 61 l8 8 M42 61 l-8 8 M58 61 l8 8 M66 61 l-8 8" ${st(3.2)} stroke="#fff" fill="none"/>`
      : `<circle cx="38" cy="65" r="5.6" fill="#fff"/><circle cx="62" cy="65" r="5.6" fill="#fff"/>
         <circle cx="39.4" cy="66" r="2.8" fill="${NIGHT}"/><circle cx="63.4" cy="66" r="2.8" fill="${NIGHT}"/>
         <circle cx="40.4" cy="64.6" r=".9" fill="#fff"/><circle cx="64.4" cy="64.6" r=".9" fill="#fff"/>`;
    const mouth = mood === "dizzy" ? `<ellipse cx="50" cy="81" rx="4" ry="3.4" fill="${O}"/>`
      : `<path d="M43 79 Q51 86 59 78" fill="none" ${st(3.6)}/>`;
    return svg(`
      <circle cx="50" cy="50" r="46" fill="${bg || "#b48cff"}" ${st()}/>
      <circle cx="50" cy="59" r="29" fill="${SKIN}" ${st()}/>
      <path d="M21 53 C21 27 35 16 50 16 C65 16 79 27 79 53 Z" fill="#3c3769" ${st()}/>
      <path d="M33 26 Q40 21 47 20" fill="none" stroke="#6a64b0" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="18.5" y="45" width="63" height="12" rx="6" fill="#ff6b57" ${st(4.5)}/>
      <circle cx="50" cy="14" r="7" fill="#fffaf0" ${st(4.5)}/>
      <path d="M22.5 62 Q50 54 77.5 62 Q79 72 70 74.5 Q59 76 50 70.5 Q41 76 30 74.5 Q21 72 22.5 62Z" fill="${NIGHT}"/>
      ${eyes}${cheeks(79, 21)}${mouth}`, "art tok");
  }
  function chef(bg, mood) {
    const eyes = mood === "dizzy"
      ? `<path d="M37 60 l7 7 M44 60 l-7 7 M56 60 l7 7 M63 60 l-7 7" fill="none" ${st(3)}/>`
      : `<ellipse cx="41" cy="63" rx="3.6" ry="4.4" fill="${O}"/><ellipse cx="59" cy="63" rx="3.6" ry="4.4" fill="${O}"/>
         <circle cx="42.2" cy="61.6" r="1.2" fill="#fff"/><circle cx="60.2" cy="61.6" r="1.2" fill="#fff"/>`;
    const hat = [[33, 31, 13], [50, 24, 15.5], [67, 31, 13]];
    return svg(`
      <circle cx="50" cy="50" r="46" fill="${bg || "#ff8fb1"}" ${st()}/>
      <circle cx="50" cy="63" r="26" fill="${SKIN}" ${st()}/>
      ${hat.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" ${st()}/>`).join("")}
      <rect x="30" y="30" width="40" height="19" rx="3" fill="#fff" ${st()}/>
      ${hat.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2.5}" fill="#fff"/>`).join("")}
      <rect x="32.5" y="27" width="35" height="14" fill="#fff"/>
      <path d="M33 41.5 H67" stroke="#f1dcc6" stroke-width="4" stroke-linecap="round"/>
      ${eyes}${cheeks(72, 18)}
      <path d="M44.5 73 Q50 78.5 55.5 73" fill="none" ${st(3.4)}/>`, "art tok");
  }

  // ---------- 東西 ----------
  const pepperoni = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ff6b57" ${st(3.4)}/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .28}" fill="#ffb3a6"/>`;
  function pizza() {
    return svg(`
      <path d="M50 93 L13 27 Q50 8 87 27 Z" fill="#ffd15c" ${st()}/>
      <path d="M13 27 Q50 8 87 27 L82.5 36 Q50 19 17.5 36 Z" fill="#f2a95b" ${st(4.5)}/>
      <path d="M27 49 Q28 60 32 59 Q34 57 33 50" fill="#ffd15c" ${st(3)}/>
      ${pepperoni(41, 46, 7.5)}${pepperoni(61, 52, 6.5)}${pepperoni(50, 70, 5.5)}
      <path d="M58 33 Q63 31 67 33" stroke="#fff6cf" stroke-width="3" stroke-linecap="round" fill="none"/>`);
  }
  // 首頁 logo:戴眼罩的披薩
  function logo() {
    return svg(`
      <path d="M50 95 L11 25 Q50 4 89 25 Z" fill="#ffd15c" ${st(4.5)}/>
      <path d="M11 25 Q50 4 89 25 L84.5 34.5 Q50 15 15.5 34.5 Z" fill="#f2a95b" ${st(4)}/>
      <path d="M19 41 Q50 33 81 41 L77 53 Q64 55 50 49 Q36 55 23 53 Z" fill="${NIGHT}" ${st(3.5)}/>
      <path d="M17 41 L7 36 M17 43 L8 47" ${st(3.5)} fill="none"/>
      <circle cx="37" cy="45.5" r="5" fill="#fff"/><circle cx="63" cy="45.5" r="5" fill="#fff"/>
      <circle cx="38.4" cy="46.4" r="2.6" fill="${NIGHT}"/><circle cx="64.4" cy="46.4" r="2.6" fill="${NIGHT}"/>
      <path d="M43 61 Q50 67 57 60" fill="none" ${st(3.4)}/>
      ${cheeks(60, 17)}
      ${pepperoni(42, 76, 5)}${pepperoni(58, 72, 4.6)}`);
  }
  // 道具:翻倒的桌子
  function table() {
    const leg = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${O}" stroke-width="12" stroke-linecap="round"/><path d="M${x1} ${y1} L${x2} ${y2}" stroke="#d99a68" stroke-width="5" stroke-linecap="round"/>`;
    return svg(`
      ${leg(28, 58, 20, 17)}${leg(72, 58, 80, 17)}${leg(50, 58, 50, 22)}
      <rect x="10" y="56" width="80" height="15" rx="5" fill="#c98a5c" ${st()}/>
      <path d="M13 71 H87 L81 91 H19 Z" fill="#fffaf0" ${st(4.5)}/>
      <path d="M26 73 h10 v8 h-10z M48 73 h10 v8 h-10z M70 73 h10 v8 h-10z M37 81 h10 v8 h-10z M59 81 h10 v8 h-10z" fill="#ff6b57"/>
      <path d="M12 30 Q8 22 12 14 M88 30 Q92 22 88 14" fill="none" ${st(3.5)}/>`);
  }
  // 道具:外送車
  function scoot() {
    return svg(`
      <path d="M3 48 H11 M1 59 H9" ${st(4)} fill="none"/>
      <rect x="13" y="22" width="31" height="27" rx="5" fill="#ffd15c" ${st()}/>
      <path d="M21 31 L29 44 L37 31 Q29 27 21 31Z" fill="#ff6b57" ${st(2.8)}/>
      <path d="M66 36 L62 20 H74" fill="none" ${st(5)}/>
      <path d="M14 66 Q14 51 30 51 H57 L65 35 H72 L82 62 Q84 75 70 75 H24 Q14 75 14 66Z" fill="#ff6b57" ${st()}/>
      <rect x="29" y="44" width="25" height="9" rx="4.5" fill="${O}"/>
      <circle cx="79" cy="47" r="4.6" fill="#fffaf0" ${st(3)}/>
      <circle cx="27" cy="77" r="11" fill="${O}"/><circle cx="27" cy="77" r="4.4" fill="#fffaf0"/>
      <circle cx="75" cy="77" r="11" fill="${O}"/><circle cx="75" cy="77" r="4.4" fill="#fffaf0"/>`);
  }
  // 道具:噴墨汁的章魚
  function ink() {
    const leg = (d) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="12.5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ff8fb1" stroke-width="6" stroke-linecap="round"/>`;
    return svg(`
      ${leg("M30 60 Q18 74 28 88")}${leg("M43 64 Q38 80 45 92")}${leg("M57 64 Q63 80 55 92")}${leg("M70 60 Q82 74 72 88")}
      <path d="M21 58 C21 29 35 13 50 13 C65 13 79 29 79 58 Q79 69 50 69 Q21 69 21 58Z" fill="#ff8fb1" ${st()}/>
      <circle cx="35" cy="28" r="4" fill="#ffc2d4"/><circle cx="66" cy="25" r="3" fill="#ffc2d4"/>
      <circle cx="40" cy="44" r="5.5" fill="#fff" ${st(2.6)}/><circle cx="60" cy="44" r="5.5" fill="#fff" ${st(2.6)}/>
      <circle cx="41" cy="45" r="2.6" fill="${O}"/><circle cx="61" cy="45" r="2.6" fill="${O}"/>
      ${cheeks(54, 19)}
      <ellipse cx="50" cy="57" rx="4.6" ry="3.6" fill="${O}"/>
      <path d="M87 6 Q96 21 87 26 Q78 21 87 6Z" fill="${NIGHT}" ${st(3)}/>
      <circle cx="94" cy="34" r="3" fill="${NIGHT}"/>`);
  }
  function clock() {
    return svg(`
      <rect x="42" y="4" width="16" height="12" rx="3" fill="#ff6b57" ${st(4.5)}/>
      <path d="M76 20 L84 12" ${st(9)}/>
      <circle cx="50" cy="56" r="36" fill="#fffaf0" ${st(6)}/>
      <path d="M50 56 V34 M50 56 L64 63" ${st(6)} fill="none"/>
      <circle cx="50" cy="56" r="4" fill="${O}"/>`);
  }
  // 暈眩小星星
  function stars() {
    const star = (x, y, r) => {
      let d = "";
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; d += (i ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1); }
      return `<path d="${d}Z" fill="#ffd15c" ${st(4)}/>`;
    };
    return svg(star(32, 40, 26) + star(72, 66, 20));
  }
  function stop() {
    return svg(`
      <path d="M33 6 H67 L94 33 V67 L67 94 H33 L6 67 V33 Z" fill="#ff6b57" ${st(6)}/>
      <rect x="24" y="42" width="52" height="16" rx="5" fill="#fffaf0" ${st(4)}/>`);
  }
  function sparkle() {
    return svg(`<path d="M50 4 Q55 45 96 50 Q55 55 50 96 Q45 55 4 50 Q45 45 50 4Z" fill="#ffd15c" ${st(5)}/>`);
  }

  // ---------- 店裡的擺設(地圖上的牆) ----------
  const tile = (body, bg) => svg(`<rect width="100" height="100" fill="${bg}"/>${body}`, "art wallart");
  function oven() {
    let bricks = "";
    for (let y = 0; y < 100; y += 20) {
      bricks += `<path d="M0 ${y} H100" stroke="#8d4a2b" stroke-width="3"/>`;
      for (let x = (y / 20) % 2 ? 25 : 0; x < 100; x += 50) bricks += `<path d="M${x} ${y} V${y + 20}" stroke="#8d4a2b" stroke-width="3"/>`;
    }
    return tile(`${bricks}
      <path d="M16 100 V60 Q16 30 50 30 Q84 30 84 60 V100Z" fill="#3a1f14" stroke="#6e3a20" stroke-width="6"/>
      <path d="M24 100 V70 Q50 52 76 70 V100Z" fill="#ff9a3c" opacity=".45"/>
      <path d="M34 100 Q30 84 40 74 Q40 84 46 86 Q44 72 54 64 Q54 78 62 82 Q66 76 66 70 Q74 84 66 100Z" fill="#ff7a2e"/>
      <path d="M42 100 Q40 90 47 84 Q48 91 52 92 Q53 86 57 82 Q62 92 58 100Z" fill="#ffd15c"/>`, "#b5653f");
  }
  function counter(deco) {
    const top = {
      register: `<rect x="26" y="6" width="44" height="22" rx="4" fill="#9fb8c8" ${st(4)}/><rect x="33" y="10" width="30" height="8" rx="2" fill="#d8f5e4"/>
                 <rect x="40" y="-2" width="16" height="9" rx="2" fill="#fffaf0" ${st(3)}/>`,
      boxes: `<rect x="18" y="12" width="64" height="9" rx="2" fill="#f2c48d" ${st(3.5)}/><rect x="22" y="3" width="58" height="9" rx="2" fill="#f7d6a8" ${st(3.5)}/>
              <circle cx="51" cy="8" r="2.6" fill="#ff6b57"/>`,
      dough: `<ellipse cx="50" cy="16" rx="26" ry="10" fill="#fff3dc" ${st(3.5)}/><circle cx="58" cy="13" r="3" fill="#ffe6b8"/>`,
      none: ``,
    }[deco] || "";
    return tile(`
      <rect x="0" y="0" width="100" height="30" fill="#e6b07a"/>
      <path d="M0 30 H100" stroke="#7a4426" stroke-width="5"/>
      <path d="M6 7 H40" stroke="#f3cb9c" stroke-width="4" stroke-linecap="round"/>
      <path d="M25 33 V100 M50 33 V100 M75 33 V100" stroke="#93542f" stroke-width="3"/>
      ${top}`, "#b0693b");
  }
  function shelf() {
    const jar = (x, y, c, lid) => `<rect x="${x}" y="${y}" width="17" height="21" rx="4" fill="${c}" ${st(3)}/><rect x="${x + 1}" y="${y - 5}" width="15" height="6" rx="2" fill="${lid}" ${st(2.6)}/>`;
    return tile(`
      <rect x="4" y="4" width="92" height="92" rx="4" fill="#8d5133"/>
      <path d="M4 48 H96 M4 92 H96" stroke="#e6b07a" stroke-width="7"/>
      ${jar(13, 22, "#ff6b57", "#fffaf0")}${jar(41, 22, "#5cc98a", "#f2b872")}${jar(69, 22, "#ffd15c", "#ff6b57")}
      <path d="M14 88 Q12 64 28 62 Q44 64 42 88Z" fill="#fffaf0" ${st(3)}/><path d="M22 74 H34" stroke="#f2b872" stroke-width="3"/>
      ${jar(55, 66, "#ff9b8a", "#5cc98a")}<circle cx="86" cy="80" r="7" fill="#ff6b57" ${st(2.6)}/>`, "#7a4426");
  }
  function plant() {
    const leaf = (x, y, a) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="6" transform="rotate(${a} ${x} ${y})" fill="#5cc98a" ${st(3.2)}/>`;
    return tile(`
      <ellipse cx="50" cy="92" rx="30" ry="6" fill="#000" opacity=".1"/>
      <path d="M50 58 V34 M50 50 L36 38 M50 46 L64 34" stroke="#3fa86d" stroke-width="4" stroke-linecap="round"/>
      ${leaf(34, 36, -30)}${leaf(66, 32, 30)}${leaf(50, 24, 90)}${leaf(38, 52, 20)}${leaf(62, 48, -20)}
      <path d="M28 58 H72 L66 92 H34 Z" fill="#e0773f" ${st(4)}/><rect x="24" y="54" width="52" height="11" rx="3" fill="#f0905a" ${st(4)}/>`, "#fff3e2");
  }
  function crate() {
    const tom = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="#ff6b57" ${st(3.4)}/><path d="M${x - 4} ${y - 10} L${x} ${y - 6} L${x + 4} ${y - 10}" stroke="#3fa86d" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
    return tile(`
      ${tom(30, 34)}${tom(52, 30)}${tom(72, 36)}${tom(41, 40)}${tom(62, 42)}
      <rect x="12" y="44" width="76" height="46" rx="4" fill="#d99a68" ${st(4)}/>
      <path d="M12 60 H88 M12 75 H88" stroke="${O}" stroke-width="3"/>
      <path d="M22 44 V90 M78 44 V90" stroke="#b8733f" stroke-width="4"/>`, "#fff3e2");
  }

  // 依照牆的形狀決定擺什麼:橫向連在一起的 = 櫃台;單獨一格 = 烤爐 / 架子 / 盆栽 / 番茄箱
  function wallFor(walls, rows, cols, i) {
    const c = i % cols;
    const L = c > 0 && walls[i - 1], R = c < cols - 1 && walls[i + 1];
    const h = (i * 2654435761) >>> 0;
    if (L || R) return counter(["register", "boxes", "dough", "none"][h % 4]);
    return [oven, shelf, plant, crate][h % 4]();
  }

  window.ART = { thief, chef, pizza, logo, table, scoot, ink, clock, stars, stop, sparkle, wallFor,
    item: (k) => ({ table, scoot, ink }[k] || pizza)(),
    url: (s) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(s.replace(/class="[^"]*"/, ""))}")` };
})();
