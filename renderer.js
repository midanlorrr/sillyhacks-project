// ============================================================
// RENDERER.JS — Sprite-sheet desktop cat
//
// Sprite sheet: assets/Cat Sprite Sheet.png
//   256 x 320 px  |  32x32 px cells  |  8 cols x 10 rows
//
//   Row 0 — idle-sit      4 frames   (sitting, tail flick)
//   Row 1 — look-side     4 frames   (head turns)
//   Row 2 — lick-paw      4 frames   (leg extended)
//   Row 3 — scratch-ears  4 frames   (back foot scratch)
//   Row 4 — walk          8 frames   (full walk cycle)
//   Row 5 — run/slink     8 frames   (low stretch run)
//   Row 6 — sleep         4 frames   (flat loaf)
//   Row 7 — paw-bat       6 frames   (pawing at something)
//   Row 8 — pounce/jump   7 frames   (full upright leap)
//   Row 9 — burp/tail-wag 8 frames
// ============================================================

const { ipcRenderer } = require('electron');

// ── DOM refs ─────────────────────────────────────────────────
const canvas     = document.getElementById('cat-canvas');
const ctx        = canvas.getContext('2d');
const catWrap    = document.getElementById('cat-wrap');
const speechBub  = document.getElementById('speech-bubble');
const speechTxt  = document.getElementById('speech-text');
const popup      = document.getElementById('action-popup');
const hungerFill = document.getElementById('hunger-fill');
const hungerPct  = document.getElementById('hunger-pct');
const btnFeed    = document.getElementById('btn-feed');
const btnSleep   = document.getElementById('btn-sleep');
const btnChat    = document.getElementById('btn-chat');
const chatBox    = document.getElementById('chat-box');
const chatInput  = document.getElementById('chat-input');
const chatSend   = document.getElementById('chat-send');
const closeBtn   = document.getElementById('close-btn');

// ============================================================
// 🎞️  SPRITE ENGINE
// ============================================================

const FRAME_W = 32;
const FRAME_H = 32;
const SCALE   = 4;          // render at 128x128 logical px
const WIN_W   = 290;
const WIN_H   = 340;

// Every animation row, with frame count and speed
const ANIMS = {
  //           row  frames  fps   loop?
  idle:      { row: 0, frames: 4, fps: 5,  loop: true  },
  lookSide:  { row: 1, frames: 4, fps: 5,  loop: true  },
  lickPaw:   { row: 2, frames: 4, fps: 7,  loop: false },
  scratch:   { row: 3, frames: 4, fps: 8,  loop: false },
  walk:      { row: 4, frames: 8, fps: 12, loop: true  },
  run:       { row: 5, frames: 8, fps: 16, loop: true  },
  sleep:     { row: 6, frames: 4, fps: 3,  loop: true  },
  pawBat:    { row: 7, frames: 6, fps: 8,  loop: false },
  pounce:    { row: 8, frames: 7, fps: 10, loop: false },
  burp:      { row: 9, frames: 8, fps: 9,  loop: false },
};

// Sprite sheet image
const sheet = new Image();
sheet.src = 'assets/Cat Sprite Sheet.png';

let currentAnim  = ANIMS.idle;
let currentFrame = 0;
let animTimer    = null;
let onAnimDone   = null;   // callback when a one-shot anim finishes
let flipX        = false;  // mirror for walking left

function playAnim(name, doneCb = null) {
  const anim = ANIMS[name];
  if (!anim) return;

  clearInterval(animTimer);
  currentAnim  = anim;
  currentFrame = 0;
  onAnimDone   = doneCb;

  drawFrame();   // paint first frame immediately

  const ms = Math.round(1000 / anim.fps);
  animTimer = setInterval(() => {
    currentFrame++;
    if (currentFrame >= currentAnim.frames) {
      if (currentAnim.loop) {
        currentFrame = 0;
      } else {
        currentFrame = currentAnim.frames - 1; // hold last frame
        clearInterval(animTimer);
        if (onAnimDone) {
          const cb = onAnimDone;
          onAnimDone = null;
          cb();
        }
        return;
      }
    }
    drawFrame();
  }, ms);
}

function drawFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sx = currentFrame       * FRAME_W;
  const sy = currentAnim.row    * FRAME_H;

  if (flipX) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, FRAME_W, FRAME_H,
                  -FRAME_W, 0, FRAME_W, FRAME_H);
    ctx.restore();
  } else {
    ctx.drawImage(sheet, sx, sy, FRAME_W, FRAME_H,
                  0, 0, FRAME_W, FRAME_H);
  }
}

