/* ====== Interfaz de menús ====== */
const UI = (function(){
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const MAXLVL=11;
  function upgCost(lvl){ return [0,20,35,75,140,290,480,800,1250,1875,2800][lvl]||3000; }

  function renderTopbar(){
    $('r-trophy').textContent = S.trophies;
    $('btn-mute').textContent = S.muted?'🔇':'🔊';
  }

  function portraitsIn(container){
    requestAnimationFrame(()=>{ container.querySelectorAll('canvas[data-b]').forEach(c=>{ const b=BRAWLER_MAP[c.dataset.b]; if(b) renderPortrait(c,b); }); });
  }

  function renderInicio(){
    const el=$('s-inicio'); const sel=BRAWLER_MAP[S.selected];
    el.innerHTML = `
      <h1 class="logo">ARENA ESTELAR</h1>
      <p class="logo-sub">Combate · Sin internet</p>
      <div class="hero-strip" id="hero-strip">
        <canvas data-b="${sel.id}"></canvas>
        <div class="hs-info"><b>${esc(sel.name)}</b><small>Nivel ${S.levels[sel.id]||1} · ${RAR[sel.rar].name}</small></div>
        <span class="hs-change">Cambiar ▸</span>
      </div>
      <div class="sec-title">Modos de juego</div>
      ${MODES.map(m=>`
        <div class="mode-card ${m.css}" data-mode="${m.id}">
          <div class="mode-emoji">${m.emoji}</div>
          <div class="mode-txt"><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></div>
          <div class="mode-go">JUGAR</div>
        </div>`).join('')}
    `;
    portraitsIn(el);
    $('hero-strip').onclick=()=>switchTo('luchadores');
    el.querySelectorAll('.mode-card').forEach(c=>c.onclick=()=>{ SFX.tap(); startBattle(c.dataset.mode); });
  }

  function cell(b){
    const lk=!S.unlocked.includes(b.id); const lvl=S.levels[b.id]||1;
    return `<div class="cell ${S.selected===b.id?'sel':''} ${lk?'locked':''}" data-b="${b.id}">
      <span class="rar-dot ${RAR[b.rar].css}"></span>
      ${lk?'<span class="badge-lock">🔒</span>':''}
      <canvas data-b="${b.id}"></canvas>
      <span class="cn">${esc(b.name)}</span>
      <span class="cl">${lk?'Bloqueado':'Nivel '+lvl}</span>
    </div>`;
  }
  function renderLuchadores(){
    const el=$('s-luchadores');
    const owned=BRAWLERS.filter(b=>S.unlocked.includes(b.id));
    const locked=BRAWLERS.filter(b=>!S.unlocked.includes(b.id));
    el.innerHTML=`<div class="sec-title">Tu equipo (${owned.length}/${BRAWLERS.length})</div>
      <div class="grid">${owned.map(cell).join('')}</div>
      ${locked.length?`<div class="sec-title">Por desbloquear</div><div class="grid">${locked.map(cell).join('')}</div>`:''}`;
    portraitsIn(el);
    el.querySelectorAll('.cell').forEach(c=>c.onclick=()=>{ SFX.tap(); showSheet(c.dataset.b); });
  }

  function statRow(label,val,max){ return `<div class="stat-row"><span>${label}</span><span style="display:flex;gap:8px;align-items:center">${val?`<b>${val}</b>`:''}<span class="bar"><i style="width:${Math.round(max*100)}%"></i></span></span></div>`; }
  function showSheet(id){
    const b=BRAWLER_MAP[id]; const el=$('s-luchadores'); const lk=!S.unlocked.includes(id); const lvl=S.levels[id]||1;
    const m=1+0.11*(lvl-1);
    el.innerHTML=`
      <button class="hs-change" style="background:none;padding:6px 2px" onclick="UI.back()">◂ Volver</button>
      <div class="sheet">
        <div class="sheet-top">
          <canvas data-b="${b.id}"></canvas>
          <div><h2>${esc(b.name)}</h2>
          <span class="chip" style="background:${RAR[b.rar].color};color:#111">${RAR[b.rar].name}</span>
          <span class="chip" style="background:#2a3170;color:#cfe">Nivel ${lvl}</span></div>
        </div>
        <p class="desc">${esc(b.desc)}</p>
        ${statRow('Vida',Math.round(b.hp*m),b.hp/6500)}
        ${statRow('Daño',Math.round(b.dmg*m),b.dmg/1200)}
        ${statRow('Alcance','',b.range/560)}
        ${statRow('Velocidad','',b.speed/190)}
        <div class="ability"><b>⚡ Super: ${esc(b.superName)}</b><p>${esc(b.superDesc)}</p></div>
        ${lk
          ? `<button class="btn-big sec" onclick="UI.unlockFree('${b.id}')">Desbloquear gratis 💎</button>`
          : `<button class="btn-big ${lvl>=MAXLVL?'gray':''}" ${lvl>=MAXLVL?'disabled':''} onclick="UI.upgrade('${b.id}')">${lvl>=MAXLVL?'Nivel máximo':'Mejorar al nivel '+(lvl+1)+' · 🪙 '+upgCost(lvl+1)}</button>
             <button class="btn-big sec" onclick="UI.select('${b.id}')">${S.selected===b.id?'✓ Seleccionado':'Usar este luchador'}</button>`}
      </div>`;
    portraitsIn(el);
  }

  function renderMejoras(){
    const el=$('s-mejoras');
    el.innerHTML=`<div class="sec-title">Mejorá tus luchadores</div>
      <p class="desc" style="margin:2px 2px 8px">Tenés 🪙 y 💎 <b>infinitos</b>. Mejorá y desbloqueá todo lo que quieras.</p>
      <div class="grid">${BRAWLERS.map(cell).join('')}</div>
      <button class="btn-big sec" style="margin-top:14px" onclick="UI.maxAll()">⬆️ Subir todo al máximo</button>`;
    portraitsIn(el);
    el.querySelectorAll('.cell').forEach(c=>c.onclick=()=>{ SFX.tap(); switchTo('luchadores'); showSheet(c.dataset.b); });
  }

  function renderCajas(){
    const el=$('s-cajas');
    el.innerHTML=`<div class="sec-title">Abrí cajas (gratis e ilimitadas)</div>
      ${BOXES.map(bx=>`
        <div class="box-card ${bx.css}" data-box="${bx.id}">
          <div class="be">${bx.emoji}</div>
          <b>${esc(bx.name)}</b><small>${esc(bx.desc)}</small>
          <div class="box-open">Abrir ✨</div>
        </div>`).join('')}`;
    el.querySelectorAll('.box-card').forEach(c=>c.onclick=()=>openBox(c.dataset.box));
  }

  function rollRarity(odds){ const total=Object.values(odds).reduce((a,b)=>a+b,0); let r=Math.random()*total; for(const k of Object.keys(odds)){ r-=odds[k]; if(r<=0) return k; } return 'com'; }
  function openBox(boxId){
    const bx=BOXES.find(b=>b.id===boxId); const rar=rollRarity(bx.odds);
    const pool=BRAWLERS.filter(b=>b.rar===rar); const got=pool[Math.floor(Math.random()*pool.length)]||BRAWLERS[0];
    const isNew=!S.unlocked.includes(got.id);
    SFX.box();
    const ov=$('overlay'); ov.classList.remove('hidden');
    ov.innerHTML=`<div class="reveal"><div class="ray"></div><div class="chest">${bx.emoji}</div><p style="color:#ffd24a;font-weight:800;margin-top:10px">Abriendo…</p></div>`;
    setTimeout(()=>{
      if(isNew){ S.unlocked.push(got.id); S.levels[got.id]=S.levels[got.id]||1; }
      else { S.levels[got.id]=Math.min(MAXLVL,(S.levels[got.id]||1)+1); }
      save();
      ov.innerHTML=`<div class="reveal"><div class="ray"></div>
        <div class="prize">
          <canvas data-b="${got.id}"></canvas>
          <h3>${esc(got.name)}</h3>
          <div class="rr" style="color:${RAR[got.rar].color}">${RAR[got.rar].name}</div>
          <p>${isNew?'¡Nuevo luchador desbloqueado!':'Subió al nivel '+(S.levels[got.id])+' ⬆️'}</p>
          <button class="btn-big" onclick="UI.closeOverlay()">¡Genial!</button>
        </div></div>`;
      const c=ov.querySelector('canvas'); if(c) requestAnimationFrame(()=>renderPortrait(c,got));
    },1100);
  }

  function showResult(res){
    const ov=$('overlay'); ov.classList.remove('hidden');
    const title=res.win?(res.mode==='oleadas'?'¡SOBREVIVISTE!':'¡VICTORIA!'):'DERROTA';
    ov.innerHTML=`<div class="result">
      <h2 class="${res.win?'win':'lose'}">${title}</h2>
      <p>${res.mode==='oleadas'?('Llegaste a la oleada '+res.wave):(res.win?'¡Buen combate!':'La próxima es tuya')} · ${res.kills} bajas</p>
      <div class="rewards">
        <div class="rw" style="color:#ffd24a">+${res.gold}<small>🪙 oro</small></div>
        <div class="rw" style="color:#49e0ff">+${res.gems}<small>💎 gemas</small></div>
        <div class="rw" style="color:${res.trophy>=0?'#ffb039':'#ff5277'}">${res.trophy>=0?'+':''}${res.trophy}<small>🏆 copas</small></div>
      </div>
      <button class="btn-big" onclick="UI.afterBattle()">Continuar</button>
    </div>`;
    S.trophies=Math.max(0,S.trophies+res.trophy); save(); renderTopbar();
  }

  function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),1600); }

  return {
    renderTopbar, renderInicio, renderLuchadores, renderMejoras, renderCajas, showSheet, showResult, toast, openBox,
    back(){ renderLuchadores(); },
    closeOverlay(){ $('overlay').classList.add('hidden'); $('overlay').innerHTML=''; renderCurrent(); },
    afterBattle(){ $('overlay').classList.add('hidden'); $('overlay').innerHTML=''; GAME.quit(); renderCurrent(); },
    select(id){ S.selected=id; save(); SFX.tap(); toast('Seleccionaste a '+BRAWLER_MAP[id].name); showSheet(id); },
    unlockFree(id){ S.unlocked.push(id); S.levels[id]=1; save(); SFX.pick(); toast('¡'+BRAWLER_MAP[id].name+' desbloqueado!'); showSheet(id); },
    upgrade(id){ const lvl=S.levels[id]||1; if(lvl>=MAXLVL) return; S.levels[id]=lvl+1; save(); SFX.pick(); toast(BRAWLER_MAP[id].name+' ahora nivel '+(lvl+1)); showSheet(id); },
    maxAll(){ BRAWLERS.forEach(b=>{ if(!S.unlocked.includes(b.id)) S.unlocked.push(b.id); S.levels[b.id]=MAXLVL; }); save(); SFX.box(); toast('¡Todo al nivel máximo!'); renderMejoras(); },
    MAXLVL, upgCost,
  };
})();
