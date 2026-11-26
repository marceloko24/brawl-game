/* ====== Motor de batalla (arena top-down) ====== */
(function(){
'use strict';

const G = {
  cv:null, ctx:null, hud:null, W:0, H:0, dpr:1,
  mode:'duelo', units:[], bullets:[], parts:[], shocks:[], gems:[], texts:[],
  walls:[], bushes:[], safes:[],
  player:null, phase:'idle', time:0, matchTime:0, timeLimit:150,
  score:[0,0], wave:0, waveTimer:0, enemiesToSpawn:0, kills:0,
  input:{ mx:0,my:0, ax:0,ay:0, fire:false, superReq:false, auto:true },
  joyMove:{active:false,id:null,bx:0,by:0,x:0,y:0},
  joyAim:{active:false,id:null,bx:0,by:0,x:0,y:0},
  last:0, raf:null, result:null, onEnd:null, shakeT:0, shakeM:0,
};
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rand=(a,b)=>a+Math.random()*(b-a);
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
const lvlMul=l=>1+0.11*(l-1);

/* ---------- Canvas ---------- */
function setupCanvas(){
  G.cv=document.getElementById('cv'); G.ctx=G.cv.getContext('2d'); G.hud=document.getElementById('hud');
  resize();
  window.addEventListener('resize',resize);
}
function resize(){
  if(!G.cv) return;
  G.dpr=Math.min(window.devicePixelRatio||1,2);
  const w=G.cv.clientWidth||window.innerWidth, h=G.cv.clientHeight||window.innerHeight;
  G.W=w; G.H=h;
  G.cv.width=Math.round(w*G.dpr); G.cv.height=Math.round(h*G.dpr);
  G.ctx.setTransform(G.dpr,0,0,G.dpr,0,0);
}

/* ---------- Arena ---------- */
function buildArena(){
  const W=G.W,H=G.H; G.walls=[]; G.bushes=[]; G.safes=[];
  const t=14;
  // bordes
  G.walls.push({x:0,y:0,w:W,h:t},{x:0,y:H-t,w:W,h:t},{x:0,y:0,w:t,h:H},{x:W-t,y:0,w:t,h:H});
  const cx=W/2, cy=H/2;
  // obstáculos simétricos (bloques de roca)
  const addSym=(x,y,w,h)=>{ G.walls.push({x,y,w,h}); G.walls.push({x:W-x-w,y:H-y-h,w,h}); };
  addSym(W*0.14,H*0.30,W*0.16,22);
  addSym(W*0.62,H*0.22,22,H*0.14);
  G.walls.push({x:cx-W*0.07,y:cy-11,w:W*0.14,h:22});
  // arbustos (cobertura)
  const bush=(x,y,w,h)=>G.bushes.push({x,y,w,h});
  bush(W*0.08,H*0.46,W*0.22,H*0.08);
  bush(W*0.70,H*0.46,W*0.22,H*0.08);
  bush(cx-W*0.12,H*0.12,W*0.24,H*0.06);
  bush(cx-W*0.12,H*0.82,W*0.24,H*0.06);
  bush(W*0.40,cy-H*0.03,W*0.20,H*0.06);
  if(G.mode==='safe'){
    const sw=W*0.26, sh=26;
    G.safes.push({x:cx-sw/2,y:H*0.86,w:sw,h:sh,hp:5000,maxhp:5000,team:0});
    G.safes.push({x:cx-sw/2,y:H*0.14-sh,w:sw,h:sh,hp:5000,maxhp:5000,team:1});
  }
}
function spawnPoint(team){
  const W=G.W,H=G.H;
  if(G.mode==='oleadas') return {x:W/2,y:H*0.6};
  if(G.mode==='duelo'){ return {x:rand(W*0.2,W*0.8),y:rand(H*0.2,H*0.8)}; }
  return team===0 ? {x:rand(W*0.25,W*0.75),y:H*0.80} : {x:rand(W*0.25,W*0.75),y:H*0.20};
}

/* ---------- Unidades ---------- */
function makeUnit(brawlerId,team,lvl,isPlayer){
  const b=BRAWLER_MAP[brawlerId]; const sp=spawnPoint(team);
  const m=lvlMul(lvl);
  return {
    id:Math.random().toString(36).slice(2), b, brawlerId, team, lvl, isPlayer:!!isPlayer,
    x:sp.x, y:sp.y, vx:0, vy:0, r:isPlayer?17:(b.weapon==='heavy'?19:16),
    maxhp:Math.round(b.hp*m), hp:Math.round(b.hp*m), dmg:b.dmg*m,
    aim:team===0?-Math.PI/2:Math.PI/2, moveAng:0, walking:false,
    ammo:b.shots, maxAmmo:b.shots, fireGap:0,
    superC:0, alive:true, respawnT:0, lives:3,
    shield:0, shieldT:0, dashT:0, dashVX:0, dashVY:0,
    gems:0, aiTimer:rand(0,0.6), aiStrafe:rand(-1,1), aiReload:0, hurtT:0, muzzle:0, spawnProt:1.2,
  };
}

/* ---------- Setup partida ---------- */
function pick(arr,n,exclude){ const pool=arr.filter(x=>!exclude||!exclude.includes(x)); const out=[]; while(out.length<n&&pool.length){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; }

function startMatch(mode,brawlerId,lvl,opts){
  opts=opts||{};
  G.mode=mode; G.units=[]; G.bullets=[]; G.parts=[]; G.shocks=[]; G.gems=[]; G.texts=[];
  G.phase='playing'; G.time=0; G.matchTime=0; G.score=[0,0]; G.wave=0; G.kills=0;
  G.result=null; G.gemCountdown=0; G.shakeT=0;
  resize(); buildArena();
  const unlocked = opts.unlocked || Object.keys(BRAWLER_MAP);
  const others = Object.keys(BRAWLER_MAP).filter(id=>id!==brawlerId);
  const botLvl = opts.botLvl || Math.max(1, lvl-1);

  const p=makeUnit(brawlerId,0,lvl,true); G.player=p; G.units.push(p);

  if(mode==='duelo'){
    const bots=pick(others,4);
    bots.forEach((id,i)=>{ const u=makeUnit(id,i+1,botLvl,false); G.units.push(u); });
    G.timeLimit=150;
  } else if(mode==='oleadas'){
    G.timeLimit=0; G.waveTimer=1.5; G.enemiesToSpawn=0; G.wave=0;
  } else { // gemas / safe 3v3
    const allies=pick(others,2); allies.forEach(id=>G.units.push(makeUnit(id,0,botLvl,false)));
    const enemies=pick(others,3,[brawlerId]); enemies.forEach(id=>G.units.push(makeUnit(id,1,botLvl,false)));
    G.timeLimit=mode==='gemas'?150:150;
  }
  G.last=performance.now();
  if(!G.raf) G.raf=requestAnimationFrame(frame);
}

/* ---------- Bucle ---------- */
function frame(ts){
  const dt=Math.min(0.05,(ts-G.last)/1000)||0.016; G.last=ts;
  if(G.phase==='playing') update(dt);
  render();
  G.raf=requestAnimationFrame(frame);
}

/* ---------- Física helpers ---------- */
function resolveWalls(u){
  for(const w of G.walls){
    const nx=clamp(u.x,w.x,w.x+w.w), ny=clamp(u.y,w.y,w.y+w.h);
    const dx=u.x-nx, dy=u.y-ny, d=Math.hypot(dx,dy);
    if(d<u.r){ if(d<0.001){ u.x+=u.r; continue; } const push=(u.r-d); u.x+=dx/d*push; u.y+=dy/d*push; }
  }
  for(const s of G.safes){
    const nx=clamp(u.x,s.x,s.x+s.w), ny=clamp(u.y,s.y,s.y+s.h);
    const dx=u.x-nx, dy=u.y-ny, d=Math.hypot(dx,dy)||0.001;
    if(d<u.r){ const push=(u.r-d); u.x+=dx/d*push; u.y+=dy/d*push; }
  }
  u.x=clamp(u.x,u.r+14,G.W-u.r-14); u.y=clamp(u.y,u.r+14,G.H-u.r-14);
}
function segHitsWall(x1,y1,x2,y2){
  for(const w of G.walls){
    if(segRect(x1,y1,x2,y2,w)) return true;
  }
  for(const s of G.safes){ if(segRect(x1,y1,x2,y2,s)) return true; }
  return false;
}
function segRect(x1,y1,x2,y2,r){
  if(Math.max(x1,x2)<r.x||Math.min(x1,x2)>r.x+r.w||Math.max(y1,y2)<r.y||Math.min(y1,y2)>r.y+r.h) return false;
  const edges=[[r.x,r.y,r.x+r.w,r.y],[r.x+r.w,r.y,r.x+r.w,r.y+r.h],[r.x+r.w,r.y+r.h,r.x,r.y+r.h],[r.x,r.y+r.h,r.x,r.y]];
  for(const e of edges){ if(segSeg(x1,y1,x2,y2,e[0],e[1],e[2],e[3])) return true; }
  // punto dentro
  if(x1>=r.x&&x1<=r.x+r.w&&y1>=r.y&&y1<=r.y+r.h) return true;
  return false;
}
function segSeg(a,b,c,d,p,q,r,s){
  const d1=(r-p)*(b-q)-(s-q)*(a-p), d2=(r-p)*(d-q)-(s-q)*(c-p);
  const d3=(c-a)*(q-b)-(d-b)*(p-a), d4=(c-a)*(s-b)-(d-b)*(r-a);
  return ((d1>0)!==(d2>0))&&((d3>0)!==(d4>0));
}
function inBush(x,y){ for(const bu of G.bushes){ if(x>=bu.x&&x<=bu.x+bu.w&&y>=bu.y&&y<=bu.y+bu.h) return true; } return false; }
function ptInRect(x,y,r){ return x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h; }

/* ---------- Disparo ---------- */
function fireGapFor(w){ return ({rapid:0.13,dual:0.22,shotgun:0.42,sniper:0.0,lob:0.45,heavy:0.55,burst:0.45,dash:0.22})[w] ?? 0.3; }

function spawnBullet(o){ G.bullets.push(Object.assign({r:6,life:3,traveled:0,pierce:false,color:'#fff',splash:0},o)); }

function fireWeapon(u){
  const b=u.b;
  if(u.ammo<1 || u.fireGap>0) return;
  u.ammo-=1; u.fireGap=fireGapFor(b.weapon); u.muzzle=0.08;
  const col=u.b.pal.trim, spd=b.bulletSpeed, range=b.range, dmg=u.dmg/(b.pellets>1&&b.weapon!=='shotgun'&&b.weapon!=='burst'?1:1);
  if(b.weapon==='lob'){
    // bomba hacia el punto apuntado
    const dd=range; const tx=u.x+Math.cos(u.aim)*dd, ty=u.y+Math.sin(u.aim)*dd;
    spawnBullet({x:u.x,y:u.y,vx:Math.cos(u.aim)*spd,vy:Math.sin(u.aim)*spd,r:9,dmg:u.dmg,team:u.team,owner:u,
      type:'lob',tx,ty,splash:b.splash||70,color:col,maxDist:dd,shadow:true});
  } else if(b.weapon==='burst'){
    for(let i=0;i<b.pellets;i++){ const a=u.aim+i*(TAU/b.pellets);
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:7,dmg:u.dmg,team:u.team,owner:u,maxDist:range,color:col}); }
  } else if(b.weapon==='shotgun'){
    for(let i=0;i<b.pellets;i++){ const a=u.aim+(i-(b.pellets-1)/2)*(b.spread/(b.pellets-1||1));
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:6,dmg:u.dmg/b.pellets*1.3,team:u.team,owner:u,maxDist:range,color:col}); }
  } else if(b.weapon==='dash'){
    for(let i=0;i<b.pellets;i++){ const a=u.aim+(i-(b.pellets-1)/2)*(b.spread/(b.pellets-1||1));
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:6,dmg:u.dmg/b.pellets*1.2,team:u.team,owner:u,maxDist:range,color:col}); }
  } else if(b.weapon==='dual'){
    for(let i=0;i<2;i++){ const off=(i===0?-1:1)*8;
      spawnBullet({x:u.x+Math.cos(u.aim+Math.PI/2)*off,y:u.y+Math.sin(u.aim+Math.PI/2)*off,
        vx:Math.cos(u.aim)*spd,vy:Math.sin(u.aim)*spd,r:6,dmg:u.dmg/2,team:u.team,owner:u,maxDist:range,color:col}); }
  } else if(b.weapon==='heavy'){
    spawnBullet({x:u.x,y:u.y,vx:Math.cos(u.aim)*spd,vy:Math.sin(u.aim)*spd,r:12,dmg:u.dmg,team:u.team,owner:u,maxDist:range,color:col});
  } else { // sniper, rapid
    const sp=b.spread||0, a=u.aim+rand(-sp,sp);
    spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:b.weapon==='sniper'?8:5,dmg:u.dmg,team:u.team,owner:u,maxDist:range,color:col});
  }
  SFX.shoot(b.weapon);
  for(let i=0;i<3;i++) addPart(u.x+Math.cos(u.aim)*u.r,u.y+Math.sin(u.aim)*u.r,col,rand(40,120),u.aim,0.2,2);
}