// Re-draw when image loads (handles race condition on first paint)
sheet.onload = () => drawFrame();

// ============================================================
// 🐱  CAT STATE
// ============================================================
const cat = {
  state:       'idle',
  hunger:      0,
  lastInteract: Date.now(),
  popupOpen:   false,
  chatOpen:    false,
};

let frenzyActive = false;

function setState(s) {
  cat.state = s;
  catWrap.classList.remove('bouncing', 'annoyed');

  switch (s) {
    case 'idle':
      playAnim('idle');
      break;

    case 'lookSide':
      playAnim('lookSide');
      break;

    case 'walking':
      playAnim('walk');
      break;

    case 'running':
      playAnim('run');
      break;

    case 'sleeping':
      playAnim('sleep');
      break;

    case 'eating':
      // paw-bat looks like pawing at food
      playAnim('pawBat', () => setState('idle'));
      break;

    case 'happy':
      playAnim('pounce', () => {
        setState('idle');
        catWrap.classList.add('bouncing');
        setTimeout(() => catWrap.classList.remove('bouncing'), 1100);
      });
      break;

    case 'annoyed':
      playAnim('run');
      catWrap.classList.add('annoyed');
      break;

    case 'licking':
      playAnim('lickPaw', () => setState('idle'));
      break;

    case 'scratching':
      playAnim('scratch', () => setState('idle'));
      break;

    case 'burping':
      playAnim('burp', () => setState('idle'));
      break;
  }
}

// ============================================================
// 🔊  SOUNDS  (Web Audio — no files needed)
// ============================================================
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function chirp(f1, f2, vol, dur, delay = 0) {
  try {
    const ctx = getAudio();
    const t   = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f1, t);
    osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t); osc.stop(t + dur);
  } catch (e) {}
}

function playSound(type) {
  try {
    const actx = getAudio();
    const t    = actx.currentTime;

    if (type === 'speak') {
      chirp(480, 760, 0.22, 0.18);

    } else if (type === 'purr') {
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.type = 'sawtooth'; o.frequency.value = 30;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      o.start(t); o.stop(t + 1.1);

    } else if (type === 'eat') {
      chirp(350, 480, 0.22, 0.15);
      chirp(400, 540, 0.22, 0.15, 0.17);
      chirp(450, 600, 0.22, 0.15, 0.34);

    } else if (type === 'pee') {
      const o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(280, t);
      o.frequency.exponentialRampToValueAtTime(75, t + 0.5);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.start(t); o.stop(t + 0.5);

    } else if (type === 'scream') {
      [780, 1200, 1700, 2300].forEach((f, i) => {
        const o  = actx.createOscillator(), g  = actx.createGain();
        const lfo = actx.createOscillator(), lg = actx.createGain();
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(actx.destination);
        o.type   = i % 2 === 0 ? 'sawtooth' : 'square';
        lfo.type = 'sine'; lfo.frequency.value = 8 + i * 3;
        lg.gain.value = 120;
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.7);
        o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 1.5);
        g.gain.setValueAtTime(0.26, t);
        g.gain.setValueAtTime(0.26, t + 1.8);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
        lfo.start(t); o.start(t); lfo.stop(t + 2.1); o.stop(t + 2.1);
      });
    }
  } catch (e) {}
}

// ============================================================
// 💬  SPEECH BUBBLE
// ============================================================
let speechTimer = null;
function say(msg, ms = 3500) {
  speechTxt.textContent = msg;
  speechBub.classList.add('visible');
  playSound('speak');
  clearTimeout(speechTimer);
  speechTimer = setTimeout(() => speechBub.classList.remove('visible'), ms);
}

