import { loadTemplates, drawSheet, drawMarkers, drawLabels, drawOutline, renderPrintSheet, crayonPattern, Bus } from './common.js';
import { AudioEngine } from './audio.js';

const $ = id => document.getElementById(id);
const data = await loadTemplates();
const { sheet } = data;
const audio = new AudioEngine();
document.addEventListener('pointerdown', () => audio.start(), { once: true });

const COLORS = ['#ff3b3b', '#ff8a00', '#ffd400', '#7ed957', '#1fa34a', '#33c7ff',
  '#2f6bff', '#7b3fe4', '#ff5fb8', '#8b5a2b', '#222222', '#ffffff'];

const state = { tpl: data.templates[0], tool: 'crayon', size: 24, color: COLORS[0], hue: 0 };

// --------------------------------------------------------------- canvas
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const paint = Object.assign(document.createElement('canvas'), { width: sheet.w, height: sheet.h });
const pctx = paint.getContext('2d', { willReadFrequently: true });
const lines = Object.assign(document.createElement('canvas'), { width: sheet.w, height: sheet.h });
const lctx = lines.getContext('2d', { willReadFrequently: true });
let undo = [];

function buildLines() {
  lctx.clearRect(0, 0, sheet.w, sheet.h);
  drawMarkers(lctx, sheet, state.tpl);
  drawLabels(lctx, sheet, state.tpl);
  drawOutline(lctx, sheet, state.tpl);
}

function render() {
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sheet.w, sheet.h);
  ctx.drawImage(paint, 0, 0);
  ctx.drawImage(lines, 0, 0);
}

function selectTemplate(tpl) {
  state.tpl = tpl;
  pctx.clearRect(0, 0, sheet.w, sheet.h);
  undo = [];
  buildLines();
  render();
  document.querySelectorAll('#templateList button').forEach(b => b.classList.toggle('on', b.dataset.id === tpl.id));
  bus.command({ type: 'template', template: tpl.id });
}

// template buttons with live outline thumbnails
for (const tpl of data.templates) {
  const b = document.createElement('button');
  b.dataset.id = tpl.id;
  const th = Object.assign(document.createElement('canvas'), { width: 160, height: 120 });
  const tc = th.getContext('2d');
  tc.scale(0.1, 0.1);
  tc.fillStyle = '#fff'; tc.fillRect(0, 0, sheet.w, sheet.h);
  drawOutline(tc, sheet, tpl, 3);
  b.append(th, `${tpl.name_ja}`, Object.assign(document.createElement('small'), { textContent: tpl.name_en }));
  b.onclick = () => selectTemplate(tpl);
  $('templateList').append(b);
}

// palette / tools / sizes
for (const c of COLORS) {
  const b = document.createElement('button');
  b.style.background = c;
  b.title = c;
  b.onclick = () => {
    state.color = c;
    document.querySelectorAll('#palette button').forEach(x => x.classList.toggle('on', x === b));
    if (state.tool === 'eraser' || state.tool === 'rainbow') setTool('crayon');
  };
  $('palette').append(b);
}
$('palette').firstChild.classList.add('on');
function setTool(t) {
  state.tool = t;
  document.querySelectorAll('#tools button').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
}
document.querySelectorAll('#tools button').forEach(b => (b.onclick = () => setTool(b.dataset.tool)));
document.querySelectorAll('#sizes button').forEach(b => (b.onclick = () => {
  state.size = +b.dataset.size;
  document.querySelectorAll('#sizes button').forEach(x => x.classList.toggle('on', x === b));
}));

// ------------------------------------------------------------- drawing
const patternCache = new Map();
function strokeStyleFor() {
  if (state.tool === 'rainbow') { state.hue = (state.hue + 4) % 360; return `hsl(${state.hue} 95% 55%)`; }
  if (state.tool === 'crayon') {
    if (!patternCache.has(state.color)) patternCache.set(state.color, pctx.createPattern(crayonPattern(state.color), 'repeat'));
    return patternCache.get(state.color);
  }
  return state.color;
}

function toSheet(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * sheet.w / r.width, (e.clientY - r.top) * sheet.h / r.height];
}

function pushUndo() {
  undo.push(pctx.getImageData(0, 0, sheet.w, sheet.h));
  if (undo.length > 15) undo.shift();
}