/* ---------- Supers ---------- */
function castSuper(u){
  if(u.superC<1) return; u.superC=0; SFX.super(); shake(0.3,8);
  const b=u.b, s=b.super;
  if(s==='blast'){
    for(let i=0;i<9;i++){ const a=u.aim+(i-4)*0.14;
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*640,vy:Math.sin(a)*640,r:9,dmg:u.dmg*0.9,team:u.team,owner:u,maxDist:b.range*1.1,color:'#fff',knock:260}); }
  } else if(s==='pierce'){
    spawnBullet({x:u.x,y:u.y,vx:Math.cos(u.aim)*1000,vy:Math.sin(u.aim)*1000,r:11,dmg:u.dmg*1.6,team:u.team,owner:u,maxDist:1600,color:u.b.pal.light,pierce:true,glow:true});
  } else if(s==='spray'){
    for(let w=0;w<3;w++) for(let i=0;i<10;i++){ const a=i*(TAU/10)+w*0.1;
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(a)*(520+w*40),vy:Math.sin(a)*(520+w*40),r:5,dmg:u.dmg*0.8,team:u.team,owner:u,maxDist:b.range*1.2,color:u.b.pal.trim}); }
  } else if(s==='barrage'){
    for(let i=0;i<6;i++){ const ang=u.aim+rand(-0.5,0.5), dd=rand(b.range*0.5,b.range);
      const tx=u.x+Math.cos(ang)*dd, ty=u.y+Math.sin(ang)*dd;
      spawnBullet({x:u.x,y:u.y,vx:Math.cos(ang)*360,vy:Math.sin(ang)*360,r:9,dmg:u.dmg*0.8,team:u.team,owner:u,type:'lob',tx,ty,splash:(b.splash||70)*1.2,color:u.b.pal.trim,maxDist:dd,shadow:true,delay:i*0.08}); }
  } else if(s==='charge'){
    u.dashT=0.32; u.dashVX=Math.cos(u.aim)*760; u.dashVY=Math.sin(u.aim)*760; u.dashHit={};
  } else if(s==='shock'){
    G.shocks.push({x:u.x,y:u.y,r:10,max:Math.max(G.W,G.H)*0.5,team:u.team,owner:u,dmg:u.dmg*1.1,hit:{},color:u.b.pal.light});
  } else if(s==='shield'){
    u.hp=Math.min(u.maxhp,u.hp+u.maxhp*0.45); u.shield=u.maxhp*0.6; u.shieldT=6; floatText(u.x,u.y-u.r,'+ESCUDO',u.b.pal.trim);
  } else if(s==='slam'){
    G.shocks.push({x:u.x,y:u.y,r:10,max:170,team:u.team,owner:u,dmg:u.dmg*1.2,hit:{},color:u.b.pal.trim,knock:220});
    u.shield=u.maxhp*0.5; u.shieldT=4;
    for(let i=0;i<16;i++) addPart(u.x,u.y,u.b.pal.trim,rand(120,260),i/16*TAU,0.4,4);
  }
}