// ============================================================
// 🤖  AI REPLIES
// ============================================================
const ai = {
  greet:    ["hi hi hi!! i'm so happy you're here!!", "HELLO!! i was just sitting here!", "oh!! hi!! um... hi!! :)", "hewwo!! i am a cat!! nice to meet you!"],
  food:     ["food is my FAVORITE thing. tied with naps.", "um i think fish is the best food. probably.", "i would eat right now if you let me!!", "can i have some? i'm asking nicely!!", "food goes in mouth and then you feel happy. science."],
  sleep:    ["sleeping is really good. i do it a lot.", "um... naps make you stronger i think?", "i slept earlier and it was great actually.", "sometimes i dream about fish!! it's nice.", "wait are you sleepy? you should nap then!!"],
  love:     ["awww!! i like you too!! that's so nice!!", "you're really kind!! i appreciate that a lot!!", "thank you!! *purring noises*", "i feel warm inside now!! is that normal?", "okay i like you. there. i said it."],
  math:     ["um okay let me think... i think i got it!! wait no. hmm.", "numbers!! okay!! 2+2 is 4 i'm pretty sure!! right?!", "math is hard but i'm trying really hard!!", "wait i need to count on my paws... i have 4 paws so...", "the answer is probably a number!! i'll go with 7."],
  weather:  ["um i looked outside!! it seemed... weathery.", "i think maybe bring a jacket? just in case?", "clouds are just fluffy water. i learned that!!", "it's either gonna rain or not. i'm 50% sure.", "my fur is standing up a little so... maybe windy?"],
  science:  ["oh!! i know this one!! um... atoms!! and also... stuff!!", "science is when you do experiments and write things down!!", "i think gravity is why things fall? yeah i'm pretty sure.", "the sun is a star!! and it's really far!! i learned that!!", "cells are tiny and they're in everything!! even me!!"],
  howAreYou:["i'm doing really good!! i ate earlier and it was great.", "honestly really good!! thanks for asking!! that was nice.", "um... i think i'm happy?? yes!! i'm happy!!", "good!!! i took a nap today and feel very refreshed."],
  help:     ["okay!! i'll try to help!! i'm not sure but i'll try!!", "hmm let me think about that really hard...", "i think the answer is yes!! ...what was the question?", "i'm gonna try my best okay?? that's all i can do!!"],
  game:     ["oh i love games!! i'm not always great but i try hard!!", "video games!! i watched someone play one time!! looked fun!!", "the key to winning is probably to not lose?? i think??", "i would play with you!! i might lose but that's okay!!"],
  default:  [
    "ooh!! hmm. i think i know this one. wait. hmm.",
    "that's a really good question!! let me think... okay i'm thinking...",
    "um!! okay!! i'm not 100% sure but i think... yes?",
    "i heard about that!! i think it's a thing!! probably!!",
    "wow!! that's really interesting!! i didn't know that!!",
    "okay so i think... wait i forgot. but i was gonna say something good.",
    "hmm. my answer is: it depends!! i think!!",
    "i'm gonna say yes and if i'm wrong i'm sorry!!",
    "oh i know this!! it's... the thing!! with the... stuff!!",
    "can you ask me something easier? just kidding!! maybe.",
    "i learned about that i think!! it's... good?? yes. it's good.",
    "um one second i'm thinking really hard right now.",
  ],
};

function getReply(msg) {
  const m = msg.toLowerCase();
  if (/\b(hi|hello|hey|howdy|sup|yo|hiya)\b/.test(m))                       return pick(ai.greet);
  if (/\b(food|eat|hungry|fish|pizza|nom|snack|meal|dinner)\b/.test(m))      return pick(ai.food);
  if (/\b(sleep|tired|nap|bed|zzz|rest|sleepy)\b/.test(m))                   return pick(ai.sleep);
  if (/\b(love|like|cute|adorable|sweet)\b/.test(m))                         return pick(ai.love);
  if (/\b(math|plus|minus|times|divide|\d+[\+\-\*\/]\d+|calculate)\b/.test(m)) return pick(ai.math);
  if (/\b(weather|rain|sunny|hot|cold|snow|cloud|forecast)\b/.test(m))       return pick(ai.weather);
  if (/\b(science|biology|chemistry|physics|gravity|atom|cell)\b/.test(m))   return pick(ai.science);
  if (/\b(how are you|you okay|you good|feeling)\b/.test(m))                 return pick(ai.howAreYou);
  if (/\b(help|how|why|what|explain|tell me|can you)\b/.test(m))             return pick(ai.help);
  if (/\b(game|play|gaming|minecraft|roblox)\b/.test(m))                     return pick(ai.game);
  return pick(ai.default);
}

// ============================================================
// 🍕  HUNGER SYSTEM
// ============================================================
function tickHunger() {
  if (cat.state === 'sleeping') return;
  cat.hunger = Math.min(100, cat.hunger + 1);
  updateHungerBar();
  if (cat.hunger === 45) say("um... my tummy is making noises...");
  if (cat.hunger === 68) say("food please!! i'm quite hungry now!!");
  if (cat.hunger === 85) say("i am SO hungry. like, a lot. please.");
  if (cat.hunger >= 100) say("PLEASE. I AM BEGGING. 😭 FOOD!!");
}

