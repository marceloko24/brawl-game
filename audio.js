/* ====== Audio simple con WebAudio ====== */
const SFX = (()=>{
  let ac=null, master=null, muted=false;
  function ensure(){
    if(ac) return ac;
    try{
      ac=new (window.AudioContext||window.webkitAudioContext)();
      master=ac.createGain(); master.gain.value=0.25; master.connect(ac.destination);
    }catch(e){ ac=null; }
    return ac;
  }
  function tone(freq,dur,type='square',vol=1,slideTo=null){
    if(muted) return; const c=ensure(); if(!c) return;
    try{
      if(c.state==='suspended'){ try{ const pr=c.resume(); if(pr&&pr.catch) pr.catch(()=>{}); }catch(e){} }
      const o=c.createOscillator(), g=c.createGain();
      o.type=type; o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40,slideTo),c.currentTime+dur);
      g.gain.setValueAtTime(0.0001,c.currentTime);
      g.gain.exponentialRampToValueAtTime(vol,c.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur);
      o.connect(g); g.connect(master); o.start(); o.stop(c.currentTime+dur+0.02);
    }catch(e){}
  }
  function noise(dur,vol=1){
    if(muted) return; const c=ensure(); if(!c) return;
    try{
      const n=c.sampleRate*dur, buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
      const s=c.createBufferSource(); s.buffer=buf;
      const g=c.createGain(); g.gain.value=vol;
      s.connect(g); g.connect(master); s.start();
    }catch(e){}
  }
  return {
    shoot(w){ const m={sniper:[520,0.12],shotgun:[200,0.1],rapid:[640,0.05],lob:[320,0.14],dash:[760,0.08],burst:[420,0.1],dual:[560,0.06],heavy:[150,0.16]}[w]||[500,0.08];
      tone(m[0],m[1],'square',0.5,m[0]*0.6); },
    hit(){ tone(220,0.08,'sawtooth',0.4,120); },
    hurt(){ tone(160,0.12,'sawtooth',0.5,90); },
    super(){ tone(300,0.3,'sawtooth',0.6,900); noise(0.2,0.3); },
    die(){ tone(400,0.4,'square',0.5,80); },
    pick(){ tone(880,0.1,'sine',0.5,1400); },
    win(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.25,'triangle',0.5),i*140)); },
    lose(){ [392,330,262].forEach((f,i)=>setTimeout(()=>tone(f,0.3,'triangle',0.5),i*180)); },
    box(){ [523,659,784,988,1318].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'triangle',0.5),i*90)); },
    tap(){ tone(660,0.04,'sine',0.3); },
    setMuted(v){ muted=v; }, isMuted(){ return muted; },
    resume(){ try{ const c=ensure(); if(c&&c.state==='suspended'){ const pr=c.resume(); if(pr&&pr.catch) pr.catch(()=>{}); } }catch(e){} }
  };
})();