/* ---------- Partículas / textos ---------- */
function addPart(x,y,color,spd,ang,life,r){
  if(G.parts.length>190) return;
  G.parts.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,color,life,max:life,r:r||3});
}
function burst(x,y,color,n,spd){ n=Math.min(n,20); for(let i=0;i<n;i++) addPart(x,y,color,rand(spd*0.4,spd),rand(0,TAU),rand(0.25,0.55),rand(2,4)); }
function floatText(x,y,txt,color){ G.texts.push({x,y,txt,color,life:0.9,max:0.9}); }
function shake(t,m){ G.shakeT=Math.max(G.shakeT,t); G.shakeM=m; }

/* ---------- Daño ---------- */
function damage(u,dmg,fromTeam,owner,knockX,knockY){
  if(!u.alive||u.spawnProt>0) return;
  if(u.shieldT>0&&u.shield>0){ const ab=Math.min(u.shield,dmg); u.shield-=ab; dmg-=ab; }
  if(dmg<=0){ return; }
  u.hp-=dmg; u.hurtT=0.12;
  if(owner&&owner.alive){ owner.superC=Math.min(1,owner.superC+clamp(dmg/u.maxhp,0,0.5)*0.9+0.03); }
  if(knockX){ u.x+=knockX; u.y+=knockY; resolveWalls(u); }
  burst(u.x,u.y,'#ffd24a',4,140);
  if(u.isPlayer){ SFX.hurt(); shake(0.12,5); } else SFX.hit();
  if(u.hp<=0){ killUnit(u,owner); }
}
function killUnit(u,owner){
  u.alive=false; u.hp=0; burst(u.x,u.y,u.b.pal.body,18,260); SFX.die();
  floatText(u.x,u.y-u.r,'💥',u.b.pal.light);
  if(u.gems>0){ for(let i=0;i<u.gems;i++) dropGem(u.x+rand(-20,20),u.y+rand(-20,20)); u.gems=0; }
  if(owner&&owner.isPlayer){ G.kills++; owner.superC=Math.min(1,owner.superC+0.15); }
  if(G.mode==='duelo'||G.mode==='oleadas'){ u.respawnT=-1; } else { u.respawnT=3; }
}