let last = null;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  hidePreview();
  pushUndo();
  const p = toSheet(e);
  if (state.tool === 'fill') { floodFill(p[0] | 0, p[1] | 0); render(); return; }
  last = p;
  drawSeg(p, [p[0] + 0.1, p[1] + 0.1]);
});
canvas.addEventListener('pointermove', e => {
  if (!last) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of evs) { const p = toSheet(ev); drawSeg(last, p); last = p; }
});
const endStroke = () => { last = null; };
canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);

function drawSeg(a, b) {
  pctx.save();
  pctx.lineCap = pctx.lineJoin = 'round';
  pctx.lineWidth = state.size * (state.tool === 'eraser' ? 1.6 : 1);
  if (state.tool === 'eraser') { pctx.globalCompositeOperation = 'destination-out'; pctx.strokeStyle = '#000'; }
  else pctx.strokeStyle = strokeStyleFor();
  pctx.beginPath(); pctx.moveTo(...a); pctx.lineTo(...b); pctx.stroke();
  pctx.restore();
  render();
}

// Scanline flood fill on the paint layer; template lines act as walls.
function floodFill(x, y) {
  const w = sheet.w, h = sheet.h;
  const img = pctx.getImageData(0, 0, w, h), px = img.data;
  const wall = lctx.getImageData(0, 0, w, h).data;
  const hex = state.color.replace('#', '');
  const fc = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  const i0 = (y * w + x) * 4;
  if (wall[i0 + 3] > 60) return;
  const target = [px[i0], px[i0 + 1], px[i0 + 2], px[i0 + 3]];
  const match = i => wall[i + 3] <= 60 &&
    Math.abs(px[i] - target[0]) + Math.abs(px[i + 1] - target[1]) + Math.abs(px[i + 2] - target[2]) + Math.abs(px[i + 3] - target[3]) < 160;
  const done = new Uint8Array(w * h);
  const stack = [[x, y]];
  while (stack.length) {
    let [cx, cy] = stack.pop();
    while (cx > 0 && !done[cy * w + cx - 1] && match((cy * w + cx - 1) * 4)) cx--;
    let up = false, down = false;
    for (; cx < w; cx++) {
      const k = cy * w + cx;
      if (done[k] || !match(k * 4)) break;
      done[k] = 1;
      px[k * 4] = fc[0]; px[k * 4 + 1] = fc[1]; px[k * 4 + 2] = fc[2]; px[k * 4 + 3] = 255;
      if (cy > 0) { const m = match((k - w) * 4) && !done[k - w]; if (m && !up) stack.push([cx, cy - 1]); up = m; }
      if (cy < h - 1) { const m = match((k + w) * 4) && !done[k + w]; if (m && !down) stack.push([cx, cy + 1]); down = m; }
    }
  }
  pctx.putImageData(img, 0, 0);
}

$('btnUndo').onclick = () => { if (undo.length) { pctx.putImageData(undo.pop(), 0, 0); render(); } };
$('btnClear').onclick = () => { pushUndo(); pctx.clearRect(0, 0, sheet.w, sheet.h); render(); };

// ------------------------------------------------------- scan & send
function message(text, ms = 2500) {
  const m = $('bedMsg');
  m.textContent = text; m.classList.add('show');
  clearTimeout(message.t); message.t = setTimeout(() => m.classList.remove('show'), ms);
}

function sweep() {
  const lb = $('lightbar');
  lb.classList.remove('run'); void lb.offsetWidth; lb.classList.add('run');
  audio.scanHum();
  return new Promise(r => setTimeout(r, 1700));
}

function hidePreview() { $('resultPreview').classList.remove('show'); }
function showPreview(url) {
  const img = $('resultPreview');
  img.src = url;
  img.classList.add('show');
  clearTimeout(showPreview.t); showPreview.t = setTimeout(hidePreview, 6000);
}