function updateHungerBar() {
  hungerFill.style.width = cat.hunger + '%';
  hungerPct.textContent  = cat.hunger + '%';
  hungerFill.style.backgroundColor =
    cat.hunger < 40 ? '#4CAF50' :
    cat.hunger < 72 ? '#FFA500' : '#E53935';
}

function feedCat() {
  cat.hunger = Math.max(0, cat.hunger - 50);
  cat.lastInteract = Date.now();
  updateHungerBar();
  setState('eating');
  playSound('eat');
  say(pick(["NOM NOM NOM!! so good!!", "DELICIOUS!! thank you thank you!!", "i ate it!! can i have more??", "that was amazing!! 10 out of 10!!", "yay food!!! this is the best day!!"]), 2800);
}

// ============================================================
// 😴  SLEEP
// ============================================================
function goSleep() {
  setState('sleeping');
  closePopup();
  say("okay... *yawn*... zz... 💤", 4000);
  setTimeout(wakeUp, 10000 + Math.random() * 12000);
}

function wakeUp() {
  if (cat.state !== 'sleeping') return;
  setState('idle');
  say(pick(["i'm awake!! i had a dream about fish!!", "*yawn* hi!! i'm back!! miss me??", "oh!! i fell asleep!! hi again!!", "i slept really well actually!! nice."]), 3200);
}

// ============================================================
// 🤚  PETTING
// ============================================================
function petTheCat() {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') { wakeUp(); return; }
  setState('happy');
  playSound('purr');
  say(pick(["purrrr... okay this is nice 😌", "i'll allow this!! keep going!!", "purrr purrr purrr 💜", "this is my favorite thing. purrr.", "you're really good at that!!"]), 2800);
}

// ============================================================
// 💛  PEE
// ============================================================
function triggerPee() {
  triggerPeeFromCat();
}

async function triggerPeeFromCat() {
  const winPos = await ipcRenderer.invoke('get-window-pos');
  const r = catWrap.getBoundingClientRect();
  const srcX = Math.round(winPos[0] + r.left + r.width * 0.62);
  const srcY = Math.round(winPos[1] + r.top + r.height * 0.72);

  ipcRenderer.send('show-pee', { x: srcX, y: srcY });
  playSound('pee');
  say("uh oh!! i... oops. sorry!!", 3000);
  setTimeout(() => say(pick([
    "i didn't mean to!! well. maybe a little.",
    "this happens sometimes okay!! not often!!",
    "please don't tell anyone about this.",
    "i feel better now actually. sorry.",
  ])), 3600);
}

// ============================================================
// 😡  ANNOYANCE SCREAM  (ignored for 2.5 min)
// ============================================================
const ANNOY_MS = 150000;

function checkAttention() {
  if (cat.state === 'sleeping') return;
  if (Date.now() - cat.lastInteract < ANNOY_MS) return;

  setState('annoyed');
  playSound('scream');
  say(pick(["MRRROWWW!! LOOK AT ME RIGHT NOW!! 😡", "HELLO?! I AM RIGHT HERE!! HELLO?!!", "I HAVE BEEN IGNORED!! THIS IS RUDE!!", "REEEE PLEASE PAY ATTENTION TO ME!! 😤"]), 5000);
  setTimeout(() => { if (cat.state === 'annoyed') setState('idle'); }, 3200);
  cat.lastInteract = Date.now() - (ANNOY_MS - 30000);
}

// ============================================================
// 🐾  WANDER  (smooth walk to a new position)
// ============================================================
async function wander() {
  if (cat.state !== 'idle' || frenzyActive) return;
  const scr = await ipcRenderer.invoke('get-screen-size');

  const minX = scr.x;
  const maxX = scr.x + scr.width - WIN_W;
  const minY = scr.y;
  const maxY = scr.y + scr.height - WIN_H;

  const tx = minX + Math.floor(Math.random() * Math.max(1, maxX - minX));
  const ty = minY + Math.floor(Math.random() * Math.max(1, maxY - minY));

  const startPos = await ipcRenderer.invoke('get-window-pos');
  const dx = tx - startPos[0];

  // Face the right direction
  flipX = dx < 0;
  setState('walking');

  const STEPS = 36;
  let step = 0;

  await new Promise(resolve => {
    const iv = setInterval(() => {
      step++;
      const t = step / STEPS;
      const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // ease-in-out
      ipcRenderer.send('move-window',
        Math.round(startPos[0] + dx * e),
        Math.round(startPos[1] + (ty - startPos[1]) * e)
      );
      if (step >= STEPS) { clearInterval(iv); resolve(); }
    }, 22);
  });

  flipX = false;
  setState('idle');
}