/* ---------- Gemas ---------- */
function dropGem(x,y){ G.gems.push({x:clamp(x,24,G.W-24),y:clamp(y,24,G.H-24),vy:-60,born:G.time}); }
function updateGems(dt){
  if(G.mode==='gemas' && G.time-(G._lastGem||-99)>2.2 && G.gems.length<6){ G._lastGem=G.time; dropGem(G.W/2+rand(-40,40),G.H/2+rand(-20,20)); }
  for(let i=G.gems.length-1;i>=0;i--){ const g=G.gems[i];
    for(const u of G.units){ if(u.alive&&dist2(u.x,u.y,g.x,g.y)<(u.r+10)**2){ u.gems++; G.gems.splice(i,1); if(u.isPlayer) SFX.pick(); floatText(g.x,g.y-6,'+1 💎','#49e0ff'); break; } }
  }
}

/* ---------- IA ---------- */
function nearestEnemy(u,ignoreBush){
  let best=null,bd=1e9;
  for(const o of G.units){ if(!o.alive||o.team===u.team) continue;
    if(!ignoreBush && inBush(o.x,o.y) && dist2(u.x,u.y,o.x,o.y)>80*80) continue;
    const d=dist2(u.x,u.y,o.x,o.y); if(d<bd){ bd=d; best=o; } }
  return best;
}
function aiUpdate(u,dt){
  u.aiTimer-=dt;
  const en=nearestEnemy(u,false);
  let desireX=0,desireY=0, wantFire=false;
  const b=u.b;
  if(G.mode==='gemas'){
    // ir por gemas cercanas si el equipo va perdiendo o hay gemas sueltas
    let gg=null,gd=1e9; for(const g of G.gems){ const d=dist2(u.x,u.y,g.x,g.y); if(d<gd){gd=d;gg=g;} }
    if(gg && (!en || gd<220*220)){ const a=Math.atan2(gg.y-u.y,gg.x-u.x); desireX=Math.cos(a); desireY=Math.sin(a); }
  }
  if(en){
    const d=Math.sqrt(dist2(u.x,u.y,en.x,en.y));
    u.aim=Math.atan2(en.y-u.y,en.x-u.x)+ (u.aiReload>0?0:rand(-0.05,0.05));
    const los = b.weapon==='lob' || !segHitsWall(u.x,u.y,en.x,en.y);
    const pref=b.range*0.72;
    if(!desireX&&!desireY){
      let a=Math.atan2(en.y-u.y,en.x-u.x);
      if(u.hp<u.maxhp*0.3){ a+=Math.PI; } // huir si poca vida
      else if(d>pref) {} else if(d<pref*0.6) a+=Math.PI;
      else a+=Math.PI/2*u.aiStrafe*0.5;
      desireX=Math.cos(a); desireY=Math.sin(a);
    }
    if(d<b.range && los && u.hp>u.maxhp*0.2) wantFire=true;
    if(u.superC>=1 && d<b.range*0.9 && (b.super==='shield'?u.hp<u.maxhp*0.6:los)) { castSuper(u); }
  } else {
    if(!desireX&&!desireY){ const a=u.aim+rand(-0.4,0.4); desireX=Math.cos(a); desireY=Math.sin(a); }
  }
  if(u.aiTimer<=0){ u.aiTimer=rand(0.5,1.2); u.aiStrafe=rand(-1,1); }
  u.vx=desireX*b.speed; u.vy=desireY*b.speed;
  u.walking=(desireX||desireY)!==0;
  if(desireX||desireY) u.moveAng=Math.atan2(desireY,desireX);
  if(wantFire) fireWeapon(u);
}

/* ---------- Update principal ---------- */
function update(dt){
  G.time+=dt; G.matchTime+=dt;
  if(G.shakeT>0) G.shakeT-=dt;
  const p=G.player;

  // input jugador
  if(p&&p.alive){
    const im=G.input;
    let mx=im.mx,my=im.my;
    if(G.joyMove.active){ mx=G.joyMove.x; my=G.joyMove.y; }
    const mm=Math.hypot(mx,my);
    if(mm>0.12){ p.vx=mx/mm*Math.min(1,mm)*p.b.speed; p.vy=my/mm*Math.min(1,mm)*p.b.speed; p.walking=true; p.moveAng=Math.atan2(my,mx); }
    else { p.vx=0; p.vy=0; p.walking=false; }
    let fire=false;
    if(G.joyAim.active){ const a=Math.hypot(G.joyAim.x,G.joyAim.y); if(a>0.2){ p.aim=Math.atan2(G.joyAim.y,G.joyAim.x); fire=true; } }
    else if(im.fire){ const a=Math.hypot(im.ax,im.ay); if(a>0.2){ p.aim=Math.atan2(im.ay,im.ax); fire=true; } }
    if(!fire && im.auto){ const en=nearestEnemy(p,false); if(en && dist2(p.x,p.y,en.x,en.y)<(p.b.range*1.05)**2){ p.aim=Math.atan2(en.y-p.y,en.x-p.x); fire=true; } }
    if(fire) fireWeapon(p);
    if(im.superReq){ im.superReq=false; castSuper(p); }
  }

  // unidades
  for(const u of G.units){
    if(!u.alive){
      if(u.respawnT>0){ u.respawnT-=dt; if(u.respawnT<=0) respawn(u); }
      continue;
    }
    if(u.spawnProt>0) u.spawnProt-=dt;
    if(u.hurtT>0) u.hurtT-=dt;
    if(u.muzzle>0) u.muzzle-=dt;
    if(u.fireGap>0) u.fireGap-=dt;
    if(u.shieldT>0){ u.shieldT-=dt; if(u.shieldT<=0) u.shield=0; }
    u.ammo=Math.min(u.maxAmmo,u.ammo+dt/u.b.reload);
    if(!u.isPlayer) aiUpdate(u,dt);
    if(u.dashT>0){
      u.dashT-=dt; u.x+=u.dashVX*dt; u.y+=u.dashVY*dt;
      for(const o of G.units){ if(o.alive&&o.team!==u.team&&!u.dashHit[o.id]&&dist2(u.x,u.y,o.x,o.y)<(u.r+o.r+6)**2){ u.dashHit[o.id]=1; damage(o,u.dmg*1.4,u.team,u,Math.cos(u.aim)*40,Math.sin(u.aim)*40); } }
      burst(u.x,u.y,u.b.pal.light,2,80);
    } else { u.x+=u.vx*dt; u.y+=u.vy*dt; }
    resolveWalls(u);
  }

  updateBullets(dt);
  updateShocks(dt);
  updateGems(dt);
  updateParts(dt);
  if(G.mode==='oleadas') updateWaves(dt);
  checkWin(dt);
}