$('btnSend').onclick = async () => {
  audio.start();
  $('btnSend').disabled = true;
  await sweep();
  const out = Object.assign(document.createElement('canvas'), { width: sheet.w, height: sheet.h });
  const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, sheet.w, sheet.h);
  o.drawImage(paint, 0, 0);
  drawOutline(o, sheet, state.tpl);
  const blob = await new Promise(r => out.toBlob(r, 'image/png'));
  try {
    const r = await fetch('/api/submit', { method: 'POST', body: blob, headers: { 'X-Template': state.tpl.id } });
    const item = await r.json();
    if (!r.ok) throw new Error(item.error);
    audio.chime();
    showPreview(item.url);
    message('🛸 UFOがはこんでいくよ! The UFO is bringing it to the city!');
  } catch (err) {
    // server down: send straight to a wall in this browser over BroadcastChannel
    bus.local({ type: 'spawn', item: { id: crypto.randomUUID(), url: out.toDataURL('image/png'), template: state.tpl.id, kind: state.tpl.kind, raw: true } });
    message('⚠ サーバーなし: このブラウザのウォールへ直接送信 (server offline)');
  }
  $('btnSend').disabled = false;
};

async function postScan(blob, source, label = '') {
  try {
    const r = await fetch('/api/scan', {
      method: 'POST', body: blob,
      headers: { 'X-Source': source, 'X-Template': state.tpl.id, 'X-Label': encodeURIComponent(label) },
    });
    const item = await r.json();
    if (!r.ok) throw new Error(item.error || r.statusText);
    return item;
  } catch (err) {
    addLog('error', `${label || source}: ${err.message}`);
    return null;
  }
}

// ------------------------------------------------------------ hot folder
async function refreshStatus() {
  try {
    const s = await (await fetch('/api/status')).json();
    $('watchPath').textContent = s.watch;
    $('pillDisplays').textContent = `🖥 ${s.displays} displays`;
    if (!s.wia) { $('btnWia').disabled = true; $('btnWia').title = 'Windows only (pip install pywin32)'; }
    if (!refreshStatus.logged) { s.log.forEach(e => addLog(e.level, e.text, e.time)); refreshStatus.logged = true; }
  } catch { /* server offline, pill shows it */ }
}

$('btnWia').onclick = async () => {
  $('btnWia').disabled = true;
  message('📠 スキャン中… Scanning on the flatbed…', 15000);
  try {
    const r = await fetch('/api/wia-scan', { method: 'POST' });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
  } catch (e) { addLog('error', e.message); message('⚠ ' + e.message, 5000); }
  $('btnWia').disabled = false;
};

// Browser-side folder watcher (File System Access API, Chrome/Edge): polls a folder
// the user picks and forwards new image files to the server's OpenCV pipeline.
let dirHandle = null;
const seenFiles = new Set();
$('btnPickFolder').onclick = async () => {
  if (!window.showDirectoryPicker) { alert('Chrome または Edge を使ってください (needs Chrome/Edge)'); return; }
  try { dirHandle = await window.showDirectoryPicker({ id: 'scans', mode: 'read' }); } catch { return; }
  for await (const [name, h] of dirHandle.entries()) {
    if (h.kind === 'file') { const f = await h.getFile(); seenFiles.add(name + f.lastModified); }
  }
  $('folderStatus').textContent = `👀 ${dirHandle.name} を見張っています (watching, ${seenFiles.size} old files skipped)`;
  pollFolder();
};
async function pollFolder() {
  if (!dirHandle) return;
  try {
    for await (const [name, h] of dirHandle.entries()) {
      if (h.kind !== 'file' || !/\.(png|jpe?g|bmp|tiff?)$/i.test(name)) continue;
      const f = await h.getFile();
      const key = name + f.lastModified;
      if (seenFiles.has(key) || Date.now() - f.lastModified < 1500) continue; // still being written
      seenFiles.add(key);
      await postScan(f, 'folder', name);
    }
  } catch (e) { $('folderStatus').textContent = '⚠ ' + e.message; }
  setTimeout(pollFolder, 1500);
}

$('fileInput').onchange = async e => {
  for (const f of e.target.files) await postScan(f, 'upload', f.name);
  e.target.value = '';
};

// --------------------------------------------------------------- webcam
let stream = null;
async function listCams() {
  const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
  $('camSelect').innerHTML = devs.map((d, i) => `<option value="${d.deviceId}">${d.label || 'Camera ' + (i + 1)}</option>`).join('');
}
$('btnCam').onclick = async () => {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; $('btnCam').textContent = '▶ カメラON'; $('btnCapture').disabled = true; return; }
  try {
    const id = $('camSelect').value;
    stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: id ? { exact: id } : undefined, width: { ideal: 1920 }, height: { ideal: 1440 } },
    });
    $('video').srcObject = stream;
    await $('video').play();
    $('btnCam').textContent = '■ カメラOFF';
    $('btnCapture').disabled = false;
    listCams();
  } catch (e) { addLog('error', 'camera: ' + e.message); }
};
$('btnCapture').onclick = async () => {
  const v = $('video');
  const c = Object.assign(document.createElement('canvas'), { width: v.videoWidth, height: v.videoHeight });
  c.getContext('2d').drawImage(v, 0, 0);
  await sweep();
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.92));
  postScan(blob, 'webcam', 'camera');
};
if (navigator.mediaDevices) listCams().catch(() => {});