async function runFrenzy(durationMs = 5200) {
  if (frenzyActive) return;
  frenzyActive = true;

  if (cat.state === 'sleeping') wakeUp();
  closePopup();
  cat.lastInteract = Date.now();
  say("ZOOMIES MODE!!!", 1300);

  const endAt = Date.now() + durationMs;
  while (Date.now() < endAt) {
    const scr = await ipcRenderer.invoke('get-screen-size');
    const minX = scr.x;
    const maxX = scr.x + scr.width - WIN_W;
    const minY = scr.y;
    const maxY = scr.y + scr.height - WIN_H;
    const tx = minX + Math.floor(Math.random() * Math.max(1, maxX - minX));
    const ty = minY + Math.floor(Math.random() * Math.max(1, maxY - minY));

    const startPos = await ipcRenderer.invoke('get-window-pos');
    const dx = tx - startPos[0];
    flipX = dx < 0;
    setState('running');

    const STEPS = 18;
    let step = 0;
    await new Promise(resolve => {
      const iv = setInterval(() => {
        step++;
        const t = step / STEPS;
        const nx = Math.max(minX, Math.min(maxX, Math.round(startPos[0] + dx * t)));
        const ny = Math.max(minY, Math.min(maxY, Math.round(startPos[1] + (ty - startPos[1]) * t)));
        ipcRenderer.send('move-window',
          nx,
          ny
        );
        if (step >= STEPS) { clearInterval(iv); resolve(); }
      }, 12);
    });
  }

  flipX = false;
  frenzyActive = false;
  setState('idle');
  say("okay. i am calm now.", 1400);
}

// ============================================================
// 🎲  RANDOM IDLE BEHAVIOURS
// ============================================================
const idleSayings = [
  "i was just thinking about fish...",
  "blep 👅",
  "i forgor 💀",
  "is anyone else cold or just me?",
  "i have one brain cell and it's mine.",
  "staring at you. just because.",
  "i could nap right now. just saying.",
  "i am very good at sitting. world class.",
  "meow. (that means something important.)",
  "sometimes i lick my paw for no reason.",
  "i saw a bug earlier. it was interesting.",
  "i think today is going pretty well!!",
  "i love you. not in a weird way. just normally.",
  "my tail is doing something. not sure what.",
  "i was NOT staring. i was just... looking.",
];

function doRandomBehaviour() {
  if (cat.state !== 'idle' || frenzyActive) return;
  const r = Math.random();

  if      (r < 0.28) { say(pick(idleSayings), 3500); }
  else if (r < 0.38) { goSleep(); }
  else if (r < 0.48) { triggerPee(); }
  else if (r < 0.62) { wander(); }
  else if (r < 0.72) {
    setState('licking');
    if (Math.random() < 0.5) say("*lick lick* hygiene is important!!", 2500);
  }
  else if (r < 0.82) {
    setState('scratching');
    if (Math.random() < 0.5) say("*scratch scratch* ahh that's better", 2500);
  }
  else if (r < 0.90) {
    setState('burping');
    say("...excuse me. 😳", 2500);
  }
  else { say("👀 ...", 1800); }
}

function scheduleRandom() {
  setTimeout(() => {
    doRandomBehaviour();
    scheduleRandom();
  }, 10000 + Math.random() * 12000);
}

// ============================================================
// 🖱️  POPUP MENU
// ============================================================
function openPopup()  { cat.popupOpen = true;  popup.classList.add('open'); }
function closePopup() { cat.popupOpen = false; popup.classList.remove('open'); closeChatBox(); }
function openChatBox()  { cat.chatOpen = true;  chatBox.classList.add('open'); setTimeout(() => chatInput.focus(), 50); }
function closeChatBox() { cat.chatOpen = false; chatBox.classList.remove('open'); }

catWrap.addEventListener('click', e => {
  if (isDragging) return;
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') { wakeUp(); return; }
  cat.popupOpen ? closePopup() : openPopup();
});

document.addEventListener('click', e => {
  if (!cat.popupOpen) return;
  if (popup.contains(e.target) || catWrap.contains(e.target)) return;
  closePopup();
});