function respawn(u){
  const sp=spawnPoint(u.team); u.x=sp.x; u.y=sp.y; u.hp=u.maxhp; u.alive=true; u.spawnProt=1.5; u.shield=0; u.shieldT=0; u.superC=0; u.gems=0; u.ammo=u.maxAmmo;
}

function updateBullets(dt){
  for(let i=G.bullets.length-1;i>=0;i--){ const bl=G.bullets[i];
    if(bl.delay>0){ bl.delay-=dt; continue; }
    const px=bl.x,py=bl.y;
    bl.x+=bl.vx*dt; bl.y+=bl.vy*dt; bl.traveled+=Math.hypot(bl.vx,bl.vy)*dt; bl.life-=dt;
    if(bl.glow) burst(bl.x,bl.y,bl.color,1,40);
    // lob: explota al llegar
    if(bl.type==='lob'){
      if(bl.maxDist&&bl.traveled>=bl.maxDist){ explode(bl); G.bullets.splice(i,1); continue; }
    } else {
      if(!bl.pierce && segHitsWall(px,py,bl.x,bl.y)){
        // daño a cajas fuertes
        for(const s of G.safes){ if(segRect(px,py,bl.x,bl.y,s) && s.team!==bl.team && s.hp>0){ s.hp-=bl.dmg; burst(bl.x,bl.y,'#ffd24a',6,160); shake(0.08,3); } }
        burst(bl.x,bl.y,bl.color,4,120); G.bullets.splice(i,1); continue;
      }
    }
    // impacto unidades
    let hit=false;
    for(const u of G.units){ if(!u.alive||u.team===bl.team||u.spawnProt>0) continue;
      if(dist2(bl.x,bl.y,u.x,u.y)<(u.r+bl.r)**2){
        if(bl.type==='lob'){ explode(bl); hit=true; break; }
        let kx=0,ky=0; if(bl.knock){ const m=Math.hypot(bl.vx,bl.vy)||1; kx=bl.vx/m*bl.knock*0.1; ky=bl.vy/m*bl.knock*0.1; }
        damage(u,bl.dmg,bl.team,bl.owner,kx,ky);
        if(!bl.pierce){ hit=true; break; } else { if(!bl._hit) bl._hit={}; }
      }
    }
    if(hit){ G.bullets.splice(i,1); continue; }
    if(bl.life<=0||(bl.maxDist&&bl.traveled>=bl.maxDist&&bl.type!=='lob')||bl.x<0||bl.x>G.W||bl.y<0||bl.y>G.H){
      if(bl.type==='lob') explode(bl);
      G.bullets.splice(i,1);
    }
  }
}
function explode(bl){
  burst(bl.x,bl.y,bl.color,16,300); shake(0.14,5);
  for(let a=0;a<10;a++) addPart(bl.x,bl.y,'#ffd24a',rand(80,220),a/10*TAU,0.4,4);
  for(const u of G.units){ if(!u.alive||u.team===bl.team||u.spawnProt>0) continue;
    if(dist2(bl.x,bl.y,u.x,u.y)<(bl.splash+u.r)**2) damage(u,bl.dmg,bl.team,bl.owner); }
  for(const s of G.safes){ if(s.team!==bl.team&&s.hp>0){ const nx=clamp(bl.x,s.x,s.x+s.w),ny=clamp(bl.y,s.y,s.y+s.h); if(dist2(bl.x,bl.y,nx,ny)<bl.splash**2){ s.hp-=bl.dmg; } } }
}
function updateShocks(dt){
  for(let i=G.shocks.length-1;i>=0;i--){ const s=G.shocks[i];
    const pr=s.r; s.r+=600*dt;
    for(const u of G.units){ if(!u.alive||u.team===s.team||s.hit[u.id]||u.spawnProt>0) continue;
      const d=Math.sqrt(dist2(s.x,s.y,u.x,u.y));
      if(d>=pr&&d<=s.r){ s.hit[u.id]=1; let kx=0,ky=0; if(s.knock){ const a=Math.atan2(u.y-s.y,u.x-s.x); kx=Math.cos(a)*s.knock*0.1; ky=Math.sin(a)*s.knock*0.1; } damage(u,s.dmg,s.team,s.owner,kx,ky); }
    }
    if(s.r>=s.max) G.shocks.splice(i,1);
  }
}
function updateParts(dt){
  for(let i=G.parts.length-1;i>=0;i--){ const p=G.parts[i]; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=0.9; p.vy*=0.9; p.life-=dt; if(p.life<=0) G.parts.splice(i,1); }
  for(let i=G.texts.length-1;i>=0;i--){ const t=G.texts[i]; t.y-=28*dt; t.life-=dt; if(t.life<=0) G.texts.splice(i,1); }
}
function updateWaves(dt){
  const aliveEn=G.units.filter(u=>u.team!==0&&u.alive).length;
  if(G.enemiesToSpawn<=0 && aliveEn===0){
    G.waveTimer-=dt;
    if(G.waveTimer<=0){ G.wave++; G.enemiesToSpawn=2+G.wave; floatText(G.W/2,G.H*0.3,'OLEADA '+G.wave,'#ffd24a'); G._spawnGap=0; }
  }
  if(G.enemiesToSpawn>0){ G._spawnGap-=dt; if(G._spawnGap<=0){ G._spawnGap=0.6;
    const ids=Object.keys(BRAWLER_MAP); const id=ids[Math.floor(Math.random()*ids.length)];
    const u=makeUnit(id,1,Math.max(1,Math.floor(G.wave/2)),false);
    u.x=rand(40,G.W-40); u.y=rand(30,60); G.units.push(u); G.enemiesToSpawn--;
  } }
  // limpiar muertos sin respawn
  G.units=G.units.filter(u=>u.isPlayer||u.team===0||u.alive||u.respawnT>0);
}

