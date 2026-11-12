// 披薩大盜 · 音效(Web Audio 即時合成,不用音檔)
// 手機一定要使用者碰過畫面才能出聲,所以每次 pointerdown 都順便 unlock()
(function () {
  let ctx = null, master = null, noiseBuf = null;
  let on = true;
  try { on = localStorage.getItem("pt_sound") !== "0"; } catch {}

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();          // 疊很多聲音時不要爆音
      master.connect(comp).connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
  }
  addEventListener("pointerdown", unlock, true);
  addEventListener("keydown", unlock, true);

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);     // MIDI 音高 → 頻率

  // 一個音:頻率可以滑動,音量快速起音、指數衰減
  function tone({ f, f2, type = "triangle", at = 0, dur = 0.14, vol = 0.3, attack = 0.006 }) {
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }
  // 噪音(噴墨、撞桌子):經過濾波器,截止頻率可以滑動
  function noise({ at = 0, dur = 0.3, vol = 0.3, f = 1200, f2, type = "lowpass", q = 1 }) {
    const t = ctx.currentTime + at;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const flt = ctx.createBiquadFilter(); flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt).connect(g).connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }

  const SOUNDS = {
    // 選格子:很輕的「嘟」
    select() { tone({ f: 880, f2: 1100, type: "sine", dur: 0.06, vol: 0.12 }); },
    // 按對質因數:一顆比一顆高(C D E G A),越拆越有感
    hit(step = 0) {
      const n = [72, 74, 76, 79, 81, 84][Math.min(step, 5)];
      tone({ f: NOTE(n), type: "triangle", dur: 0.12, vol: 0.28 });
      tone({ f: NOTE(n + 12), type: "sine", dur: 0.08, vol: 0.08 });
    },
    // 按錯:往下掉的「噗噗」
    miss() {
      tone({ f: 260, f2: 110, type: "square", dur: 0.22, vol: 0.12 });
      tone({ f: 200, f2: 90, type: "sawtooth", at: 0.05, dur: 0.22, vol: 0.08 });
    },
    // 走過去:彈一下
    step() {
      tone({ f: 420, f2: 900, type: "sine", dur: 0.09, vol: 0.22 });
      tone({ f: 1250, type: "triangle", at: 0.06, dur: 0.07, vol: 0.12 });
    },
    // 偷到披薩:上行琶音
    pizza() { [72, 76, 79, 84].forEach((n, i) => tone({ f: NOTE(n), type: "triangle", at: i * 0.07, dur: 0.18, vol: 0.25 })); },
    // 翻桌:低沉「咚」+ 木頭碰撞
    table() {
      tone({ f: 150, f2: 45, type: "sine", dur: 0.3, vol: 0.5 });
      noise({ dur: 0.12, vol: 0.35, f: 1800, f2: 300 });
      tone({ f: 320, f2: 200, type: "triangle", at: 0.12, dur: 0.1, vol: 0.15 });
    },
    // 外送車:引擎「噗嚕嚕——」往上衝
    scoot() {
      tone({ f: 70, f2: 260, type: "sawtooth", dur: 0.55, vol: 0.12, attack: 0.03 });
      tone({ f: 74, f2: 270, type: "square", at: 0.02, dur: 0.5, vol: 0.06, attack: 0.03 });
      tone({ f: 1300, type: "sine", at: 0.5, dur: 0.12, vol: 0.12 });
    },
    // 墨汁:「啵」+ 濕濕的噴灑聲
    ink() {
      tone({ f: 500, f2: 70, type: "sine", dur: 0.25, vol: 0.4 });
      noise({ at: 0.03, dur: 0.45, vol: 0.4, f: 2200, f2: 180 });
      noise({ at: 0.18, dur: 0.3, vol: 0.2, f: 900, f2: 150, type: "bandpass", q: 3 });
    },
    // 倒數
    count() { tone({ f: NOTE(76), type: "square", dur: 0.12, vol: 0.12 }); },
    go() { tone({ f: NOTE(88), type: "square", dur: 0.35, vol: 0.14 }); tone({ f: NOTE(76), type: "triangle", dur: 0.35, vol: 0.2 }); },
    // 最後 10 秒的心跳
    tick() { tone({ f: 1700, type: "sine", dur: 0.035, vol: 0.12 }); },
    // 抓到了:警笛兩聲 + 一個重音
    catch() {
      tone({ f: 110, f2: 55, type: "sine", dur: 0.4, vol: 0.5 });
      for (let i = 0; i < 4; i++) tone({ f: i % 2 ? 660 : 880, type: "square", at: 0.05 + i * 0.16, dur: 0.15, vol: 0.09 });
    },
    // 贏 / 輸
    win() { [[72, 0], [76, 0.1], [79, 0.2], [84, 0.32], [79, 0.46], [84, 0.56]].forEach(([n, t]) => tone({ f: NOTE(n), type: "triangle", at: t, dur: n === 84 && t > 0.5 ? 0.5 : 0.16, vol: 0.26 })); },
    lose() { [[67, 0], [66, 0.22], [65, 0.44]].forEach(([n, t]) => tone({ f: NOTE(n), type: "triangle", at: t, dur: 0.24, vol: 0.22 })); tone({ f: NOTE(64), f2: NOTE(58), type: "triangle", at: 0.66, dur: 0.6, vol: 0.22 }); },
    // 加入房間、有人進來
    join() { tone({ f: NOTE(79), type: "sine", dur: 0.1, vol: 0.18 }); tone({ f: NOTE(84), type: "sine", at: 0.08, dur: 0.14, vol: 0.18 }); },
  };

  window.SFX = {
    play(name, ...a) {
      if (!on || !ctx || ctx.state !== "running" || !SOUNDS[name]) return;
      try { SOUNDS[name](...a); } catch {}
    },
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem("pt_sound", on ? "1" : "0"); } catch {}
      if (on) { unlock(); setTimeout(() => SFX.play("join"), 30); }
      return on;
    },
  };
})();
