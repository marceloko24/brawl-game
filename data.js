/* ====== Datos del juego: luchadores, rarezas, cajas ====== */
const RAR = {
  com: { name:'Común',      color:'#8fa0c8', css:'r-com' },
  rar: { name:'Raro',       color:'#39d98a', css:'r-rar' },
  epi: { name:'Épico',      color:'#b06bff', css:'r-epi' },
  leg: { name:'Legendario', color:'#ffd24a', css:'r-leg' },
};

/* Cada luchador:
   weapon: shotgun | sniper | rapid | lob | dash | burst | dual | heavy
   super:  blast | pierce | spray | barrage | charge | shock | shield | slam
   pal: paleta de colores para el sprite dibujado en código  */
const BRAWLERS = [
  { id:'perdiga', name:'Perdiga', rar:'com', weapon:'shotgun', super:'blast',
    hp:3800, speed:150, range:290, dmg:360, reload:1.1, pellets:5, spread:0.46, bulletSpeed:560, shots:3,
    pal:{ body:'#ff6a3d', dark:'#c93f1c', light:'#ffb08c', eye:'#fff', trim:'#ffd24a' },
    desc:'Escopeta de corto alcance. Muy fuerte si te acercás.',
    superName:'Ráfaga Demoledora', superDesc:'Dispara una explosión que empuja a los enemigos hacia atrás.' },

  { id:'mirlo', name:'Mirlo', rar:'rar', weapon:'sniper', super:'pierce',
    hp:2600, speed:150, range:540, dmg:1120, reload:1.55, pellets:1, spread:0, bulletSpeed:900, shots:3,
    pal:{ body:'#4a9bff', dark:'#1e5ec9', light:'#aacfff', eye:'#fff', trim:'#eaf0ff' },
    desc:'Francotirador de largo alcance. Pega durísimo de lejos.',
    superName:'Bala Fantasma', superDesc:'Un disparo que atraviesa paredes y a todos los enemigos.' },

  { id:'chispa', name:'Chispa', rar:'com', weapon:'rapid', super:'spray',
    hp:3000, speed:170, range:340, dmg:150, reload:0.22, pellets:1, spread:0.07, bulletSpeed:720, shots:9,
    pal:{ body:'#ffd24a', dark:'#d69a16', light:'#fff0b0', eye:'#222', trim:'#ff6a3d' },
    desc:'Metralleta veloz. Muchas balas chiquitas sin parar.',
    superName:'Tormenta', superDesc:'Gira disparando balas en todas las direcciones.' },

  { id:'mortero', name:'Mortero', rar:'rar', weapon:'lob', super:'barrage',
    hp:3400, speed:140, range:380, dmg:520, reload:1.35, pellets:1, spread:0, bulletSpeed:360, shots:3, lob:true, splash:70,
    pal:{ body:'#39d98a', dark:'#189463', light:'#aef5cf', eye:'#123', trim:'#ffd24a' },
    desc:'Lanza bombas por encima de las paredes. Daño en área.',
    superName:'Lluvia de Fuego', superDesc:'Bombardea una zona grande con varias bombas.' },

  { id:'filo', name:'Filo', rar:'epi', weapon:'dash', super:'charge',
    hp:4200, speed:185, range:150, dmg:620, reload:0.5, pellets:3, spread:0.3, bulletSpeed:620, shots:4,
    pal:{ body:'#b06bff', dark:'#7b2fde', light:'#e3c6ff', eye:'#fff', trim:'#49e0ff' },
    desc:'Asesino rápido de cuchillas. Letal cuerpo a cuerpo.',
    superName:'Embestida', superDesc:'Se lanza hacia adelante cortando a todo lo que toca.' },

  { id:'eco', name:'Eco', rar:'epi', weapon:'burst', super:'shock',
    hp:3600, speed:155, range:300, dmg:300, reload:1.2, pellets:6, spread:6.28, bulletSpeed:520, shots:3,
    pal:{ body:'#49e0ff', dark:'#1aa6cf', light:'#c9f6ff', eye:'#083', trim:'#b06bff' },
    desc:'Dispara ondas en círculo a tu alrededor.',
    superName:'Onda Expansiva', superDesc:'Suelta un anillo gigante que daña y empuja a todos.' },

  { id:'gemela', name:'Gemela', rar:'rar', weapon:'dual', super:'shield',
    hp:3200, speed:165, range:380, dmg:280, reload:0.6, pellets:2, spread:0.12, bulletSpeed:700, shots:4,
    pal:{ body:'#ff5fd0', dark:'#c2199a', light:'#ffc4ef', eye:'#fff', trim:'#49e0ff' },
    desc:'Dos pistolas en paralelo. Equilibrada y versátil.',
    superName:'Escudo Espejo', superDesc:'Se cura y gana un escudo que absorbe daño un rato.' },

  { id:'bastion', name:'Bastión', rar:'leg', weapon:'heavy', super:'slam',
    hp:6200, speed:120, range:260, dmg:720, reload:1.4, pellets:1, spread:0, bulletSpeed:440, shots:1, big:true,
    pal:{ body:'#ffb039', dark:'#c97a12', light:'#ffe2a6', eye:'#222', trim:'#ff5277' },
    desc:'Tanque legendario. Mucha vida y golpes demoledores.',
    superName:'Pisotón', superDesc:'Salta y golpea el suelo: daño en área y se vuelve resistente.' },

  { id:'aguja', name:'Aguja', rar:'epi', weapon:'rapid', super:'spray',
    hp:2400, speed:180, range:430, dmg:210, reload:0.3, pellets:1, spread:0.03, bulletSpeed:820, shots:7,
    pal:{ body:'#c9d2ff', dark:'#7a85c8', light:'#ffffff', eye:'#225', trim:'#4a9bff' },
    desc:'Agujas de precisión a media distancia. Frágil pero certera.',
    superName:'Lluvia de Agujas', superDesc:'Dispara un abanico cerrado de agujas rapidísimas.' },

  { id:'vulcano', name:'Vulcano', rar:'leg', weapon:'lob', super:'barrage',
    hp:4600, speed:135, range:410, dmg:640, reload:1.5, pellets:1, spread:0, bulletSpeed:340, shots:2, lob:true, splash:90,
    pal:{ body:'#ff5277', dark:'#c41d44', light:'#ffb9c8', eye:'#fff', trim:'#ffd24a' },
    desc:'Legendario de lava. Bombas enormes que incendian el área.',
    superName:'Erupción', superDesc:'Hace brotar un volcán de lava que daña sin parar un momento.' },
];
const BRAWLER_MAP = Object.fromEntries(BRAWLERS.map(b=>[b.id,b]));