/* ---------- Victoria / derrota ---------- */
function checkWin(dt){
  if(G.phase!=='playing') return;
  const timeUp = G.timeLimit>0 && G.matchTime>=G.timeLimit;
  if(G.mode==='gemas'){
    const t0=G.units.filter(u=>u.team===0&&u.alive).reduce((s,u)=>s+u.gems,0);
    const t1=G.units.filter(u=>u.team===1&&u.alive).reduce((s,u)=>s+u.gems,0);
    G.score=[t0,t1];
    const lead = t0>=10?0 : t1>=10?1 : -1;
    if(lead>=0){ G.gemLeader=lead; G.gemCountdown=(G.gemCountdown||0)+ (G._gemLead===lead?dt:0); G._gemLead=lead;
      if(G._gemLead!==lead) G.gemCountdown=0;
      if(G.gemCountdown>=12) return end(lead===0);
    } else { G.gemCountdown=0; G._gemLead=-1; }
    if(timeUp) return end(t0>=t1);
  } else if(G.mode==='safe'){
    const mine=G.safes.find(s=>s.team===0), foe=G.safes.find(s=>s.team===1);
    G.score=[Math.max(0,Math.round(foe.hp)),Math.max(0,Math.round(mine.hp))];
    if(foe.hp<=0) return end(true);
    if(mine.hp<=0) return end(false);
    if(timeUp) return end(mine.hp>=foe.hp);
  } else if(G.mode==='duelo'){
    if(!G.player.alive && G.player.respawnT<0) return end(false);
    const foes=G.units.filter(u=>u.team!==0&&(u.alive||u.respawnT>0)).length;
    if(foes===0) return end(true);
    if(timeUp) return end(true);
  } else if(G.mode==='oleadas'){
    if(!G.player.alive && G.player.respawnT<0) return end(false,true);
  }
}
function end(win,survival){
  if(G.phase!=='playing') return;
  G.phase=win?'win':'lose';
  const base=win?200:60;
  G.result={ win, mode:G.mode, kills:G.kills, wave:G.wave,
    gold: base+G.kills*25+(survival?G.wave*40:0),
    gems: win?6:2, trophy: win?(survival?G.wave*2:8):(survival?G.wave:-3) };
  if(win) SFX.win(); else SFX.lose();
  if(G.onEnd) setTimeout(()=>G.onEnd(G.result),700);
}

