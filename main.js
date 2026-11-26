/* ====== Arranque, estado y navegación ====== */
const SAVE_KEY='arena_estelar_v1';
let S, curScreen='inicio';

function defaultState(){
  return { trophies:0, unlocked:['perdiga','chispa','gemela'], levels:{perdiga:1,chispa:1,gemela:1}, selected:'perdiga', muted:false };
}
function loadState(){
  try{ const raw=localStorage.getItem(SAVE_KEY); if(raw){ S=Object.assign(defaultState(),JSON.parse(raw)); if(!S.levels) S.levels={}; if(!S.unlocked.includes(S.selected)) S.selected=S.unlocked[0]||'perdiga'; return; } }catch(e){}
  S=defaultState();
}
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(S)); }catch(e){} }

function renderCurrent(){ renderScreen(curScreen); }
function renderScreen(name){
  curScreen=name;
  if(name==='inicio') UI.renderInicio();
  else if(name==='luchadores') UI.renderLuchadores();
  else if(name==='mejoras') UI.renderMejoras();
  else if(name==='cajas') UI.renderCajas();
}
function switchTo(name){
  curScreen=name;
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='s-'+name));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.s===name));
  renderScreen(name);
}

function startBattle(mode){
  const lvl=S.levels[S.selected]||1;
  GAME.start(mode,S.selected,lvl,{ unlocked:S.unlocked, botLvl:Math.max(1,lvl-1) });
}

function boot(){
  loadState();
  GAME.init();
  SFX.setMuted(S.muted);
  GAME.onEnd(res=>{ UI.showResult(res); });

  // navegación
  document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>{ SFX.tap(); switchTo(b.dataset.s); }));
  // salir de batalla
  document.getElementById('btn-quit').addEventListener('click',()=>{ GAME.quit(); renderCurrent(); });
  // mute
  document.getElementById('btn-mute').addEventListener('click',()=>{ S.muted=!S.muted; SFX.setMuted(S.muted); save(); UI.renderTopbar(); SFX.tap(); });

  UI.renderTopbar();
  renderScreen('inicio');

  // service worker (offline)
  if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{})); }
}

window.addEventListener('unhandledrejection',e=>{ e.preventDefault(); });
// bloquear zoom/scroll
document.addEventListener('touchmove',e=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