// ------------------------------------------------------------------ print
function printSheets(tpls) {
  const urls = tpls.map(t => renderPrintSheet(sheet, t).toDataURL('image/png'));
  const w = window.open('', '_blank');
  if (!w) { alert('ポップアップを許可してください (allow pop-ups)'); return; }
  w.document.write(`<!doctype html><title>Sketch Town sheets</title>
    <style>@page{size:A4 landscape;margin:0}body{margin:0}img{display:block;width:297mm;height:210mm;page-break-after:always}</style>
    ${urls.map(u => `<img src="${u}">`).join('')}
    <script>window.onload=()=>setTimeout(()=>print(),300)<\/script>`);
  w.document.close();
}
$('btnPrintOne').onclick = () => printSheets([state.tpl]);
$('btnPrintAll').onclick = () => printSheets(data.templates);
$('btnDownload').onclick = () => {
  const a = document.createElement('a');
  a.href = renderPrintSheet(sheet, state.tpl).toDataURL('image/png');
  a.download = `sketch-town-${state.tpl.id}-A4.png`;
  a.click();
};

// ---------------------------------------------------------- wall control
$('btnWall').onclick = async () => {
  // Window Management API: open the wall on the second monitor / projector when possible.
  let features = 'popup,width=1280,height=720';
  try {
    if (window.getScreenDetails) {
      const sd = await window.getScreenDetails();
      const other = sd.screens.find(s => s !== sd.currentScreen);
      if (other) features = `popup,left=${other.availLeft},top=${other.availTop},width=${other.availWidth},height=${other.availHeight}`;
    }
  } catch { /* permission denied: plain window */ }
  window.open('/wall.html', 'sketchtown_wall', features);
};
$('btnDragon').onclick = () => bus.command({ type: 'dragon' });
$('btnDemo').onclick = () => bus.command({ type: 'demo', count: 6 });
$('btnNight').onclick = () => bus.command({ type: 'daynight' });
$('btnTour').onclick = () => bus.command({ type: 'tour' });
$('btnBright').onclick = () => bus.command({ type: 'brightness' });
$('btnQuality').onclick = () => bus.command({ type: 'quality' });
$('volume').oninput = e => bus.command({ type: 'volume', value: +e.target.value / 100 });
$('btnClearWall').onclick = async () => {
  if (!confirm('街の絵をぜんぶ消しますか? Remove every drawing from the city (and the saved gallery)?')) return;
  await fetch('/api/clear-gallery', { method: 'POST' }).catch(() => bus.command({ type: 'clear' }));
};

// ------------------------------------------------------------------ log
function addLog(level, text, time = Date.now() / 1000) {
  const li = document.createElement('li');
  li.className = level;
  li.textContent = `${new Date(time * 1000).toLocaleTimeString()}  ${text}`;
  $('log').prepend(li);
  while ($('log').children.length > 60) $('log').lastChild.remove();
}

// ------------------------------------------------------------------ bus
const bus = new Bus(ev => {
  if (ev.type === 'log') addLog(ev.level, ev.text, ev.time);
  else if (ev.type === 'scanning' && ev.label !== 'drawing') { sweep(); message('🔎 スキャン中… Scanning…'); }
  else if (ev.type === 'spawn' && ev.item.source !== 'drawing') {
    audio.chime();
    showPreview(ev.item.url);
    message(`✨ ${ev.item.label || ''} → ${data.byId[ev.item.template]?.name_ja || ''}`);
  }
});
bus.onStatus = ok => {
  $('pillServer').className = 'pill ' + (ok ? 'ok' : 'bad');
  $('pillServer').textContent = ok ? '● サーバーOK Server' : '● サーバー停止 Server offline';
  if (ok) refreshStatus();
};
setInterval(refreshStatus, 5000);

selectTemplate(state.tpl);
