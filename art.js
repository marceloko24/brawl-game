/* ====== Arte: sprites de luchadores dibujados en código ====== */
function rr(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}

/* Dibuja un arma simple según el tipo, orientada por 'aim' (radianes).
   Se llama en el espacio ya trasladado al centro del luchador. */
function drawWeapon(ctx,b,R,aim){
  const p=b.pal;
  ctx.save();
  ctx.rotate(aim);
  ctx.translate(R*0.55,0);
  ctx.lineCap='round';
  const metal='#2b2f45', metalL='#555b7e';
  const w=b.weapon;
  if(w==='sniper'){
    ctx.fillStyle=metal; rr(ctx,-R*0.1,-R*0.11,R*1.15,R*0.22,R*0.08); ctx.fill();
    ctx.fillStyle=metalL; rr(ctx,R*0.55,-R*0.06,R*0.55,R*0.12,R*0.05); ctx.fill();
    ctx.fillStyle=p.trim; ctx.beginPath(); ctx.arc(R*0.15,0,R*0.12,0,7); ctx.fill();
  } else if(w==='shotgun'){
    ctx.fillStyle=metal; rr(ctx,-R*0.05,-R*0.19,R*0.8,R*0.38,R*0.1); ctx.fill();
    ctx.fillStyle='#14161f'; rr(ctx,R*0.55,-R*0.15,R*0.22,R*0.13,R*0.05); ctx.fill();
    rr(ctx,R*0.55,R*0.02,R*0.22,R*0.13,R*0.05); ctx.fill();
  } else if(w==='lob'){
    ctx.fillStyle=metal; rr(ctx,-R*0.12,-R*0.18,R*0.7,R*0.36,R*0.12); ctx.fill();
    ctx.fillStyle=p.trim; ctx.beginPath(); ctx.arc(R*0.52,0,R*0.17,0,7); ctx.fill();
    ctx.fillStyle='#14161f'; ctx.beginPath(); ctx.arc(R*0.52,0,R*0.1,0,7); ctx.fill();
  } else if(w==='dash'){
    ctx.fillStyle=p.light; ctx.beginPath();
    ctx.moveTo(-R*0.1,-R*0.2); ctx.lineTo(R*0.95,0); ctx.lineTo(-R*0.1,R*0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle=p.trim; ctx.beginPath();
    ctx.moveTo(R*0.2,-R*0.1); ctx.lineTo(R*0.95,0); ctx.lineTo(R*0.2,R*0.1); ctx.closePath(); ctx.fill();
  } else if(w==='burst'){
    ctx.strokeStyle=p.trim; ctx.lineWidth=R*0.09;
    ctx.beginPath(); ctx.arc(0,0,R*0.75,-0.7,0.7); ctx.stroke();
    ctx.fillStyle=metal; rr(ctx,0,-R*0.1,R*0.55,R*0.2,R*0.08); ctx.fill();
  } else if(w==='dual'){
    ctx.fillStyle=metal;
    rr(ctx,0,-R*0.26,R*0.62,R*0.15,R*0.06); ctx.fill();
    rr(ctx,0, R*0.11,R*0.62,R*0.15,R*0.06); ctx.fill();
  } else if(w==='heavy'){
    ctx.fillStyle=metal; rr(ctx,-R*0.1,-R*0.26,R*1.0,R*0.52,R*0.14); ctx.fill();
    ctx.fillStyle=metalL; rr(ctx,R*0.6,-R*0.2,R*0.4,R*0.4,R*0.1); ctx.fill();
    ctx.fillStyle='#14161f'; ctx.beginPath(); ctx.arc(R*1.0,0,R*0.14,0,7); ctx.fill();
  } else { /* rapid */
    ctx.fillStyle=metal; rr(ctx,-R*0.05,-R*0.13,R*0.9,R*0.26,R*0.08); ctx.fill();
    ctx.fillStyle=metalL; rr(ctx,R*0.3,-R*0.07,R*0.5,R*0.05,R*0.02); ctx.fill();
  }
  ctx.restore();
}

/* Dibuja el luchador completo centrado en (x,y). R = radio visual. */
function drawBrawler(ctx,b,x,y,R,aim,opt={}){
  const p=b.pal, t=opt.t||0, walk=opt.walk||0;
  ctx.save();
  ctx.translate(x,y);

  // sombra
  ctx.save();
  ctx.scale(1,0.42); ctx.translate(0,R*1.15/0.42);
  ctx.fillStyle='rgba(0,0,0,0.33)';
  ctx.beginPath(); ctx.arc(0,0,R*0.92,0,7); ctx.fill();
  ctx.restore();

  // bamboleo al caminar
  const bob = walk ? Math.sin(t*14)*R*0.06 : Math.sin(t*3)*R*0.02;
  ctx.translate(0,bob);

  // arma detrás/al costado
  drawWeapon(ctx,b,R,aim);

  // pies
  ctx.fillStyle=p.dark;
  const ft = walk ? Math.sin(t*14)*R*0.18 : 0;
  ctx.beginPath(); ctx.ellipse(-R*0.34,R*0.92+ft,R*0.26,R*0.2,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(R*0.34,R*0.92-ft,R*0.26,R*0.2,0,0,7); ctx.fill();

  // cuerpo con gradiente
  const g=ctx.createRadialGradient(-R*0.3,-R*0.45,R*0.1,0,0,R*1.25);
  g.addColorStop(0,p.light); g.addColorStop(0.45,p.body); g.addColorStop(1,p.dark);
  ctx.fillStyle=g;
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=R*0.09;
  const bw = b.weapon==='heavy'?1.08:0.92;
  ctx.beginPath(); ctx.ellipse(0,R*0.1,R*bw,R*0.98,0,0,7); ctx.fill(); ctx.stroke();

  // brillo superior
  ctx.fillStyle='rgba(255,255,255,0.22)';
  ctx.beginPath(); ctx.ellipse(-R*0.28,-R*0.4,R*0.42,R*0.26,-0.5,0,7); ctx.fill();

  // banda / detalle de color (trim), recortada al cuerpo
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0,R*0.1,R*bw,R*0.98,0,0,7); ctx.clip();
  ctx.fillStyle=p.trim;
  rr(ctx,-R*bw,R*0.36,R*bw*2,R*0.22,R*0.06); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.12)';
  rr(ctx,-R*bw,R*0.36,R*bw*2,R*0.06,R*0.03); ctx.fill();
  ctx.restore();

  // casco / detalle por rareza (corona para legendario)
  if(b.rar==='leg'){
    ctx.fillStyle='#ffd24a';
    ctx.beginPath();
    const cy=-R*0.78;
    ctx.moveTo(-R*0.4,cy); ctx.lineTo(-R*0.4,cy-R*0.34); ctx.lineTo(-R*0.18,cy-R*0.08);
    ctx.lineTo(0,cy-R*0.42); ctx.lineTo(R*0.18,cy-R*0.08); ctx.lineTo(R*0.4,cy-R*0.34);
    ctx.lineTo(R*0.4,cy); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(180,120,0,.6)'; ctx.lineWidth=R*0.04; ctx.stroke();
  }

  // ojos (grandes y expresivos)
  const look = Math.cos(aim)*R*0.08, looky=Math.sin(aim)*R*0.05;
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.ellipse(-R*0.26,-R*0.18,R*0.2,R*0.24,0,0,7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(R*0.26,-R*0.18,R*0.2,R*0.24,0,0,7); ctx.fill();
  ctx.fillStyle=p.eye==='#fff'?'#1a1d2e':p.eye;
  ctx.beginPath(); ctx.arc(-R*0.26+look,-R*0.16+looky,R*0.1,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(R*0.26+look,-R*0.16+looky,R*0.1,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(-R*0.22+look,-R*0.2+looky,R*0.035,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(R*0.30+look,-R*0.2+looky,R*0.035,0,7); ctx.fill();

  ctx.restore();
}

/* Rellena un <canvas> de menú con el retrato del luchador. */
function renderPortrait(canvas,b,aim=-Math.PI/2){
  const ctx=canvas.getContext('2d');
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const cssW=canvas.clientWidth||90, cssH=canvas.clientHeight||90;
  canvas.width=cssW*dpr; canvas.height=cssH*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,cssW,cssH);
  const R=Math.min(cssW,cssH)*0.3;
  drawBrawler(ctx,b,cssW/2,cssH/2-R*0.1,R,aim,{t:0.2});
}