/* ================= RENDER ================= */
function render(){
  const ctx=G.ctx,W=G.W,H=G.H; if(!ctx) return;
  ctx.save();
  if(G.shakeT>0){ ctx.translate(rand(-G.shakeM,G.shakeM),rand(-G.shakeM,G.shakeM)); }
  // piso
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#2a3170'); g.addColorStop(1,'#1a1d44');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // baldosas
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  const ts=Math.max(40,W/9);
  for(let x=0;x<W;x+=ts){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for(let y=0;y<H;y+=ts){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  // línea media
  ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.setLineDash([10,10]); ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke(); ctx.setLineDash([]);

  // arbustos (debajo)
  for(const b of G.bushes){ drawBush(ctx,b); }
  // cajas fuertes
  for(const s of G.safes){ drawSafe(ctx,s); }
  // gemas
  for(const gm of G.gems){ drawGem(ctx,gm); }
  // shocks
  for(const s of G.shocks){ ctx.strokeStyle=s.color; ctx.globalAlpha=clamp(1-s.r/s.max,0,0.8); ctx.lineWidth=12; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.stroke(); ctx.globalAlpha=1; }

  // paredes
  for(const w of G.walls){ drawWall(ctx,w); }

  // balas
  for(const bl of G.bullets){ if(bl.delay>0) continue; drawBullet(ctx,bl); }

  // unidades (muertas ocultas)
  const order=[...G.units].sort((a,b)=>a.y-b.y);
  for(const u of order){ if(!u.alive) continue; drawUnit(ctx,u); }

  // partículas
  for(const p of G.parts){ ctx.globalAlpha=clamp(p.life/p.max,0,1); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(p.life/p.max),0,TAU); ctx.fill(); }
  ctx.globalAlpha=1;
  // arbustos encima (medio transparentes) para efecto cobertura
  for(const b of G.bushes){ ctx.fillStyle='rgba(30,130,70,0.28)'; rrp(ctx,b.x,b.y,b.w,b.h,12); ctx.fill(); }

  // textos flotantes
  for(const t of G.texts){ ctx.globalAlpha=clamp(t.life/t.max,0,1); ctx.fillStyle=t.color; ctx.font='800 15px system-ui'; ctx.textAlign='center'; ctx.fillText(t.txt,t.x,t.y); }
  ctx.globalAlpha=1; ctx.textAlign='left';

  ctx.restore();
  drawHUD(ctx);
}

function rrp(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function drawWall(ctx,w){
  const g=ctx.createLinearGradient(w.x,w.y,w.x,w.y+w.h); g.addColorStop(0,'#4a5190'); g.addColorStop(1,'#2a2f5e');
  ctx.fillStyle=g; rrp(ctx,w.x,w.y,w.w,w.h,6); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.10)'; rrp(ctx,w.x,w.y,w.w,Math.min(5,w.h),4); ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.lineWidth=1.5; rrp(ctx,w.x,w.y,w.w,w.h,6); ctx.stroke();
}
function drawBush(ctx,b){
  ctx.fillStyle='#1f7a46'; rrp(ctx,b.x,b.y,b.w,b.h,12); ctx.fill();
  ctx.fillStyle='rgba(120,230,160,0.25)';
  for(let x=b.x+8;x<b.x+b.w-4;x+=16){ for(let y=b.y+6;y<b.y+b.h-4;y+=14){ ctx.beginPath(); ctx.arc(x,y,5,0,TAU); ctx.fill(); } }
}
function drawSafe(ctx,s){
  const ratio=s.hp/s.maxhp;
  const g=ctx.createLinearGradient(s.x,s.y,s.x,s.y+s.h); g.addColorStop(0,'#c9cfe8'); g.addColorStop(1,'#7f87b5');
  ctx.fillStyle=g; rrp(ctx,s.x,s.y,s.w,s.h,8); ctx.fill();
  ctx.strokeStyle=s.team===0?'#49e0ff':'#ff5277'; ctx.lineWidth=3; rrp(ctx,s.x,s.y,s.w,s.h,8); ctx.stroke();
  ctx.fillStyle='#1a1d2e'; ctx.beginPath(); ctx.arc(s.x+s.w/2,s.y+s.h/2,6,0,TAU); ctx.fill();
  // barra vida
  ctx.fillStyle='rgba(0,0,0,.5)'; rrp(ctx,s.x,s.y-10,s.w,6,3); ctx.fill();
  ctx.fillStyle=s.team===0?'#49e0ff':'#ff5277'; rrp(ctx,s.x,s.y-10,s.w*clamp(ratio,0,1),6,3); ctx.fill();
}
function drawGem(ctx,g){
  const pulse=1+Math.sin(G.time*5+g.x)*0.12;
  ctx.save(); ctx.translate(g.x,g.y); ctx.scale(pulse,pulse);
  ctx.shadowColor='#49e0ff'; ctx.shadowBlur=12;
  ctx.fillStyle='#49e0ff'; ctx.beginPath();
  ctx.moveTo(0,-9); ctx.lineTo(7,-2); ctx.lineTo(4,8); ctx.lineTo(-4,8); ctx.lineTo(-7,-2); ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(3,-3); ctx.lineTo(-3,-3); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawBullet(ctx,bl){
  ctx.save();
  if(bl.type==='lob'){
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(bl.tx,bl.ty,bl.splash*0.5,bl.splash*0.22,0,0,TAU); ctx.fill();
    const prog=bl.maxDist?clamp(bl.traveled/bl.maxDist,0,1):0; const lift=Math.sin(prog*Math.PI)*40;
    ctx.fillStyle=bl.color; ctx.shadowColor=bl.color; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(bl.x,bl.y-lift,bl.r,0,TAU); ctx.fill();
  } else {
    ctx.shadowColor=bl.color; ctx.shadowBlur=bl.glow?16:8;
    ctx.fillStyle=bl.color;
    const ang=Math.atan2(bl.vy,bl.vx);
    ctx.translate(bl.x,bl.y); ctx.rotate(ang);
    rrp(ctx,-bl.r*1.6,-bl.r*0.6,bl.r*3.2,bl.r*1.2,bl.r*0.6); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(bl.r*0.6,0,bl.r*0.4,0,TAU); ctx.fill();
  }
  ctx.restore();
}
function drawUnit(ctx,u){
  const hidden = inBush(u.x,u.y) && !u.isPlayer;
  ctx.save();
  if(hidden) ctx.globalAlpha=0.28;
  if(u.hurtT>0){ ctx.globalAlpha*=0.6+Math.sin(G.time*50)*0.2; }
  // aura escudo
  if(u.shieldT>0&&u.shield>0){ ctx.strokeStyle='rgba(120,220,255,0.8)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(u.x,u.y,u.r+8,0,TAU); ctx.stroke(); }
  // protección de spawn
  if(u.spawnProt>0){ ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(u.x,u.y,u.r+6,0,TAU); ctx.stroke(); }
  drawBrawler(ctx,u.b,u.x,u.y,u.r,u.aim,{t:G.time,walk:u.walking});
  if(u.muzzle>0){ ctx.fillStyle='rgba(255,240,180,0.9)'; ctx.beginPath(); ctx.arc(u.x+Math.cos(u.aim)*u.r*1.5,u.y+Math.sin(u.aim)*u.r*1.5,u.r*0.6,0,TAU); ctx.fill(); }
  ctx.globalAlpha=1; ctx.restore();
  // barra vida + nombre
  if(!hidden){
    const bw=u.r*2.4, bx=u.x-bw/2, by=u.y-u.r-16;
    ctx.fillStyle='rgba(0,0,0,.55)'; rrp(ctx,bx,by,bw,6,3); ctx.fill();
    const ratio=clamp(u.hp/u.maxhp,0,1);
    ctx.fillStyle=u.team===0?(u.isPlayer?'#39d98a':'#49e0ff'):'#ff5277'; rrp(ctx,bx,by,bw*ratio,6,3); ctx.fill();
    if(u.gems>0){ ctx.fillStyle='#49e0ff'; ctx.font='800 11px system-ui'; ctx.textAlign='center'; ctx.fillText('💎'+u.gems,u.x,by-4); ctx.textAlign='left'; }
    // carga de super (jugador)
    if(u.isPlayer){ ctx.fillStyle='rgba(0,0,0,.5)'; rrp(ctx,bx,by+8,bw,4,2); ctx.fill(); ctx.fillStyle='#ffd24a'; rrp(ctx,bx,by+8,bw*u.superC,4,2); ctx.fill(); }
  }
}

/* ---------- HUD ---------- */
function drawHUD(ctx){
  const W=G.W,H=G.H, sa=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sa-t'))||8;
  ctx.save();
  ctx.font='800 15px system-ui'; ctx.textAlign='center';
  // marcador superior
  const topY=sa+24;
  if(G.mode==='gemas'){
    panel(ctx,W/2-70,topY-18,140,34);
    ctx.fillStyle='#49e0ff'; ctx.fillText('💎 '+G.score[0]+' / 10',W/2-38,topY+4);
    ctx.fillStyle='#ff5277'; ctx.fillText(G.score[1]+'',W/2+46,topY+4);
    if(G.gemCountdown>0){ ctx.fillStyle=G._gemLead===0?'#49e0ff':'#ff5277'; ctx.font='900 20px system-ui'; ctx.fillText(Math.ceil(12-G.gemCountdown)+'',W/2,topY+30); ctx.font='800 15px system-ui'; }
  } else if(G.mode==='safe'){
    panel(ctx,W/2-80,topY-18,160,30);
    ctx.fillStyle='#ff5277'; ctx.textAlign='left'; ctx.fillText('🧨 '+G.score[0],W/2-72,topY+3);
    ctx.fillStyle='#49e0ff'; ctx.textAlign='right'; ctx.fillText(G.score[1]+' 🛡️',W/2+72,topY+3); ctx.textAlign='center';
  } else if(G.mode==='duelo'){
    const alive=G.units.filter(u=>u.team!==0&&u.alive).length+1;
    panel(ctx,W/2-60,topY-18,120,30); ctx.fillStyle='#fff'; ctx.fillText('👥 Quedan '+alive,W/2,topY+3);
  } else if(G.mode==='oleadas'){
    panel(ctx,W/2-70,topY-18,140,30); ctx.fillStyle='#ffd24a'; ctx.fillText('🌊 Oleada '+G.wave,W/2,topY+3);
  }
  // timer
  if(G.timeLimit>0){ const left=Math.max(0,Math.ceil(G.timeLimit-G.matchTime)); const mm=Math.floor(left/60), ss=('0'+(left%60)).slice(-2);
    ctx.fillStyle=left<=15?'#ff5277':'#eaf0ff'; ctx.font='800 16px system-ui'; ctx.fillText(mm+':'+ss,W/2,topY+ (G.mode==='gemas'?50:22)); }
  ctx.textAlign='left';

  // joystick mover
  drawJoy(ctx,G.joyMove,'#49e0ff');
  drawJoy(ctx,G.joyAim,'#ffd24a');
  // zonas por defecto (guía)
  if(!G.joyMove.active){ ghostJoy(ctx,W*0.18,H-90,'#49e0ff'); }
  if(!G.joyAim.active){ ghostJoy(ctx,W-W*0.18,H-90,'#ffd24a'); }

  // botón super
  const sx=W-56, sy=H-180, p=G.player;
  if(p){
    ctx.beginPath(); ctx.arc(sx,sy,30,0,TAU);
    ctx.fillStyle=p.superC>=1?'rgba(255,210,74,0.95)':'rgba(40,46,90,0.8)'; ctx.fill();
    ctx.lineWidth=4; ctx.strokeStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(sx,sy,30,0,TAU); ctx.stroke();
    ctx.lineWidth=4; ctx.strokeStyle='#ffd24a'; ctx.beginPath(); ctx.arc(sx,sy,30,-Math.PI/2,-Math.PI/2+TAU*clamp(p.superC,0,1)); ctx.stroke();
    ctx.fillStyle=p.superC>=1?'#3a2300':'#9aa6d6'; ctx.font='900 22px system-ui'; ctx.textAlign='center'; ctx.fillText('⚡',sx,sy+8); ctx.textAlign='left';
  }
  // botón auto-fire
  const ax=W-56, ay=H-250;
  ctx.beginPath(); ctx.arc(ax,ay,22,0,TAU); ctx.fillStyle=G.input.auto?'rgba(57,217,138,0.9)':'rgba(40,46,90,0.8)'; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='700 11px system-ui'; ctx.textAlign='center'; ctx.fillText('AUTO',ax,ay+4); ctx.textAlign='left';
  ctx.restore();
}
function panel(ctx,x,y,w,h){ ctx.fillStyle='rgba(10,12,30,0.55)'; rrp(ctx,x,y,w,h,12); ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1; rrp(ctx,x,y,w,h,12); ctx.stroke(); }
function ghostJoy(ctx,x,y,c){ ctx.globalAlpha=0.25; ctx.strokeStyle=c; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(x,y,46,0,TAU); ctx.stroke(); ctx.fillStyle=c; ctx.beginPath(); ctx.arc(x,y,20,0,TAU); ctx.fill(); ctx.globalAlpha=1; }
function drawJoy(ctx,j,c){ if(!j.active) return; ctx.globalAlpha=0.5; ctx.strokeStyle=c; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(j.bx,j.by,46,0,TAU); ctx.stroke(); ctx.globalAlpha=0.9; ctx.fillStyle=c; ctx.beginPath(); ctx.arc(j.bx+j.x*46,j.by+j.y*46,22,0,TAU); ctx.fill(); ctx.globalAlpha=1; }

/* ---------- Entrada táctil ---------- */
function bindInput(){
  const cv=G.cv;
  const getPos=e=>{ const r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; };
  cv.addEventListener('pointerdown',e=>{ e.preventDefault(); cv.setPointerCapture(e.pointerId); const p=getPos(e); SFX.resume();
    // botón super
    if(dist2(p.x,p.y,G.W-56,G.H-180)<34*34){ G.input.superReq=true; return; }
    if(dist2(p.x,p.y,G.W-56,G.H-250)<26*26){ G.input.auto=!G.input.auto; SFX.tap(); return; }
    if(p.x<G.W/2){ G.joyMove.active=true; G.joyMove.id=e.pointerId; G.joyMove.bx=p.x; G.joyMove.by=p.y; G.joyMove.x=0; G.joyMove.y=0; }
    else { G.joyAim.active=true; G.joyAim.id=e.pointerId; G.joyAim.bx=p.x; G.joyAim.by=p.y; G.joyAim.x=0; G.joyAim.y=0; }
  });
  cv.addEventListener('pointermove',e=>{ const p=getPos(e);
    for(const j of [G.joyMove,G.joyAim]){ if(j.active&&j.id===e.pointerId){ let dx=p.x-j.bx,dy=p.y-j.by; const m=Math.hypot(dx,dy)||1; const cl=Math.min(m,46)/46; j.x=dx/m*cl; j.y=dy/m*cl; } }
  });
  const up=e=>{ for(const j of [G.joyMove,G.joyAim]){ if(j.active&&j.id===e.pointerId){ j.active=false; j.id=null; j.x=0; j.y=0; } } };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  document.addEventListener('gesturestart',e=>e.preventDefault());
}

/* ---------- API pública / test ---------- */
window.GAME={
  init(){ setupCanvas(); bindInput(); },
  start(mode,brawlerId,lvl,opts){ document.getElementById('battle').classList.remove('hidden'); startMatch(mode,brawlerId,lvl||1,opts); },
  onEnd(cb){ G.onEnd=cb; },
  quit(){ G.phase='idle'; document.getElementById('battle').classList.add('hidden'); },
  state(){ return { phase:G.phase, time:G.matchTime, score:G.score, wave:G.wave, kills:G.kills,
    playerHp:G.player?Math.round(G.player.hp):0, playerAlive:G.player?G.player.alive:false,
    superC:G.player?G.player.superC:0, enemies:G.units.filter(u=>u.team!==0&&u.alive).length,
    units:G.units.length, bullets:G.bullets.length, parts:G.parts.length, result:G.result }; },
  // test: mover (-1..1), apuntar+disparar, super
  setMove(x,y){ G.input.mx=x; G.input.my=y; },
  setAim(x,y,fire){ G.input.ax=x; G.input.ay=y; G.input.fire=!!fire; },
  setAuto(v){ G.input.auto=!!v; },
  tapSuper(){ G.input.superReq=true; },
  // test: avanza la simulación N segundos en pasos fijos (sin esperar rAF)
  testRun(sec,dt){ dt=dt||1/60; let n=Math.ceil(sec/dt); while(n-->0&&G.phase==='playing'){ update(dt); } return G.phase; },
  forcePlayerSuper(){ if(G.player) G.player.superC=1; },
  _G:G,
};
})();