btnFeed.addEventListener('click',  () => { feedCat();  closePopup(); });
btnSleep.addEventListener('click', () => { goSleep();  closePopup(); });
btnChat.addEventListener('click',  () => { cat.chatOpen ? closeChatBox() : openChatBox(); });
closeBtn.addEventListener('click', () => {
  say("bye bye!! 😿", 700);
  setTimeout(() => ipcRenderer.send('close-window'), 750);
});

// ── Chat ─────────────────────────────────────────────────────
function sendChat() {
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = '';
  cat.lastInteract = Date.now();

  // Cat "thinks" with lick-paw then replies
  playAnim('lickPaw', () => {
    playAnim('idle');
    say(getReply(msg), 5000);
  });
}
chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

function playLookSide() {
  setState('lookSide');
  setTimeout(() => {
    if (cat.state === 'lookSide') setState('idle');
  }, 1400);
}

function doAnnoyedScream() {
  if (cat.state === 'sleeping') wakeUp();
  setState('annoyed');
  playSound('scream');
  say("HEY!!! LOOK AT MEEEE!!", 2400);
  setTimeout(() => { if (cat.state === 'annoyed') setState('idle'); }, 2200);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let allActionsBusy = false;
async function runAllActionsDemo() {
  if (allActionsBusy || frenzyActive) return;
  allActionsBusy = true;

  if (cat.state === 'sleeping') wakeUp();
  closePopup();
  say("okay!! doing ALL my tricks!!", 1600);

  feedCat();
  await wait(1200);
  playLookSide();
  await wait(1300);
  setState('licking');
  await wait(1300);
  setState('scratching');
  await wait(1300);
  setState('burping');
  await wait(1200);
  await wander();
  await wait(300);
  await triggerPeeFromCat();
  await wait(400);
  petTheCat();
  await wait(1200);
  doAnnoyedScream();
  await wait(1200);
  await runFrenzy(3200);

  setState('idle');
  say("done!! that was EVERYTHING.", 1600);
  allActionsBusy = false;
}

// ============================================================
// 🖱️  DRAG
// ============================================================
let isDragging = false, dSX = 0, dSY = 0, wSX = 0, wSY = 0;

catWrap.addEventListener('mousedown', async e => {
  if (e.button !== 0) return;
  isDragging = true;
  dSX = e.screenX; dSY = e.screenY;
  const pos = await ipcRenderer.invoke('get-window-pos');
  wSX = pos[0]; wSY = pos[1];
  e.preventDefault();
});
document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  ipcRenderer.send('move-window', wSX + e.screenX - dSX, wSY + e.screenY - dSY);
});
document.addEventListener('mouseup', () => { isDragging = false; });

// ============================================================
// ⏱️  TIMERS & BOOT
// ============================================================
setInterval(tickHunger,     3000);
setInterval(checkAttention, 20000);
scheduleRandom();

setState('idle');
setTimeout(() => say("hi!! i'm here!! click me!! 🐱", 3800), 600);
setTimeout(() => say("i know lots of things!! probably!!", 3500), 5500);

// Global hotkey actions from main process
ipcRenderer.on('hotkey-pee', () => {
  cat.lastInteract = Date.now();
  triggerPee();
});

ipcRenderer.on('hotkey-frenzy', () => {
  runFrenzy();
});

ipcRenderer.on('hotkey-feed', () => {
  cat.lastInteract = Date.now();
  feedCat();
});

ipcRenderer.on('hotkey-sleep', () => {
  cat.lastInteract = Date.now();
  goSleep();
});

ipcRenderer.on('hotkey-pet', () => {
  cat.lastInteract = Date.now();
  petTheCat();
});

ipcRenderer.on('hotkey-walk', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  wander();
});

ipcRenderer.on('hotkey-look', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  playLookSide();
});

ipcRenderer.on('hotkey-lick', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  setState('licking');
});

ipcRenderer.on('hotkey-scratch', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  setState('scratching');
});

ipcRenderer.on('hotkey-burp', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  setState('burping');
});

ipcRenderer.on('hotkey-annoyed', () => {
  cat.lastInteract = Date.now();
  doAnnoyedScream();
});

ipcRenderer.on('hotkey-chat', () => {
  cat.lastInteract = Date.now();
  if (cat.state === 'sleeping') wakeUp();
  openPopup();
  openChatBox();
});

ipcRenderer.on('hotkey-all-actions', () => {
  cat.lastInteract = Date.now();
  runAllActionsDemo();
});

// ── Utility ──────────────────────────────────────────────────
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