const BOXES = [
  { id:'wood', name:'Caja de Madera', emoji:'🎁', css:'bc-wood', cost:0,
    desc:'Siempre gratis. Un luchador al azar.', odds:{com:70,rar:24,epi:5,leg:1} },
  { id:'big', name:'Caja Grande', emoji:'📦', css:'bc-big', cost:0,
    desc:'Gratis para vos. Mejores chances.', odds:{com:45,rar:38,epi:14,leg:3} },
  { id:'mega', name:'Mega Caja', emoji:'🧰', css:'bc-mega', cost:0,
    desc:'Gratis. Altas chances de épico.', odds:{com:20,rar:40,epi:32,leg:8} },
  { id:'leg', name:'Caja Legendaria', emoji:'🏆', css:'bc-leg', cost:0,
    desc:'Gratis. ¡La mejor chance de legendario!', odds:{com:0,rar:28,epi:46,leg:26} },
];

const MODES = [
  { id:'gemas',  name:'Atrapagemas',       emoji:'💎', css:'mc-gem',  desc:'Junta 10 gemas y aguantá la cuenta regresiva. 3 vs 3.' },
  { id:'safe',   name:'Revienta Cajas',    emoji:'🧨', css:'mc-safe', desc:'Destruí la caja fuerte del rival antes que la tuya.' },
  { id:'duelo',  name:'Todos contra Todos',emoji:'⚔️', css:'mc-dm',   desc:'El último en pie gana. Vos contra 4 bots.' },
  { id:'oleadas',name:'Supervivencia',     emoji:'🌊', css:'mc-surv', desc:'Aguantá oleadas de enemigos cada vez más duras.' },
];
