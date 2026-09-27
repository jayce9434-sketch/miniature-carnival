(()=>{"use strict";
const C=document.getElementById("game"),X=C.getContext("2d"),$=id=>document.getElementById(id);
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t,dd=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const isMobile=(navigator.maxTouchPoints||0)>0 || ("ontouchstart" in window) || matchMedia("(pointer:coarse)").matches;

const DEFAULT_SETTINGS={master:100,music:100,sfx:100,shake:100,damageNumbers:true};
function storageGet(key){try{return window.localStorage?localStorage.getItem(key):null}catch{return null}}
function storageSet(key,value){try{if(window.localStorage)localStorage.setItem(key,value);return true}catch{return false}}
function loadSettings(){try{return {...DEFAULT_SETTINGS,...JSON.parse(storageGet("bfrSettings")||"{}")}}catch{return {...DEFAULT_SETTINGS}}}
let SETTINGS=loadSettings();
function saveSettings(){storageSet("bfrSettings",JSON.stringify(SETTINGS))}

const AUDIO={
 ctx:null,master:null,music:null,sfx:null,limiter:null,musicTimer:null,musicStep:0,musicMode:"lobby",started:false,
 ensure(){
  try{
   if(this.ctx){if(this.ctx.state==="suspended")this.ctx.resume().catch(()=>{});return this.ctx}
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
   const a=this.ctx=new AC();
  this.master=a.createGain();this.music=a.createGain();this.sfx=a.createGain();this.limiter=a.createDynamicsCompressor();
  this.limiter.threshold.value=-10;this.limiter.knee.value=4;this.limiter.ratio.value=20;this.limiter.attack.value=.003;this.limiter.release.value=.18;
  this.music.connect(this.master);this.sfx.connect(this.master);this.master.connect(this.limiter);this.limiter.connect(a.destination);
   this.apply();return a
  }catch{return null}
 },
 apply(){
  if(!this.ctx)return;
  // Individual sliders are true 0-20x boosts. The limiter catches clipping at extreme combinations.
  this.master.gain.setTargetAtTime(SETTINGS.master/100,this.ctx.currentTime,.015);
  this.music.gain.setTargetAtTime(.035*(SETTINGS.music/100),this.ctx.currentTime,.02);
  this.sfx.gain.setTargetAtTime(.16*(SETTINGS.sfx/100),this.ctx.currentTime,.015);
 },
 tone(freq,dur=.07,type="square",vol=.16,when=0,detune=0,bus="sfx"){
  const a=this.ensure();if(!a||SETTINGS.master<=0)return;
  const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+when;
  o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),t);o.detune.value=detune;
  g.gain.setValueAtTime(Math.max(.0001,vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(bus==="music"?this.music:this.sfx);o.start(t);o.stop(t+dur+.01)
 },
 noise(dur=.08,vol=.08,when=0,bus="sfx"){
  const a=this.ensure();if(!a)return;const n=Math.max(1,Math.floor(a.sampleRate*dur)),buf=a.createBuffer(1,n,a.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const s=a.createBufferSource(),g=a.createGain(),t=a.currentTime+when;s.buffer=buf;g.gain.value=vol;s.connect(g);g.connect(bus==="music"?this.music:this.sfx);s.start(t)
 },
 ui(){this.tone(620,.045,"square",.07);this.tone(820,.04,"square",.045,.035)},
 shot(kind){
  if(kind==="sniper"){this.tone(96,.11,"sawtooth",.18);this.noise(.08,.14)}
  else if(kind==="rail"){this.tone(410,.12,"sawtooth",.12);this.tone(102,.18,"sine",.16,.02)}
  else if(kind==="rocket"){this.tone(72,.13,"square",.18);this.noise(.14,.2)}
  else if(kind==="minigun"){this.tone(145,.035,"square",.07);this.noise(.026,.035)}
  else if(kind==="shotgun"){this.tone(88,.08,"square",.16);this.noise(.1,.19)}
  else {this.tone(165,.045,"square",.1);this.noise(.035,.055)}
 },
 hit(){this.tone(118,.035,"square",.055)},
 hurt(){this.tone(76,.085,"sawtooth",.09)},
 kill(){this.tone(360,.05,"square",.055);this.tone(510,.07,"square",.05,.04)},
 death(){this.tone(140,.12,"sawtooth",.1);this.tone(78,.28,"sawtooth",.1,.09)},
 reload(){this.tone(330,.035,"square",.05);this.tone(470,.03,"square",.04,.12)},
 ability(){this.tone(250,.06,"sawtooth",.08);this.tone(500,.09,"sine",.07,.045)},
 wave(){this.tone(220,.08,"square",.06);this.tone(330,.08,"square",.06,.08);this.tone(440,.12,"square",.065,.16)},
 boss(){this.tone(70,.35,"sawtooth",.11);this.tone(105,.3,"square",.06,.07)},
 setMusic(mode){
  this.ensure();if(this.musicMode===mode&&this.musicTimer)return;this.musicMode=mode;this.musicStep=0;
  if(this.musicTimer)clearInterval(this.musicTimer);this.musicTimer=setInterval(()=>this.musicTick(),180)
 },
 musicTick(){
  if(!this.ctx||SETTINGS.music<=0||SETTINGS.master<=0)return;
  const boss=this.musicMode==="boss",battle=this.musicMode==="battle",weird=this.musicMode==="weird";
  const seq=weird?[0,1,8,-3,5,2,11,-1]:boss?[0,0,3,1,0,5,3,6]:battle?[0,3,5,3,6,5,3,1]:[0,5,3,6,0,3,1,5];
  const base=weird?47:boss?55:battle?73:65.41,step=this.musicStep++;
  if(step%2===0){let f=base*Math.pow(2,seq[(step/2)%seq.length]/12);this.tone(f,boss?.24:.32,"triangle",boss?.16:.08,0,0,"music")}
  if(step%8===0)this.tone(base/2,boss?.55:.7,"sine",boss?.14:.07,0,0,"music");
  if(battle&&step%4===0)this.noise(.028,.018,0,"music");
  if(boss&&step%4===2)this.tone(base*2,.055,"square",.035,0,0,"music");if(weird&&step%3===0){this.tone(base*rand(.7,2.1),.09,"sawtooth",.04,0,rand(-900,900),"music");this.noise(.05,.012,0,"music")}
 },
 stopMusic(){if(this.musicTimer){clearInterval(this.musicTimer);this.musicTimer=null}},
 preview(){this.ensure();this.ui();this.tone(220,.12,"triangle",.1,.08);this.tone(330,.12,"triangle",.1,.16);this.tone(440,.18,"triangle",.1,.24)}
};


function showRuntimeProblem(msg){
 try{
  const e=$("waveBanner");if(e){e.textContent="ERROR • "+String(msg).slice(0,120);e.classList.add("show");e.style.color="#ff8b8b"}
  const lobby=$("lobby");if(lobby&&lobby.classList.contains("hidden")&&!G){lobby.classList.remove("hidden");$("hud")?.classList.add("hidden");$("mobile")?.classList.add("hidden")}
 }catch{}
}
window.addEventListener("error",e=>showRuntimeProblem(e.message||"runtime error"));
window.addEventListener("unhandledrejection",e=>showRuntimeProblem(e.reason?.message||e.reason||"promise error"));

let DPR=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;
function resize(){W=innerWidth;H=innerHeight;C.width=W*DPR;C.height=H*DPR;C.style.width=W+"px";C.style.height=H+"px";X.setTransform(DPR,0,0,DPR,0,0)}resize();addEventListener("resize",resize);

const TODAY=new Date(),HALLOWEEN=TODAY>=new Date("2026-09-25")&&TODAY<new Date("2026-11-02"),FALL=TODAY>=new Date("2026-09-22")&&TODAY<new Date("2026-12-02");
const COLORS={tower:"#55a7ff",zombie:"#72b653",king:"#e3b24d",lord:"#9e63d2",void:"#c5476d"};
const WORLD={w:2600,h:1700};

const towerClasses=[
 {id:"scout",name:"Scout",icon:"S",lvl:1,c:"#58a8ff",hp:125,speed:280,gun:"rifle",dmg:22,rate:.14,mag:30,reload:1.35,range:800,cost:0,wave:0,upgradeBase:250,q:"DASH",e:"BURST FIRE",desc:"Free starter • single-target pistol Tower."},
 {id:"sniper",name:"Sniper",icon:"N",lvl:1,c:"#7fc2ff",hp:100,speed:235,gun:"sniper",dmg:115,rate:.82,mag:6,reload:1.8,range:1350,cost:450,wave:0,upgradeBase:420,q:"ROLL",e:"DEADEYE",desc:"$450 • long-range precision."},
 {id:"fragger",name:"Fragger",icon:"F",lvl:1,c:"#da8663",hp:150,speed:235,gun:"rocket",dmg:58,rate:.72,mag:7,reload:1.7,range:650,cost:0,wave:0,upgradeBase:300,q:"TOSS",e:"GRENADE RAIN",desc:"Free • splash-damage grenadier."},
 {id:"shotgunner",name:"Shotgunner",icon:"SG",lvl:1,c:"#d9a25c",hp:220,speed:220,gun:"shotgun",dmg:17,rate:.6,mag:8,reload:1.7,range:430,cost:400,wave:0,upgradeBase:380,q:"SHOVE",e:"BUCKSHOT",desc:"$400 • close-range burst damage."},
 {id:"cryo",name:"Cryo-Gunner",icon:"CG",lvl:1,c:"#8de5ff",hp:175,speed:220,gun:"beam",dmg:16,rate:.09,mag:75,reload:1.8,range:680,cost:0,wave:0,upgradeBase:360,q:"ICE STEP",e:"FREEZE CORE",desc:"Free • slowing support damage."},
 {id:"enforcer",name:"Enforcer",icon:"E",lvl:1,c:"#e7b566",hp:260,speed:210,gun:"shotgun",dmg:15,rate:.7,mag:8,reload:1.75,range:400,cost:0,wave:0,upgradeBase:420,q:"SHOVE",e:"ARMOR UP",desc:"Free • durable support Tower."},
 {id:"soldier",name:"Soldier",icon:"SO",lvl:1,c:"#6ab0ed",hp:150,speed:245,gun:"rifle",dmg:20,rate:.12,mag:36,reload:1.35,range:800,cost:200,wave:0,upgradeBase:320,q:"ROLL",e:"MAG DUMP",desc:"$200 • burst rifle Tower."},
 {id:"tuber",name:"Tuber",icon:"T",lvl:1,c:"#f28c52",hp:150,speed:220,gun:"rocket",dmg:94,rate:1.05,mag:5,reload:2.1,range:900,cost:600,wave:3,upgradeBase:520,q:"BACKBLAST",e:"BARRAGE",desc:"$600 • Wave 3 • rocket splash."},
 {id:"mercenary",name:"Mercenary",icon:"MC",lvl:1,c:"#64ba77",hp:190,speed:245,gun:"rifle",dmg:28,rate:.105,mag:42,reload:1.4,range:860,cost:700,wave:3,upgradeBase:550,q:"TACTICAL ROLL",e:"LMG MODE",desc:"$700 • Wave 3 • flexible rifleman."},
 {id:"barracks",name:"Barracks",icon:"B",lvl:1,c:"#8bb9d8",hp:210,speed:205,gun:"rifle",dmg:21,rate:.1,mag:48,reload:1.45,range:780,cost:600,wave:4,upgradeBase:560,q:"RALLY",e:"SQUAD FIRE",desc:"$600 • Wave 4 • burst Tower."},
 {id:"doctor",name:"Doctor",icon:"+",lvl:1,c:"#7ce3c2",hp:150,speed:250,gun:"rifle",dmg:19,rate:.15,mag:32,reload:1.25,range:720,cost:900,wave:4,upgradeBase:600,q:"MEDKIT",e:"TEAM HEAL",desc:"$900 • Wave 4 • healing support."},
 {id:"marksman",name:"Marksman",icon:"MK",lvl:1,c:"#adc5e0",hp:125,speed:238,gun:"sniper",dmg:88,rate:.42,mag:10,reload:1.7,range:1150,cost:800,wave:4,upgradeBase:620,q:"ROLL",e:"MARK TARGET",desc:"$800 • Wave 4 • fast precision."},
 {id:"patrol",name:"Patrol",icon:"PT",lvl:1,c:"#57a88a",hp:280,speed:270,gun:"minigun",dmg:9,rate:.075,mag:120,reload:2.2,range:700,cost:1200,wave:6,upgradeBase:800,q:"RAM",e:"MACHINE GUN",desc:"Vehicle Tower • mobile gun platform."},
 {id:"aviator",name:"Aviator",icon:"AV",lvl:1,c:"#89cfea",hp:190,speed:300,gun:"minigun",dmg:10,rate:.07,mag:110,reload:2,range:880,cost:1400,wave:8,upgradeBase:900,q:"BOOST",e:"STRAFE",desc:"Fast aerial-style machine gun Tower."},
 {id:"flamethrower",name:"Flamethrower",icon:"FL",lvl:1,c:"#ff7445",hp:210,speed:215,gun:"beam",dmg:24,rate:.08,mag:90,reload:2,range:480,cost:1300,wave:8,upgradeBase:850,q:"FIRE STEP",e:"INFERNO",desc:"Close-range flame support."},
 {id:"mortar",name:"Mortar",icon:"MO",lvl:1,c:"#bc9b6c",hp:130,speed:200,gun:"rocket",dmg:120,rate:1.25,mag:4,reload:2.3,range:1150,cost:1600,wave:10,upgradeBase:1000,q:"REPOSITION",e:"SHELL STORM",desc:"Long-range splash artillery."},
 {id:"commando",name:"Commando",icon:"C",lvl:1,c:"#65d68e",hp:220,speed:225,gun:"minigun",dmg:13,rate:.06,mag:130,reload:2.25,range:760,cost:1800,wave:12,upgradeBase:1150,q:"SPIN-UP",e:"OVERDRIVE",desc:"High sustained DPS."},
 {id:"rail",name:"Railgunner",icon:"R",lvl:1,c:"#c98cff",hp:125,speed:220,gun:"rail",dmg:180,rate:.92,mag:4,reload:2,range:1450,cost:2200,wave:14,upgradeBase:1400,q:"BLINK",e:"PIERCE",desc:"Heavy single-shot rail damage."},
 {id:"plasma",name:"Plasma Trooper",icon:"PL",lvl:1,c:"#64f3ff",hp:165,speed:230,gun:"beam",dmg:24,rate:.07,mag:100,reload:2,range:900,cost:2400,wave:14,upgradeBase:1450,q:"PHASE",e:"PLASMA CORE",desc:"Lock-on energy Tower."},
 {id:"phaser",name:"Phaser",icon:"P",lvl:1,c:"#ff6ee7",hp:150,speed:225,gun:"beam",dmg:27,rate:.065,mag:105,reload:2,range:950,cost:2600,wave:15,upgradeBase:1550,q:"PHASE",e:"BEAM CORE",desc:"High-tier lock-on Tower."},
 {id:"zed",name:"Zed",icon:"Z",lvl:250,c:"#50ddd3",hp:360,speed:260,gun:"ram",dmg:85,rate:.48,mag:999,reload:0,range:115,cost:5800,wave:16,upgradeBase:2200,q:"BOOST",e:"ROADKILL",desc:"Level 250 • Wave 16 • armored vehicle."},
 {id:"tweeter",name:"Tweeter",icon:"TW",lvl:500,c:"#78c7ff",hp:160,speed:255,gun:"rifle",dmg:34,rate:.1,mag:38,reload:1.2,range:850,cost:1300,wave:8,upgradeBase:900,q:"TWEET",e:"DUAL DEAGLES",desc:"Level 500 requirement Tower."},
 {id:"goldenscout",name:"Golden Scout",icon:"GS",lvl:750,c:"#ffd856",hp:190,speed:265,gun:"rifle",dmg:42,rate:.09,mag:45,reload:1.15,range:900,cost:2200,wave:12,upgradeBase:1500,q:"GOLD STEP",e:"DUAL GOLD",desc:"Level 750 reward Tower."},
 {id:"golden",name:"Golden Commando",icon:"GC",lvl:1500,c:"#ffd856",hp:250,speed:245,gun:"minigun",dmg:19,rate:.05,mag:160,reload:2.1,range:850,cost:4500,wave:16,upgradeBase:2400,q:"TACTICAL ROLL",e:"GOLD RUSH",desc:"Level 1500 reward Tower."},
 {id:"archer",name:"Archer",icon:"AR",lvl:2500,c:"#90d17b",hp:155,speed:250,gun:"sniper",dmg:155,rate:.58,mag:12,reload:1.6,range:1250,cost:2800,wave:14,upgradeBase:1800,q:"DODGE",e:"ARROW STORM",desc:"Level 2500 requirement Tower."},
 {id:"knifer",name:"Knifer",icon:"K",lvl:2500,c:"#d9d9df",hp:330,speed:295,gun:"ram",dmg:125,rate:.34,mag:999,reload:0,range:125,cost:2600,wave:14,upgradeBase:1700,q:"LUNGE",e:"BLADE FURY",desc:"Level 2500 melee Tower."},
 {id:"commander",name:"Commander",icon:"CM",lvl:5000,c:"#f5d15e",hp:210,speed:235,gun:"rifle",dmg:35,rate:.13,mag:40,reload:1.25,range:850,cost:5000,wave:18,upgradeBase:2500,q:"RALLY",e:"AIRSTRIKE",desc:"Level 5000 command/support Tower."},
 {id:"goldenzed",name:"Golden Zed",icon:"GZ",lvl:6000,c:"#ffe05c",hp:520,speed:275,gun:"minigun",dmg:21,rate:.05,mag:180,reload:2,range:840,cost:12000,wave:18,upgradeBase:4000,q:"GOLD BOOST",e:"MISSILE SALVO",desc:"Level 6000 vehicle reward."},
 {id:"engineer",name:"Engineer",icon:"EN",lvl:1,c:"#e2b864",hp:175,speed:235,gun:"rifle",dmg:26,rate:.11,mag:36,reload:1.3,range:780,cost:3200,wave:16,upgradeBase:1900,q:"MENDER",e:"SENTRY",desc:"Builder/support Tower."},
 {id:"hallowboomer",name:"Hallowboomer",icon:"HB",lvl:1,c:"#ff8b32",hp:190,speed:225,gun:"rocket",dmg:105,rate:.85,mag:7,reload:1.8,range:760,cost:2200,wave:8,upgradeBase:1350,q:"PUMPKIN HOP",e:"BOOMER RUSH",event:"halloween",desc:"Halloween event Tower."},
 {id:"scarecrowtower",name:"Scarecrow",icon:"SC",lvl:1,c:"#c7863f",hp:210,speed:225,gun:"rifle",dmg:32,rate:.12,mag:42,reload:1.35,range:820,cost:1900,wave:8,upgradeBase:1200,q:"CROW STEP",e:"HARVEST",event:"fall",desc:"Autumn event Tower."},
 {id:"vanguard",name:"Frontline Vanguard",icon:"V",lvl:0,c:"#7bbcff",hp:230,speed:250,gun:"rifle",dmg:38,rate:.1,mag:50,reload:1.15,range:900,cost:1600,wave:6,upgradeBase:1100,q:"BREACH",e:"VANGUARD",rewardMode:"classic",desc:"Classic victory Tower reward."},
 {id:"voidcaster",name:"Void Caster",icon:"VC",lvl:0,c:"#ad6dff",hp:210,speed:235,gun:"beam",dmg:31,rate:.06,mag:110,reload:1.9,range:950,cost:2600,wave:12,upgradeBase:1600,q:"DARK STEP",e:"VOID BEAM",rewardMode:"hard",desc:"Hardmode victory Tower reward."},
 {id:"pumpkinpaladin",name:"Pumpkin Paladin",icon:"🎃",lvl:0,c:"#ff9138",hp:280,speed:220,gun:"shotgun",dmg:22,rate:.5,mag:11,reload:1.6,range:480,cost:2000,wave:7,upgradeBase:1250,q:"LANTERN CHARGE",e:"PUMPKIN STORM",rewardMode:"halloween",event:"halloween",desc:"Halloween victory Tower reward."},
 {id:"autumnmarshal",name:"Autumn Marshal",icon:"🍂",lvl:0,c:"#d89a4c",hp:230,speed:255,gun:"rifle",dmg:40,rate:.1,mag:52,reload:1.1,range:920,cost:2000,wave:7,upgradeBase:1250,q:"GALE STEP",e:"HARVEST VOLLEY",rewardMode:"fall",event:"fall",desc:"Autumn victory Tower reward."},
 {id:"cursedranger",name:"Cursed Ranger",icon:"CR",lvl:0,c:"#ff65d5",hp:205,speed:255,gun:"rail",dmg:150,rate:.65,mag:8,reload:1.6,range:1200,cost:2500,wave:10,upgradeBase:1600,q:"SCRAMBLE",e:"RANDOMIZER",rewardMode:"cursed",desc:"Cursed victory Tower reward."}
];

const zombieClasses=[
 {id:"normal",name:"Normal",icon:"N",lvl:500,c:"#79b95e",hp:160,speed:245,dmg:30,rate:.55,q:"LUNGE",e:"RAGE",cost:0,wave:0,cooldown:0,desc:"Free starter Zombie."},
 {id:"speedy",name:"Speedy",icon:"S",lvl:500,c:"#a5d965",hp:120,speed:330,dmg:24,rate:.34,q:"SPRINT",e:"FRENZY",cost:0,wave:3,cooldown:0,desc:"Free at Wave 3."},
 {id:"slow",name:"Slow",icon:"SL",lvl:500,c:"#6f8b52",hp:430,speed:175,dmg:55,rate:.7,q:"SLAM",e:"FORTIFY",cost:0,wave:5,cooldown:0,desc:"Free at Wave 5."},
 {id:"hidden",name:"Hidden",icon:"H",lvl:500,c:"#58677b",hp:200,speed:275,dmg:39,rate:.45,q:"VANISH",e:"AMBUSH",cost:150,wave:7,cooldown:8,desc:"$150 • Wave 7."},
 {id:"boss1",name:"Boss1",icon:"1",lvl:500,c:"#4f8250",hp:1200,speed:195,dmg:75,rate:.65,q:"PUNCH",e:"STOMP",cost:150,wave:9,cooldown:10,tier:"BOSS",style:"boss1",desc:"$150 • Wave 9 • first Boss family Zombie."},
 {id:"mystery",name:"Mystery",icon:"?",lvl:500,c:"#747474",hp:380,speed:215,dmg:45,rate:.56,q:"ROLL",e:"RANDOM SPAWN",cost:80,wave:13,cooldown:8,desc:"$80 • Wave 13."},
 {id:"slime",name:"Slime",icon:"SLM",lvl:500,c:"#63d968",hp:1100,speed:195,dmg:68,rate:.62,q:"GOO",e:"SPLIT",cost:700,wave:14,cooldown:15,desc:"$700 • Wave 14."},
 {id:"superslow",name:"Super Slow",icon:"SS",lvl:500,c:"#4f6942",hp:1800,speed:145,dmg:85,rate:.8,q:"HEAVY SLAM",e:"IRON HIDE",cost:500,wave:16,cooldown:15,tier:"BOSS",style:"boss2",desc:"$500 • Wave 16."},
 {id:"boss2",name:"Boss2",icon:"2",lvl:500,c:"#456b45",hp:2800,speed:185,dmg:105,rate:.72,q:"CHARGE",e:"STOMP",cost:600,wave:18,cooldown:12,tier:"BOSS",style:"boss2",desc:"$600 • Wave 18."},
 {id:"lava",name:"Lava",icon:"LV",lvl:500,c:"#ec6d35",hp:900,speed:220,dmg:65,rate:.52,q:"BURN",e:"LAVA RUSH",cost:0,wave:18,cooldown:0,desc:"Free • Wave 18."},
 {id:"toxic",name:"Toxic",icon:"TX",lvl:500,c:"#8cdf45",hp:850,speed:235,dmg:62,rate:.5,q:"TOXIC STEP",e:"CLOUD",cost:200,wave:20,cooldown:8,desc:"Toxic late-mid Zombie."},
 {id:"necro",name:"Necromancer",icon:"☠",lvl:750,c:"#75599d",hp:1200,speed:220,dmg:80,rate:.62,q:"SUMMON",e:"DARK PULSE",cost:4500,wave:20,cooldown:15,tier:"BOSS",style:"necro",desc:"Level 750 • $4,500 • Wave 20."},
 {id:"lightning",name:"Lightning",icon:"⚡",lvl:500,c:"#e8dd57",hp:620,speed:370,dmg:52,rate:.3,q:"ZIP",e:"CHAIN",cost:120,wave:22,cooldown:7,desc:"$120 • Wave 22."},
 {id:"hiddenboss",name:"Hidden Boss",icon:"HB",lvl:500,c:"#4d576d",hp:4200,speed:245,dmg:130,rate:.48,q:"VANISH",e:"AMBUSH",cost:800,wave:24,cooldown:15,tier:"BOSS",style:"hiddenboss",desc:"$800 • Wave 24."},
 {id:"mystery2",name:"Mystery2",icon:"?2",lvl:500,c:"#9a7fa8",hp:1500,speed:235,dmg:85,rate:.5,q:"SCRAMBLE",e:"SPAWN",cost:400,wave:27,cooldown:10,desc:"$400 • Wave 27."},
 {id:"boss3",name:"Boss3",icon:"3",lvl:500,c:"#d4aa43",hp:10000,speed:275,dmg:180,rate:.44,q:"RUSH",e:"SUPPORTER",cost:1200,wave:30,cooldown:50,tier:"BOSS",style:"boss3",desc:"$1,200 • Wave 30 • fast Boss family Zombie."},
 {id:"boss4",name:"Boss4",icon:"4",lvl:500,c:"#385c3e",hp:20000,speed:210,dmg:230,rate:.55,q:"PUNCH",e:"YELL",cost:2500,wave:34,cooldown:14,tier:"BOSS",style:"boss4",desc:"$2,500 • Wave 34 • armored Boss family Zombie."},
 {id:"boss5",name:"Boss5",icon:"5",lvl:1500,c:"#283653",hp:40000,speed:275,dmg:300,rate:.5,q:"PUNCH",e:"RAGE",cost:5000,wave:35,cooldown:10,cooldownGroup:"prototype",tier:"BOSS",style:"boss5",desc:"Level 1500 • $5,000 • Wave 35."},
 {id:"necroboss",name:"Necromancer Boss",icon:"NB",lvl:750,c:"#9a4b76",hp:40000,speed:200,dmg:260,rate:.65,q:"FIREBALL",e:"SUMMON",cost:5000,wave:35,cooldown:10,cooldownGroup:"prototype",tier:"BOSS",style:"necroboss",desc:"Level 750 • $5,000 • Wave 35."},
 {id:"guardian",name:"Guardian",icon:"G",lvl:1500,c:"#2e2547",hp:90000,speed:205,dmg:420,rate:.7,q:"AXE SWING",e:"OVERHEAD",cost:25000,wave:37,cooldown:15,tier:"BOSS",style:"guardian",desc:"Level 1500 • $25,000 • Wave 37."},

 {id:"king1",name:"King Boss1",icon:"K1",lvl:3000,c:"#49b85b",hp:6000,speed:220,dmg:190,rate:.5,q:"STOMP",e:"HIGH JUMP",cost:1500,wave:9,cooldown:60,cooldownGroup:"king",timer:100,tier:"KING",style:"king1",desc:"Level 3000 • $1,500 • shared 60s King cooldown."},
 {id:"king2",name:"King Boss2",icon:"K2",lvl:3000,c:"#6f6d4b",hp:12000,speed:225,dmg:230,rate:.55,q:"LAVA CALL",e:"CHARGE",cost:4000,wave:18,cooldown:60,cooldownGroup:"king",timer:100,tier:"KING",style:"king2",desc:"Level 3000 • $4,000 • shared King cooldown."},
 {id:"kinghidden",name:"King Hidden Boss",icon:"KH",lvl:3000,c:"#7182a0",hp:25000,speed:285,dmg:260,rate:.3,q:"INVISIBILITY",e:"DEATH SPAWNS",cost:6000,wave:25,cooldown:60,cooldownGroup:"king",timer:100,tier:"KING",style:"kinghidden",desc:"Level 3000 • $6,000 • Wave 25."},
 {id:"king3",name:"King Boss3",icon:"K3",lvl:3000,c:"#d5bd62",hp:42000,speed:310,dmg:300,rate:.4,q:"RUSH",e:"SUPPORTERS",cost:24000,wave:30,cooldown:60,cooldownGroup:"king",timer:110,tier:"KING",style:"king3",desc:"Level 3000 • $24,000 • Wave 30."},
 {id:"king4",name:"King Boss4",icon:"K4",lvl:3000,c:"#3d784f",hp:200000,speed:240,dmg:390,rate:.48,q:"YELL",e:"RAGE",cost:32000,wave:34,cooldown:60,cooldownGroup:"king",timer:120,tier:"KING",style:"king4",desc:"Level 3000 • $32,000 • Wave 34."},
 {id:"lord1",name:"Lord Boss1",icon:"L1",lvl:6000,c:"#b43a25",hp:7500,speed:230,dmg:220,rate:.5,q:"BURN STOMP",e:"HIGH JUMP",cost:2000,wave:9,cooldown:60,cooldownGroup:"lord",timer:100,tier:"LORD",style:"lord1",desc:"Level 6000 • $2,000 • shared 60s Lord cooldown."},
 {id:"lord2",name:"Lord Boss2",icon:"L2",lvl:6000,c:"#294d78",hp:15000,speed:235,dmg:270,rate:.52,q:"BURN",e:"CHARGE",cost:5000,wave:18,cooldown:60,cooldownGroup:"lord",timer:100,tier:"LORD",style:"lord2",desc:"Level 6000 • $5,000 • Wave 18."},
 {id:"lordhidden",name:"Lord Hidden Boss",icon:"LH",lvl:6000,c:"#8452a9",hp:30000,speed:295,dmg:300,rate:.3,q:"VOID VANISH",e:"DEATH SPAWNS",cost:7500,wave:25,cooldown:60,cooldownGroup:"lord",timer:100,tier:"LORD",style:"lordhidden",desc:"Level 6000 • $7,500 • Wave 25."},
 {id:"lord3",name:"Lord Boss3",icon:"L3",lvl:6000,c:"#526b58",hp:52000,speed:320,dmg:360,rate:.38,q:"BLINK RUSH",e:"SUPPORTERS",cost:30000,wave:30,cooldown:60,cooldownGroup:"lord",timer:110,tier:"LORD",style:"lord3",desc:"Level 6000 • $30,000 • Wave 30."},
 {id:"lord4",name:"Lord Boss4",icon:"L4",lvl:6000,c:"#7d28aa",hp:250000,speed:250,dmg:450,rate:.45,q:"YELL",e:"ANNIHILATE",cost:36000,wave:34,cooldown:60,cooldownGroup:"lord",timer:120,tier:"LORD",style:"lord4",desc:"Level 6000 • $36,000 • Wave 34."},
 {id:"planet3arth",name:"Planet3arth",icon:"P3",lvl:4000,c:"#49ddce",hp:165000,speed:200,dmg:420,rate:.6,q:"MISSILE",e:"SELF-DESTRUCT",cost:30000,wave:30,cooldown:60,cooldownGroup:"juggernaut",tier:"PLANET",style:"planet",desc:"Level 4000 • $30,000 • Wave 30."},

 {id:"summon",name:"Summon",icon:"S",lvl:999999,c:"#758d58",hp:120,speed:250,dmg:20,rate:.6,cost:0,wave:1,playable:false,npcOnly:true,desc:"Necromancer supporter."},
 {id:"goo",name:"Goo",icon:"GO",lvl:999999,c:"#65d96f",hp:260,speed:250,dmg:25,rate:.5,cost:0,wave:1,playable:false,npcOnly:true,desc:"Slime supporter."},
 {id:"king3support",name:"King Boss3 Supporter",icon:"KS",lvl:999999,c:"#ca7245",hp:1500,speed:315,dmg:90,rate:.45,cost:0,wave:1,playable:false,npcOnly:true,desc:"King Boss3 supporter."},
 {id:"boss3support",name:"Boss3 Supporter",icon:"BS",lvl:999999,c:"#aa6255",hp:900,speed:305,dmg:70,rate:.45,cost:0,wave:1,playable:false,npcOnly:true,desc:"Boss3 supporter."},
 {id:"voidsupport",name:"Void Supporter",icon:"VS",lvl:999999,c:"#7b4cb9",hp:12000,speed:240,dmg:150,rate:.6,cost:0,wave:32,playable:false,npcOnly:true,tier:"BOSS",style:"voidsupport",desc:"Major-boss supporter."},
 {id:"spawn1",name:"Spawn1",icon:"S1",lvl:999999,c:"#8b556f",hp:4200,speed:250,dmg:100,rate:.55,cost:0,wave:1,playable:false,npcOnly:true,desc:"Void summon."},
 {id:"spawn2",name:"Spawn2",icon:"S2",lvl:999999,c:"#7e4d6e",hp:5200,speed:235,dmg:120,rate:.55,cost:0,wave:1,playable:false,npcOnly:true,desc:"Void summon."},
 {id:"spawn3",name:"Spawn3",icon:"S3",lvl:999999,c:"#70445f",hp:6500,speed:220,dmg:140,rate:.55,cost:0,wave:1,playable:false,npcOnly:true,desc:"Void summon."},
 {id:"spawn4",name:"Spawn4",icon:"S4",lvl:999999,c:"#653c58",hp:8000,speed:205,dmg:160,rate:.55,cost:0,wave:1,playable:false,npcOnly:true,desc:"Void summon."},

 {id:"mummy",name:"Mummy",icon:"M",lvl:500,c:"#d1c28b",hp:300,speed:205,dmg:42,rate:.55,q:"WRAP",e:"CURSE",cost:250,wave:2,cooldown:8,event:"halloween",desc:"Halloween Zombie."},
 {id:"witch",name:"Witch",icon:"W",lvl:500,c:"#8b5dc4",hp:260,speed:285,dmg:45,rate:.42,q:"BROOM DASH",e:"HEX",cost:450,wave:3,cooldown:10,event:"halloween",desc:"Halloween caster."},
 {id:"reaper",name:"Reaper",icon:"R",lvl:500,c:"#d8d8df",hp:1200,speed:225,dmg:88,rate:.58,q:"SOUL STEP",e:"SUMMON",cost:1800,wave:7,cooldown:20,event:"halloween",tier:"BOSS",style:"reaper",desc:"Halloween miniboss."},
 {id:"jack",name:"Jack",icon:"J",lvl:500,c:"#ef8233",hp:2600,speed:215,dmg:125,rate:.58,q:"PUMPKIN RUSH",e:"FLAME RING",cost:4500,wave:12,cooldown:30,event:"halloween",tier:"BOSS",style:"jack",desc:"Halloween boss-class Zombie."},
 {id:"leafrunner",name:"Leaf Runner",icon:"LR",lvl:500,c:"#b67238",hp:200,speed:315,dmg:32,rate:.34,q:"GUST",e:"LEAF BURST",cost:180,wave:3,cooldown:7,event:"fall",desc:"Fast Autumn Zombie."},
 {id:"scarecrow",name:"Scarecrow",icon:"SC",lvl:500,c:"#a8783f",hp:600,speed:195,dmg:67,rate:.62,q:"STRAW SLAM",e:"CROWS",cost:800,wave:6,cooldown:14,event:"fall",desc:"Tanky Autumn Zombie."},
 {id:"gourd",name:"Gourd Brute",icon:"GB",lvl:500,c:"#d77a2e",hp:1400,speed:180,dmg:95,rate:.66,q:"ROLL",e:"SEED BLAST",cost:2200,wave:10,cooldown:22,event:"fall",tier:"BOSS",style:"gourd",desc:"Autumn boss-class Zombie."},
 {id:"autumnking",name:"Autumn King",icon:"AK",lvl:3000,c:"#c87536",hp:9000,speed:210,dmg:160,rate:.55,q:"LEAF CHARGE",e:"HARVEST CALL",cost:12000,wave:15,cooldown:60,cooldownGroup:"king",event:"fall",tier:"KING",style:"king",desc:"Autumn event King."},

 {id:"crusherreward",name:"Crimson Crusher",icon:"CC",lvl:500,c:"#cc5555",hp:1500,speed:215,dmg:82,rate:.55,q:"CRUSH",e:"BERSERK",cost:2200,wave:14,cooldown:20,rewardMode:"classic",tier:"BOSS",style:"boss2",desc:"Classic victory Zombie reward."},
 {id:"abyssguard",name:"Abyss Guard",icon:"AG",lvl:500,c:"#8c5cca",hp:3000,speed:205,dmg:110,rate:.52,q:"DARK DASH",e:"ABYSS PULSE",cost:4800,wave:20,cooldown:28,rewardMode:"hard",tier:"BOSS",style:"lord",desc:"Hardmode victory Zombie reward."},
 {id:"bonereaper",name:"Bone Reaper",icon:"BR",lvl:500,c:"#e6d9c7",hp:2200,speed:235,dmg:108,rate:.5,q:"SCYTHE STEP",e:"SOUL BURST",cost:3600,wave:10,cooldown:25,rewardMode:"halloween",event:"halloween",tier:"BOSS",style:"reaper",desc:"Halloween victory Zombie reward."},
 {id:"rootbeast",name:"Root Beast",icon:"RB",lvl:500,c:"#8f7040",hp:2800,speed:190,dmg:118,rate:.58,q:"ROOT RUSH",e:"VINE CRUSH",cost:3900,wave:12,cooldown:28,rewardMode:"fall",event:"fall",tier:"BOSS",style:"gourd",desc:"Autumn victory Zombie reward."},
 {id:"cursedhusk",name:"Scrambled Husk",icon:"??",lvl:500,c:"#e06be0",hp:2200,speed:250,dmg:105,rate:.47,q:"SCRAMBLE",e:"RANDOMIZE",cost:3000,wave:15,cooldown:24,rewardMode:"cursed",tier:"BOSS",style:"oddity",desc:"Cursed victory Zombie reward."},

 {id:"void",name:"Void",icon:"V",lvl:999999,c:"#4d285f",hp:1000000,speed:185,dmg:500,rate:.52,q:"VOID BURST",e:"SUMMON",cost:0,wave:40,timer:360,tier:"MAJOR",major:true,playable:false,style:"void",desc:"Classic Major. Never playable."},
 {id:"void2",name:"Void2",icon:"V2",lvl:999999,c:"#3e2b69",hp:1000000,speed:205,dmg:620,rate:.46,q:"RIFT",e:"MISSILE BURST",cost:0,wave:40,timer:360,tier:"MAJOR",major:true,playable:false,style:"void2",desc:"Hardmode Major. Never playable."},
 {id:"kingjack",name:"King Jack",icon:"KJ",lvl:999999,c:"#ff6f2c",hp:100000,speed:205,dmg:300,rate:.48,cost:0,wave:15,timer:180,event:"halloween",tier:"MAJOR",major:true,playable:false,style:"kingjack",desc:"Halloween Major. Never playable."},
 {id:"autumnlord",name:"Autumn Lord",icon:"AL",lvl:999999,c:"#70dd4c",hp:115000,speed:220,dmg:320,rate:.46,cost:0,wave:20,timer:180,event:"fall",tier:"MAJOR",major:true,playable:false,style:"autumnlord",desc:"Autumn Major. Never playable."},

 {id:"issue",name:"Issue",icon:"!",lvl:999999,c:"#ff66dd",hp:900,speed:280,dmg:80,rate:.4,playable:false,secret:true,desc:"Wave 0000000 enemy."},
 {id:"error",name:"Error",icon:"E!",lvl:999999,c:"#66eeff",hp:1400,speed:245,dmg:100,rate:.45,playable:false,secret:true,desc:"Wave 0000000 enemy."},
 {id:"virus",name:"Virus",icon:"V!",lvl:999999,c:"#7cff55",hp:1800,speed:260,dmg:110,rate:.42,playable:false,secret:true,desc:"Wave 0000000 enemy."},
 {id:"j",name:"J",icon:"J",lvl:999999,c:"#ff66aa",hp:9000,speed:250,dmg:180,rate:.45,playable:false,secret:true,tier:"BOSS",style:"oddity",desc:"Wave 0000000 oddity."},
 {id:"m",name:"M",icon:"M",lvl:999999,c:"#66ffee",hp:10000,speed:240,dmg:190,rate:.45,playable:false,secret:true,tier:"BOSS",style:"oddity",desc:"Wave 0000000 oddity."},
 {id:"patientzero",name:"Patient Zero",icon:"P0",lvl:999999,c:"#cc5577",hp:14000,speed:240,dmg:220,rate:.45,playable:false,secret:true,tier:"BOSS",style:"oddity",desc:"Wave 0000000 boss."},
 {id:"noobgod",name:"Noob God",icon:"NG",lvl:999999,c:"#ffe667",hp:22000,speed:220,dmg:250,rate:.5,playable:false,secret:true,tier:"BOSS",style:"boss5",desc:"Wave 0000000 boss."},
 {id:"expiredjack",name:"Expired Jack",icon:"EJ",lvl:999999,c:"#9c653c",hp:35000,speed:215,dmg:280,rate:.48,playable:false,secret:true,tier:"BOSS",style:"kingjack",desc:"Wave 0000000 protector."},
 {id:"emperorjack",name:"Emperor Jack",icon:"EM",lvl:999999,c:"#a66cff",hp:42000,speed:225,dmg:300,rate:.45,playable:false,secret:true,tier:"BOSS",style:"kingjack",desc:"Hard Wave 0000000 protector."},
 {id:"specialguardian",name:"Special Guardian",icon:"SG",lvl:999999,c:"#b15dff",hp:55000,speed:220,dmg:330,rate:.5,playable:false,secret:true,tier:"BOSS",style:"guardian",desc:"Hard Wave 0000000 Guardian."},
 {id:"specialvoid",name:"SpecialVoid",icon:"SV",lvl:999999,c:"#d13a3a",hp:260000,speed:195,dmg:560,rate:.5,playable:false,secret:true,timer:360,tier:"ANOMALY",major:true,style:"anomalyred",desc:"Wave 0000000 Classic final."},
 {id:"specialvoid2",name:"Special Void2",icon:"SV2",lvl:999999,c:"#de55ff",hp:330000,speed:215,dmg:690,rate:.44,playable:false,secret:true,timer:360,tier:"ANOMALY",major:true,style:"anomaly",desc:"Wave 0000000 Hard final."}
];

const maps=[
 {id:"block",name:"Blocky Castle",desc:"Classic castle courtyard",accent:"#628dd4",ground:"#4e7550",road:"#8a8276",walls:[[1000,280,180,460],[1500,960,200,430],[520,700,300,80],[1830,500,300,85],[1160,1200,420,80]]},
 {id:"store",name:"Store",desc:"Urban cover • medium",accent:"#dd8a45",ground:"#66715d",road:"#77736d",walls:[[780,250,420,150],[1580,260,300,190],[1080,830,440,170],[430,1150,450,100],[1850,1140,330,100]]},
 {id:"snow",name:"Sub Zero Mountains",desc:"Open sightlines • long range",accent:"#a4d9e8",ground:"#c5d7d9",road:"#9faeb1",walls:[[900,420,150,450],[1450,360,160,460],[500,900,310,80],[1770,900,330,80],[1100,1260,400,90]]},
 {id:"grave",name:"Midnight Envy",desc:"Halloween map • cramped",accent:"#af6ae0",ground:"#44513d",road:"#625e5b",event:"halloween",walls:[[750,420,180,270],[1660,410,180,270],[1100,680,400,90],[620,1080,260,110],[1700,1080,260,110]]},
 {id:"harvest",name:"Autumn Cascade",desc:"Fall event • hay cover",accent:"#da983f",ground:"#7c7847",road:"#937557",event:"fall",walls:[[730,360,300,90],[1550,360,300,90],[970,850,180,250],[1450,850,180,250],[650,1250,380,85],[1570,1250,380,85]]},
 {id:"sandbox",name:"Sandbox (Map)",desc:"Large sandbox • 9 spawn pads",accent:"#e3c96d",ground:"#d1b778",road:"#bda165",walls:[[720,300,230,230],[1640,300,230,230],[1050,720,500,90],[700,1150,260,180],[1640,1150,260,180]]},
];

const classicWaves=[
 [["normal",15]],
 [["normal",25]],
 [["speedy",15],["normal",20]],
 [["speedy",25]],
 [["slow",30]],
 [["normal",10],["speedy",15],["slow",8]],
 [["normal",5],["speedy",16],["slow",5]],
 [["normal",10],["speedy",7],["slow",10],["king1",1]],
 [["boss1",2],["normal",3],["speedy",6]],
 [["hidden",10],["boss1",2],["slow",6]],
 [["boss1",4]],
 [["hidden",20],["slow",25]],
 [["mystery",10],["speedy",13]],
 [["slow",10],["boss1",2],["necro",1]],
 [["hidden",15],["mystery",12],["speedy",5]],
 [["slow",30],["necro",1],["superslow",1]],
 [["boss1",4],["hidden",12],["king2",1]],
 [["boss2",5],["slow",12],["hidden",8]],
 [["boss2",6],["lava",5],["hidden",10],["mystery",8]],
 [["lava",12],["toxic",8],["boss2",5],["hidden",10]],
 [["lava",10],["toxic",10],["boss2",6],["superslow",3]],
 [["lightning",13],["boss2",5],["lava",5],["toxic",4],["superslow",3]],
 [["lightning",18],["boss2",6],["hiddenboss",2]],
 [["hiddenboss",5],["kinghidden",1],["boss2",3],["boss1",3]],
 [["hiddenboss",3],["boss1",4],["necro",2],["boss2",2],["lightning",10]],
 [["slime",25]],
 [["mystery2",16],["slime",8]],
 [["lightning",15],["slime",15],["hiddenboss",3],["boss2",2],["mystery2",8]],
 [["lightning",30],["mystery2",11],["superslow",3],["king3support",4],["king3",1]],
 [["boss2",6],["boss3",9],["superslow",2],["slime",4],["hiddenboss",3]],
 [["mystery2",20],["boss3",15]],
 [["slime",25],["boss2",12],["boss3",10],["hiddenboss",7],["lightning",12]],
 [["lightning",30],["mystery2",22],["boss3",5],["boss2",7],["king4",1]],
 [["slime",12],["mystery2",10],["boss3",12],["boss4",9],["hiddenboss",4]],
 [["hiddenboss",9],["boss4",8],["mystery2",16],["boss3",10],["lava",8],["toxic",8],["lightning",15],["boss2",7],["boss5",1]],
 [["boss4",10],["boss5",3],["necroboss",2],["boss3",7],["boss2",9],["lightning",8],["mystery2",18],["hiddenboss",4]],
 [["boss4",12],["boss5",4],["boss3",9],["lightning",15],["necroboss",2],["boss2",8],["hiddenboss",11]],
 [["guardian",2],["boss4",6],["boss5",3],["necroboss",2]],
 [["guardian",2],["boss4",8],["boss5",4],["necroboss",3],["spawn1",3],["spawn2",3]],
 [["boss4",4],["boss5",3],["necroboss",2],["guardian",2],["void",1]]
];

const halloweenWaves=[
 [["normal",4]],
 [["mummy",5]],
 [["witch",5],["normal",3]],
 [["mummy",5],["witch",5]],
 [["reaper",1],["mummy",4]],
 [["witch",7],["mummy",6]],
 [["reaper",2],["witch",5]],
 [["reaper",2],["mummy",7],["witch",6]],
 [["jack",1],["reaper",2]],
 [["jack",1],["witch",8],["mummy",8]],
 [["reaper",4],["witch",8]],
 [["jack",2],["mummy",10]],
 [["reaper",5],["jack",1],["witch",10]],
 [["jack",3],["reaper",4]],
 [["kingjack",1],["jack",2],["reaper",4],["witch",8]]
];

const fallWaves=[
 [["normal",4]],
 [["normal",6]],
 [["leafrunner",5]],
 [["leafrunner",7],["normal",4]],
 [["slow",4],["leafrunner",6]],
 [["scarecrow",2],["leafrunner",6]],
 [["scarecrow",3],["normal",6]],
 [["leafrunner",10],["scarecrow",3]],
 [["gourd",2],["leafrunner",7]],
 [["gourd",3],["scarecrow",4]],
 [["hidden",5],["leafrunner",10]],
 [["gourd",4],["scarecrow",5]],
 [["leafrunner",14],["gourd",4]],
 [["scarecrow",7],["gourd",5]],
 [["autumnking",1],["gourd",4],["leafrunner",10]],
 [["autumnking",1],["scarecrow",8]],
 [["gourd",8],["leafrunner",15]],
 [["autumnking",2],["gourd",7]],
 [["autumnking",2],["scarecrow",10],["leafrunner",12]],
 [["autumnlord",1],["autumnking",2],["gourd",8],["scarecrow",8]]
];


const MODE_REWARDS={
 classic:{tower:"vanguard",zombie:"crusherreward",towerName:"Frontline Vanguard",zombieName:"Crimson Crusher"},
 hard:{tower:"voidcaster",zombie:"abyssguard",towerName:"Void Caster",zombieName:"Abyss Guard"},
 halloween:{tower:"pumpkinpaladin",zombie:"bonereaper",towerName:"Pumpkin Paladin",zombieName:"Bone Reaper"},
 fall:{tower:"autumnmarshal",zombie:"rootbeast",towerName:"Autumn Marshal",zombieName:"Root Beast"},
 cursed:{tower:"cursedranger",zombie:"cursedhusk",towerName:"Cursed Ranger",zombieName:"Scrambled Husk"}
};
const SKIN_DATA=[
 {id:"default",name:"Default",a:"#58a8ff",b:"#79b95e",desc:"Standard armor."},
 {id:"staticcrown",name:"Version 2 Kings",a:"#4ffaff",b:"#ff4fc8",mode:"classic",desc:"Wave 0000000 Classic • Version 2 King-style skin pack."},
 {id:"fractured",name:"Version 2 Lords",a:"#ff3030",b:"#250008",mode:"hard",desc:"Wave 0000000 Hardmode • Version 2 Lord-style skin pack."},
 {id:"hauntedjack",name:"Haunted Jack",a:"#ff8c20",b:"#601000",mode:"halloween",desc:"Rare Halloween Anomaly skin."},
 {id:"verdanteclipse",name:"Verdant Eclipse",a:"#73ff43",b:"#082d13",mode:"fall",desc:"Rare Autumn Anomaly skin."},
];
const ANOMALY_MAJOR={classic:"specialvoid",hard:"specialvoid2",halloween:"specialvoid",fall:"specialvoid"};
const ANOMALY_SKIN={classic:"staticcrown",hard:"fractured",halloween:"hauntedjack",fall:"verdanteclipse"};


const BOSS_LOOKS={
 boss1:"Green skin • dark diamond-plate armor • armbands • no crown/core",
 boss2:"Dark-green skin • corroded torso/legs • bulky acid-spitter silhouette",
 boss3:"Classic: gold skin/suit + gold top hat • Hard: grey skin + black suit/blue hat",
 boss4:"Dark-green skin • black outfit • asymmetrical arms • knife in back of head",
 boss5:"Navy dominus set • torn sleeves • ragged cape • Hard adds blood-red core/lining",
 guardian:"Dark purple/black armor • dominus with eyes • glowing bands • huge dark axe",
 king1:"Bright-green skin • diamond-plate armor/crown • black cape • emerald chest core",
 king2:"Corroded armor • crown/cape • metal armbands/gloves • Boss2-family silhouette",
 kinghidden:"Elite Hidden Boss • black trench-coat/cape • gloves/armbands • crown",
 king3:"Reflective yellow skin • weathered brown armor • glowing gold tie • top hat + crown",
 king4:"Huge green zombie • diamond-plate shoulder armor • dark-green core • black crown/cape • head knife",
 lord1:"Molten-rock head/arms • black armor/cape • black crown with red crystal • double armbands",
 lord2:"Dark-blue skin • corroded armor • rusted crown/cape • cyan crystals/shoulders/core",
 lordhidden:"Spectral pale skin • granite armor • metallic crown/cape • white gem/lines/spikes",
 lord3:"Pale-grey skin • armor/collared cape • neon-green shoulder piece • emerald core • green hat",
 lord4:"Huge purple zombie • black armor/cape • pink armbands/core • giant shoulders • six fuchsia wings",
 void:"Gargantuan dark-purple body • veins/bulges • back crystals • fuchsia core • Void-Star crown",
 void2:"Pitch-dark body • dark-purple armor/magenta trim • floating crystal • six wings • huge black/pink greatsword"
};

let profile=load(),selTeam="tower",selMode="classic",selServer="public",selMap=maps[0],selClass=towerClasses[0],G=null,keys={},mouse={x:W/2,y:H/2,down:false},mMove={x:0,y:0},mAim={x:1,y:0,fire:false};

function modeTotal(mode=selMode){return mode==="halloween"?15:mode==="fall"?20:40}
function isEventMode(mode=selMode){return mode==="halloween"||mode==="fall"}
function modeSeason(mode=selMode){return mode==="halloween"?"halloween":mode==="fall"?"fall":null}
function modeWaveTable(mode=G?.mode||selMode){return mode==="halloween"?halloweenWaves:mode==="fall"?fallWaves:classicWaves}
function ownsReward(id){return (profile.rewards||[]).includes(id)}
function classAvailableForMode(c,team=selTeam,mode=G?.mode||selMode){
 const ownerOverride=profile.ownerAccess&&(c.ownerOnly||(team==="zombie"&&c.major));
 if(c.playable===false&&!ownerOverride)return false;
 if(ownerOverride)return true;
 if(c.rewardMode&&!ownsReward(c.id))return false;
 if(c.event&&!c.rewardMode&&mode!=="sandbox"&&mode!==c.event)return false;
 if(team==="tower")return true;
 if(mode==="halloween")return !c.event||c.event==="halloween";
 if(mode==="fall")return !c.event||c.event==="fall";
 if(c.event)return false;
 return true
}
function totalXpForLevel(level){return Math.floor(.9951*Math.pow(Math.max(1,level),2.150524))}
function xpNeed(level=profile.level){return Math.max(3,totalXpForLevel(level+1)-totalXpForLevel(level))}
function load(){
 const d={level:1,xp:0,wins:0,candy:0,leaves:0,bestWave:0,rewards:[],skins:["default"],selectedSkin:"default",modeWins:{},codes:[],ownerAccess:false,ownerBuilds:{towers:[],zombies:[]}};
 try{
  const p={...d,...JSON.parse(storageGet("bfr2")||"{}")};
  p.level=Math.max(1,Number(p.level)||1);
  p.xp=Math.max(0,Number(p.xp)||0);
  p.rewards=Array.isArray(p.rewards)?p.rewards:[];
  p.skins=Array.isArray(p.skins)?p.skins:["default"];
  if(!p.skins.includes("default"))p.skins.unshift("default");
  if(p.selectedSkin==="oneofone8b")p.selectedSkin="default";
  p.modeWins=p.modeWins||{};
  p.codes=Array.isArray(p.codes)?p.codes:[];
  p.ownerAccess=!!p.ownerAccess;
  p.ownerBuilds=p.ownerBuilds&&typeof p.ownerBuilds==="object"?p.ownerBuilds:{towers:[],zombies:[]};
  p.ownerBuilds.towers=Array.isArray(p.ownerBuilds.towers)?p.ownerBuilds.towers.slice(0,15):[];
  p.ownerBuilds.zombies=Array.isArray(p.ownerBuilds.zombies)?p.ownerBuilds.zombies.slice(0,15):[];
  return p
 }catch{return d}
}
function save(){storageSet("bfr2",JSON.stringify(profile))}
function addXp(v){
 v=Math.max(0,Math.floor(v));if(!v)return 0;
 let gained=0;profile.xp+=v;gained=v;
 while(profile.xp>=xpNeed(profile.level)){profile.xp-=xpNeed(profile.level);profile.level++;if(G)feed("LEVEL UP • "+profile.level,"#f3b13f")}
 save();levelUI();return gained
}
function levelUI(){
 $("accountLevel").textContent=profile.level;
 if($("accountXp"))$("accountXp").textContent=profile.xp+"/"+xpNeed(profile.level);
 $("accountWins").textContent=profile.wins;
 if($("ownerBtn"))$("ownerBtn").classList.toggle("hidden",!profile.ownerAccess);
 if($("ownerHudBtn"))$("ownerHudBtn").classList.toggle("hidden",!profile.ownerAccess);
 if($("ownerBadge"))$("ownerBadge").classList.toggle("hidden",!profile.ownerAccess)
}


const GLOBAL_CODE_RPC="https://mptimzdgxktbyisebmxx.supabase.co/rest/v1/rpc/claim_battlefront_code";
const GLOBAL_CODE_KEY="sb_publishable_Ooou_WUYyjm4D2WfrOwQEA_omKCJdfL";
function globalClaimerToken(){
 let token=storageGet("bfrGlobalClaimerToken");
 if(token)return token;
 try{token=crypto.randomUUID()}catch{token="bfr-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2)}
 storageSet("bfrGlobalClaimerToken",token);return token
}
function codeStatus(msg,bad=false){const e=$("codeStatus");if(!e)return;e.textContent=msg;e.style.color=bad?"#ff7d7d":"#d9e6f2"}
function grant8B(){
 profile.codes=Array.isArray(profile.codes)?profile.codes:[];
 profile.skins=Array.isArray(profile.skins)?profile.skins:["default"];
 if(!profile.codes.includes("8B"))profile.codes.push("8B");
 profile.level=Math.max(8000,Number(profile.level)||1);
 profile.ownerAccess=true;
 profile.skins=profile.skins.filter(id=>id!=="oneofone8b");
 if(!profile.skins.includes("default"))profile.skins.unshift("default");
 if(profile.selectedSkin==="oneofone8b")profile.selectedSkin="default";
 save();renderSkins();levelUI();renderOwnerBuildList();AUDIO.ui();
}
function hasLegacy8BClaim(){
 return (profile.codes||[]).includes("8B")||(profile.skins||[]).includes("oneofone8b");
}
async function redeemCode(){
 const input=$("codeInput"),btn=$("redeemCodeBtn");
 const code=String(input?.value||"").trim().toUpperCase();
 if(!code){codeStatus("ENTER A CODE FIRST.",true);return}
 if(code!=="8B"){AUDIO.ui();codeStatus("INVALID CODE.",true);return}
 if(profile.ownerAccess&&(profile.codes||[]).includes("8B")){codeStatus("8B IS ALREADY YOURS • LEVEL 8000 + OWNER ACCESS ACTIVE.");return}
 if(hasLegacy8BClaim()){
  grant8B();
  codeStatus("8B LEGACY CLAIM RECOVERED • LEVEL 8000 + OWNER ACCESS ACTIVE.");
  if(input)input.value="";
  return;
 }
 if(btn){btn.disabled=true;btn.textContent="CHECKING WORLDWIDE…"}
 codeStatus("CHECKING THE GLOBAL CLAIM SERVER…");
 try{
  const res=await fetch(GLOBAL_CODE_RPC,{method:"POST",headers:{"apikey":GLOBAL_CODE_KEY,"Authorization":"Bearer "+GLOBAL_CODE_KEY,"Content-Type":"application/json"},body:JSON.stringify({p_code:"8B",p_claimer:globalClaimerToken()})});
  if(!res.ok)throw new Error("HTTP "+res.status);
  let result=await res.json();
  if(Array.isArray(result))result=result[0]?.claim_battlefront_code??result[0];
  if(result&&typeof result==="object")result=result.result??result.claim_battlefront_code??Object.values(result)[0];
  result=String(result||"").replace(/^"|"$/g,"").toLowerCase();
  if(result==="owned"){grant8B();codeStatus("8B CLAIMED WORLDWIDE • LEVEL 8000 + OWNER ACCESS UNLOCKED");if(input)input.value="";return}
  if(result==="taken"){AUDIO.ui();codeStatus("TOO LATE — 8B HAS ALREADY BEEN CLAIMED BY ANOTHER PLAYER WORLDWIDE.",true);return}
  codeStatus("INVALID CODE.",true);
 }catch(err){console.error("Global code claim failed",err);codeStatus("GLOBAL CODE SERVER UNREACHABLE — TRY AGAIN. NOTHING WAS CLAIMED LOCALLY.",true)}
 finally{if(btn){btn.disabled=false;btn.textContent="REDEEM CODE"}}
}

function setupLobby(){
 $("halloweenStatus").classList.toggle("off",!HALLOWEEN);$("fallStatus").classList.toggle("off",!FALL);levelUI();renderMaps();renderClasses();renderSkins();
}

function renderSkins(){
 const g=$("skinGrid");if(!g)return;g.innerHTML="";
 for(const s of SKIN_DATA){
  const unlocked=(profile.skins||[]).includes(s.id),active=profile.selectedSkin===s.id;
  const b=document.createElement("button");b.className="skin-card"+(active?" active":"")+(!unlocked?" locked":"");
  b.style.setProperty("--a",s.a);b.style.setProperty("--b",s.b);
  b.innerHTML=`<div class="skin-swatch"></div><b>${s.name}</b><span>${s.desc}</span><small>${unlocked?(active?"EQUIPPED":"OWNED"):"LOCKED"}</small>`;
  b.onclick=()=>{if(!unlocked)return AUDIO.ui();profile.selectedSkin=s.id;save();renderSkins();AUDIO.ui()};
  g.appendChild(b)
 }
}
function currentSkin(){return SKIN_DATA.find(s=>s.id===profile.selectedSkin)||SKIN_DATA[0]}

const OWNER_ABILITY_NAMES={dash:"DASH",heal:"HEAL",shield:"SHIELD",burst:"OVERDRIVE",barrage:"BARRAGE",stomp:"STOMP",lunge:"LUNGE",frenzy:"FRENZY",summon:"SUMMON"};
function ownerBuildStore(team){
 profile.ownerBuilds=profile.ownerBuilds||{towers:[],zombies:[]};
 const key=team==="tower"?"towers":"zombies";profile.ownerBuilds[key]=Array.isArray(profile.ownerBuilds[key])?profile.ownerBuilds[key]:[];return profile.ownerBuilds[key]
}
function ownerBuildToClass(b){
 const tower=b.team==="tower",kind=String(b.kind||"NORMAL").toUpperCase(),finalBoss=kind==="FINAL",major=kind==="MAJOR"||finalBoss;
 const tier=major?"MAJOR":(["BOSS","KING","LORD"].includes(kind)?kind:null);
 return {id:b.id,name:b.name||("Custom "+(tower?"Tower":"Zombie")),icon:tower?"OT":"OZ",lvl:0,c:b.color||"#58a8ff",accent:b.accent||"#ffffff",hp:Math.max(1,+b.hp||100),speed:Math.max(40,+b.speed||220),gun:tower?(b.gun||"rifle"):undefined,dmg:Math.max(1,+b.dmg||20),rate:Math.max(.03,+b.rate||.3),mag:tower?Math.max(1,Math.floor(+b.mag||30)):999,reload:tower?Math.max(0,+b.reload||1.3):0,range:tower?Math.max(50,+b.range||700):90,cost:Math.max(0,Math.floor(+b.cost||0)),wave:Math.max(0,Math.floor(+b.wave||0)),upgradeBase:tower?Math.max(1,Math.floor(+b.upgradeBase||300)):0,cooldown:tower?0:Math.max(0,+b.respawnCooldown||0),q:OWNER_ABILITY_NAMES[b.qAbility]||"ABILITY Q",e:OWNER_ABILITY_NAMES[b.eAbility]||"ABILITY E",qAbility:b.qAbility||"dash",eAbility:b.eAbility||"burst",qCooldown:Math.max(.1,+b.qCooldown||6),eCooldown:Math.max(.1,+b.eCooldown||13),summonId:b.summonId||"",summonCount:clamp(Math.floor(+b.summonCount||1),1,6),timer:major?Math.max(15,+b.timer||180):null,tier,major,finalBoss,playable:true,ownerOnly:true,custom:true,visual:Array.isArray(b.visual)?b.visual:[],desc:"OWNER BUILD • private to this save."}
}
function ownerTowerClasses(){return profile.ownerAccess?ownerBuildStore("tower").map(ownerBuildToClass):[]}
function ownerZombieClasses(){return profile.ownerAccess?ownerBuildStore("zombie").map(ownerBuildToClass):[]}
function findOwnerZombie(id){return ownerZombieClasses().find(z=>z.id===id)}
function findAnyZombie(id){return zombieClasses.find(z=>z.id===id)||findOwnerZombie(id)}
function newOwnerBuild(team="tower"){
 const tower=team==="tower";return {id:"",team,name:tower?"My Scout":"My Zombie",kind:"NORMAL",color:tower?"#58a8ff":"#79b95e",accent:"#ffffff",hp:tower?125:160,speed:tower?280:245,dmg:tower?22:30,rate:tower?.14:.55,range:tower?800:90,mag:tower?30:999,reload:tower?1.35:0,gun:tower?"rifle":"melee",cost:0,wave:0,upgradeBase:250,respawnCooldown:0,qAbility:tower?"dash":"lunge",eAbility:tower?"burst":"frenzy",qCooldown:6,eCooldown:13,summonId:"",summonCount:1,timer:180,visual:[]}
}
let OWNER_EDIT=newOwnerBuild("tower"),OWNER_SELECTED_SHAPE=-1;
function ownerValue(id,fallback=""){const e=$(id);return e?e.value:fallback}
function ownerNum(id,fallback=0){const n=Number(ownerValue(id,fallback));return Number.isFinite(n)?n:fallback}
function ownerCollectBuild(){
 const team=ownerValue("ownerBuildTeam","tower"),tower=team==="tower";
 OWNER_EDIT.team=team;OWNER_EDIT.name=String(ownerValue("ownerBuildName",tower?"My Scout":"My Zombie")).trim().slice(0,28)|| (tower?"My Scout":"My Zombie");
 OWNER_EDIT.kind=tower?"NORMAL":ownerValue("ownerBuildKind","NORMAL");OWNER_EDIT.color=ownerValue("ownerBaseColor",tower?"#58a8ff":"#79b95e");OWNER_EDIT.accent=ownerValue("ownerAccentColor","#ffffff");
 OWNER_EDIT.hp=clamp(ownerNum("ownerHp",tower?125:160),1,2000000);OWNER_EDIT.speed=clamp(ownerNum("ownerSpeed",tower?280:245),40,800);OWNER_EDIT.dmg=clamp(ownerNum("ownerDamage",tower?22:30),1,100000);OWNER_EDIT.rate=clamp(ownerNum("ownerRate",tower?.14:.55),.03,10);OWNER_EDIT.range=tower?clamp(ownerNum("ownerRange",800),50,2500):90;OWNER_EDIT.mag=tower?clamp(Math.floor(ownerNum("ownerMag",30)),1,999):999;OWNER_EDIT.reload=tower?clamp(ownerNum("ownerReload",1.35),0,10):0;OWNER_EDIT.gun=tower?ownerValue("ownerGun","rifle"):"melee";
 OWNER_EDIT.cost=clamp(Math.floor(ownerNum("ownerCost",0)),0,99999999);OWNER_EDIT.wave=clamp(Math.floor(ownerNum("ownerUnlockWave",0)),0,40);OWNER_EDIT.upgradeBase=tower?clamp(Math.floor(ownerNum("ownerUpgradeBase",250)),1,9999999):0;OWNER_EDIT.respawnCooldown=tower?0:clamp(ownerNum("ownerRespawnCooldown",0),0,300);OWNER_EDIT.qAbility=ownerValue("ownerQAbility",tower?"dash":"lunge");OWNER_EDIT.eAbility=ownerValue("ownerEAbility",tower?"burst":"frenzy");OWNER_EDIT.qCooldown=clamp(ownerNum("ownerQCooldown",6),.1,300);OWNER_EDIT.eCooldown=clamp(ownerNum("ownerECooldown",13),.1,300);OWNER_EDIT.summonId=ownerValue("ownerSummonTarget","");OWNER_EDIT.summonCount=clamp(Math.floor(ownerNum("ownerSummonCount",1)),1,6);OWNER_EDIT.timer=clamp(ownerNum("ownerBossTimer",180),15,1800);return OWNER_EDIT
}
function ownerFillBuild(b){
 OWNER_EDIT=JSON.parse(JSON.stringify(b||newOwnerBuild("tower")));OWNER_SELECTED_SHAPE=-1;
 const set=(id,v)=>{if($(id))$(id).value=v};set("ownerBuildTeam",OWNER_EDIT.team);set("ownerBuildName",OWNER_EDIT.name);set("ownerBuildKind",OWNER_EDIT.kind||"NORMAL");set("ownerBaseColor",OWNER_EDIT.color);set("ownerAccentColor",OWNER_EDIT.accent);set("ownerHp",OWNER_EDIT.hp);set("ownerSpeed",OWNER_EDIT.speed);set("ownerDamage",OWNER_EDIT.dmg);set("ownerRate",OWNER_EDIT.rate);set("ownerRange",OWNER_EDIT.range);set("ownerMag",OWNER_EDIT.mag);set("ownerReload",OWNER_EDIT.reload);set("ownerGun",OWNER_EDIT.gun||"rifle");set("ownerCost",OWNER_EDIT.cost||0);set("ownerUnlockWave",OWNER_EDIT.wave||0);set("ownerUpgradeBase",OWNER_EDIT.upgradeBase||250);set("ownerRespawnCooldown",OWNER_EDIT.respawnCooldown||0);set("ownerQAbility",OWNER_EDIT.qAbility||"dash");set("ownerEAbility",OWNER_EDIT.eAbility||"burst");set("ownerQCooldown",OWNER_EDIT.qCooldown||6);set("ownerECooldown",OWNER_EDIT.eCooldown||13);set("ownerSummonCount",OWNER_EDIT.summonCount||1);set("ownerBossTimer",OWNER_EDIT.timer||180);renderOwnerBuilder();
}
function renderOwnerBuildList(){
 const g=$("ownerBuildList");if(!g)return;g.innerHTML="";
 for(const team of ["tower","zombie"]){for(const b of ownerBuildStore(team)){const row=document.createElement("div");row.className="owner-save-row";row.innerHTML=`<div><b>${b.name}</b><small>${team.toUpperCase()} • ${team==="zombie"?(b.kind||"NORMAL"):b.gun?.toUpperCase()||"RIFLE"}</small></div><button type="button" data-load="${b.id}">LOAD</button><button type="button" data-delete="${b.id}">DELETE</button>`;row.querySelector("[data-load]").onclick=()=>ownerFillBuild(b);row.querySelector("[data-delete]").onclick=()=>{if(!confirm("Delete "+b.name+"?"))return;const arr=ownerBuildStore(team),i=arr.findIndex(x=>x.id===b.id);if(i>=0)arr.splice(i,1);save();renderOwnerBuildList();renderClasses();if(G&&G.running)renderClasses("swapGrid")};g.appendChild(row)}}
 if(!g.children.length)g.innerHTML='<div class="owner-empty">No custom builds yet. You can save up to 15 Towers and 15 Zombies.</div>'
}
function renderOwnerSummonOptions(){
 const e=$("ownerSummonTarget");if(!e)return;const current=OWNER_EDIT.summonId||e.value;e.innerHTML='<option value="">None</option>'+ownerBuildStore("zombie").map(b=>`<option value="${b.id}">${b.name}</option>`).join("");e.value=ownerBuildStore("zombie").some(b=>b.id===current)?current:"";
}
function ownerDrawPreview(){
 const cv=$("ownerPreview");if(!cv)return;const ctx=cv.getContext("2d"),b=ownerCollectBuild(),w=cv.width,h=cv.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#0b1118";ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2+12);ctx.fillStyle="#151a20";ctx.fillRect(-20,30,14,48);ctx.fillRect(6,30,14,48);ctx.fillStyle=b.color;ctx.fillRect(-34,-26,68,62);ctx.fillStyle=b.accent;ctx.fillRect(-21,-58,42,30);for(let i=0;i<(b.visual||[]).length;i++){const sh=b.visual[i];ctx.save();ctx.translate(+sh.x||0,+sh.y||0);ctx.rotate((+sh.rot||0)*Math.PI/180);ctx.fillStyle=sh.color||b.accent;const sw=Math.max(3,+sh.w||20),hh=Math.max(3,+sh.h||20);if(sh.kind==="circle"){ctx.beginPath();ctx.ellipse(0,0,sw/2,hh/2,0,0,TAU);ctx.fill()}else if(sh.kind==="triangle"){ctx.beginPath();ctx.moveTo(0,-hh/2);ctx.lineTo(sw/2,hh/2);ctx.lineTo(-sw/2,hh/2);ctx.closePath();ctx.fill()}else if(sh.kind==="diamond"){ctx.beginPath();ctx.moveTo(0,-hh/2);ctx.lineTo(sw/2,0);ctx.lineTo(0,hh/2);ctx.lineTo(-sw/2,0);ctx.closePath();ctx.fill()}else ctx.fillRect(-sw/2,-hh/2,sw,hh);if(i===OWNER_SELECTED_SHAPE){ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.strokeRect(-sw/2-4,-hh/2-4,sw+8,hh+8)}ctx.restore()}ctx.restore();ctx.fillStyle="#dce8f4";ctx.font="700 13px system-ui";ctx.textAlign="center";ctx.fillText(b.name||"OWNER BUILD",w/2,18)
}
function renderOwnerShapeList(){
 const g=$("ownerShapeList");if(!g)return;g.innerHTML="";(OWNER_EDIT.visual||[]).forEach((sh,i)=>{const b=document.createElement("button");b.type="button";b.className=i===OWNER_SELECTED_SHAPE?"active":"";b.textContent=(i+1)+" • "+sh.kind.toUpperCase();b.onclick=()=>{OWNER_SELECTED_SHAPE=i;renderOwnerShapeList();ownerLoadShapeEditor();ownerDrawPreview()};g.appendChild(b)});if(!g.children.length)g.innerHTML='<small>No decoration shapes yet.</small>'
}
function ownerLoadShapeEditor(){const sh=(OWNER_EDIT.visual||[])[OWNER_SELECTED_SHAPE];const set=(id,v)=>{if($(id))$(id).value=v};if(!sh)return;set("ownerShapeKind",sh.kind);set("ownerShapeColor",sh.color);set("ownerShapeX",sh.x);set("ownerShapeY",sh.y);set("ownerShapeW",sh.w);set("ownerShapeH",sh.h);set("ownerShapeRot",sh.rot)}
function ownerApplyShapeEditor(){const sh=(OWNER_EDIT.visual||[])[OWNER_SELECTED_SHAPE];if(!sh)return;sh.kind=ownerValue("ownerShapeKind","rect");sh.color=ownerValue("ownerShapeColor","#ffffff");sh.x=clamp(ownerNum("ownerShapeX",0),-80,80);sh.y=clamp(ownerNum("ownerShapeY",0),-110,110);sh.w=clamp(ownerNum("ownerShapeW",20),3,160);sh.h=clamp(ownerNum("ownerShapeH",20),3,160);sh.rot=clamp(ownerNum("ownerShapeRot",0),-180,180);renderOwnerShapeList();ownerDrawPreview()}
function renderOwnerBuilder(){
 const tower=ownerValue("ownerBuildTeam",OWNER_EDIT.team||"tower")==="tower";document.querySelectorAll("[data-owner-tower-only]").forEach(e=>e.classList.toggle("hidden",!tower));document.querySelectorAll("[data-owner-zombie-only]").forEach(e=>e.classList.toggle("hidden",tower));
 if($("ownerBuildCount"))$("ownerBuildCount").textContent=`${ownerBuildStore("tower").length}/15 TOWERS • ${ownerBuildStore("zombie").length}/15 ZOMBIES`;renderOwnerSummonOptions();renderOwnerShapeList();ownerDrawPreview()
}
function ownerSaveBuild(){
 if(!profile.ownerAccess)return;const b=ownerCollectBuild(),arr=ownerBuildStore(b.team);if(!b.id){if(arr.length>=15){alert("Maximum 15 "+b.team+" builds.");return}b.id="owner_"+(b.team==="tower"?"t_":"z_")+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
 const copy=JSON.parse(JSON.stringify(b)),idx=arr.findIndex(x=>x.id===b.id);if(idx>=0)arr[idx]=copy;else arr.push(copy);OWNER_EDIT=copy;save();renderOwnerBuildList();renderOwnerBuilder();renderClasses();if(G&&G.running)renderClasses("swapGrid");banner?.("OWNER BUILD SAVED • "+copy.name)
}
function ownerOpen(){if(!profile.ownerAccess)return;$('ownerOverlay').classList.remove('hidden');renderOwnerBuildList();renderOwnerBuilder();ownerRefreshMajorList();AUDIO.ui()}
function ownerRefreshMajorList(){const e=$("ownerMajorSelect");if(!e)return;e.innerHTML=zombieClasses.filter(z=>z.major).map(z=>`<option value="${z.id}">${z.name} • ${z.tier||"MAJOR"}</option>`).join("")}


function renderBossIndex(){
 const g=$("bossIndexGrid");if(!g)return;g.innerHTML="";
 const ids=["boss1","boss2","boss3","boss4","boss5","necroboss","guardian","king1","king2","kinghidden","king3","king4","lord1","lord2","lordhidden","lord3","lord4","planet3arth","void","void2","kingjack","autumnlord"];
 for(const id of ids){
  const c=zombieClasses.find(z=>z.id===id);if(!c)continue;
  const playable=c.playable!==false||profile.ownerAccess&&c.major, tier=c.major?(profile.ownerAccess?"MAJOR • OWNER PLAYABLE":"MAJOR • NPC ONLY"):(c.tier||"BOSS");
  const req=c.major?(profile.ownerAccess?"OWNER ACCESS":"NOT PLAYABLE"):`LV ${c.lvl.toLocaleString()} • W${c.wave} • ${c.cost?"$"+c.cost.toLocaleString():"FREE"}`;
  const b=document.createElement("div");b.className="boss-index-card";b.style.setProperty("--c",c.c);
  const look=BOSS_LOOKS[c.id]||"";b.innerHTML=`<span class="tier">${tier}</span><b>${c.name}</b><span>${look||c.desc||""}</span><small>${req}${c.timer?` • ${Math.round(c.timer/60*10)/10}m NPC TIMER`:""}</small>`;g.appendChild(b)
 }
}


function setupSettingsUI(){
 const defs=[
  ["masterVolume","masterVolumeOut","master"],
  ["musicVolume","musicVolumeOut","music"],
  ["sfxVolume","sfxVolumeOut","sfx"],
  ["shakeSetting","shakeSettingOut","shake"]
 ];
 defs.forEach(([id,out,key])=>{
  const el=$(id);if(!el)return;el.value=SETTINGS[key];$(out).textContent=SETTINGS[key]+"%";
  el.oninput=()=>{SETTINGS[key]=+el.value;$(out).textContent=SETTINGS[key]+"%";saveSettings();AUDIO.ensure();AUDIO.apply()}
 });
 $("damageNumbersSetting").checked=!!SETTINGS.damageNumbers;
 $("damageNumbersSetting").onchange=()=>{SETTINGS.damageNumbers=$("damageNumbersSetting").checked;saveSettings()};
 $("audioTestBtn").onclick=()=>AUDIO.preview();
 $("audioResetBtn").onclick=()=>{SETTINGS={...DEFAULT_SETTINGS};saveSettings();setupSettingsUI();AUDIO.apply();AUDIO.preview()}
}

function renderMaps(){
 const g=$("mapGrid");g.innerHTML="";maps.forEach(m=>{const locked=(m.event==="halloween"&&!HALLOWEEN)||(m.event==="fall"&&!FALL);const b=document.createElement("button");b.className="map-btn"+(selMap.id===m.id?" active":"");b.disabled=locked;b.style.setProperty("--accent",m.accent);b.innerHTML=`<b>${m.name}</b><small>${locked?"EVENT CLOSED":m.desc}</small><i></i>`;b.onclick=()=>{if(!locked){selMap=m;renderMaps()}};g.appendChild(b)})
}
function roster(){
 const all=selTeam==="tower"?towerClasses.concat(ownerTowerClasses()):zombieClasses.concat(ownerZombieClasses());
 return all.filter(c=>classAvailableForMode(c,selTeam,G?.mode||selMode))
}
function zombieCooldownLeft(c){
 if(!G||!G.zombieCooldowns)return 0;
 const key=c.cooldownGroup||c.id;return Math.max(0,(G.zombieCooldowns[key]||0)-G.elapsed)
}
function renderClasses(target="classGrid"){
 const g=$(target);g.innerHTML="";roster().forEach(c=>{
  const sandboxLike=(G?.mode==="sandbox"||selMode==="sandbox");
  const ownerOverride=profile.ownerAccess&&(c.ownerOnly||(selTeam==="zombie"&&c.major));
  const levelLocked=ownerOverride||sandboxLike?false:profile.level<c.lvl;
  const effectiveWave=G&&G.running?G.wave:0;
  const waveLocked=ownerOverride?false:(!sandboxLike&&(c.wave||0)>effectiveWave);
  const cd=zombieCooldownLeft(c),cooldownLocked=ownerOverride?false:(selTeam==="zombie"&&cd>0);
  const startCash=selTeam==="tower"?650:400;
  const towerOwned=selTeam==="tower"&&!!G?.towerOwned?.[c.id];
  const cashLocked=ownerOverride?false:(!sandboxLike&&!towerOwned&&((G&&G.running)?c.cost>G.cash:((c.wave||0)===0&&c.cost>startCash)));
  const locked=levelLocked||waveLocked||cooldownLocked||cashLocked;
  const savedTowerLevel=selTeam==="tower"?(G?.towerUpgrades?.[c.id]||1):0;
  let lockText=ownerOverride?(c.ownerOnly?"OWNER BUILD":"OWNER MAJOR"):levelLocked?"LV "+c.lvl:waveLocked?"WAVE "+c.wave:cooldownLocked?Math.ceil(cd)+"s CD":cashLocked?"NEED $"+c.cost:towerOwned?`OWNED • UPG ${savedTowerLevel}`:(c.cost?"$"+c.cost:"FREE");
  if(c.rewardMode)lockText=ownsReward(c.id)?lockText:"WIN "+c.rewardMode.toUpperCase();
  const queued=!!(G&&G.running&&G.team==="tower"&&G.respawnClass?.id===c.id);
  const b=document.createElement("button");b.className="class-card"+(selClass.id===c.id?" active":"")+(locked?" locked":"")+(towerOwned?" owned":"")+(queued?" queued":"");b.style.setProperty("--c",c.c);
  b.innerHTML=`<span class="icon">${c.icon}</span><b>${c.name}</b><span>${c.desc}</span><small>${lockText}</small>`;
  b.onclick=()=>{
   if(locked){AUDIO.ui();return}
   if(G&&G.running&&selTeam==="zombie"&&c.cost>G.cash){feed("NOT ENOUGH CASH","#ff6969");AUDIO.ui();return}
   selClass=c;if(G&&G.running)swapClass(c);renderClasses(target);AUDIO.ui()
  };
  g.appendChild(b)
 })
}
document.querySelectorAll("#teamSelect button").forEach(b=>b.onclick=()=>{
 const wanted=b.dataset.team;
 if(wanted==="zombie"&&profile.level<500&&selMode!=="sandbox"){AUDIO.ui();return alert("Zombie Mode unlocks at Level 500. Your bots cannot grind this for you — only your own combat gives XP.")}
 document.querySelectorAll("#teamSelect button").forEach(x=>x.classList.remove("active"));b.classList.add("active");selTeam=wanted;
 const r=roster();selClass=r[0]||towerClasses[0];
 $("rosterTitle").textContent=selTeam==="tower"?"DEFENDER ROSTER":"ZOMBIE ROSTER";
 $("rosterHint").textContent=selTeam==="tower"?"Choose your Tower":"Every paid Zombie is one life: rebuy it after death";
 renderClasses()
});
document.querySelectorAll("#serverSelect button").forEach(b=>b.onclick=()=>{
 document.querySelectorAll("#serverSelect button").forEach(x=>x.classList.remove("active"));b.classList.add("active");selServer=b.dataset.server;
 $("serverHint").textContent=selServer==="private"?"PRIVATE SOLO: YOU are the only player. ZERO fake player bots. Sandbox/Cursed unlocked. Personal damage XP still saves.":"Public Simulation fills empty slots with AI players.";
 if(selServer!=="private"&&(selMode==="sandbox"||selMode==="cursed")){selMode="classic";document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x.dataset.mode==="classic"))}
 renderClasses();AUDIO.ui()
});
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{
 const m=b.dataset.mode;
 if((m==="sandbox"||m==="cursed")&&selServer!=="private"){AUDIO.ui();return alert((m==="sandbox"?"Sandbox":"Cursed")+" is private-server only. Switch SERVER to PRIVATE SOLO first.")}
 if(m==="halloween"&&!HALLOWEEN){AUDIO.ui();return alert("Halloween Assault is only available through Nov 1, 2026.")}
 if(m==="fall"&&!FALL){AUDIO.ui();return alert("Autumn Siege is only available through Dec 1, 2026.")}
 document.querySelectorAll(".mode").forEach(x=>x.classList.remove("active"));b.classList.add("active");selMode=m;
 if(m==="halloween")selMap=maps.find(x=>x.id==="grave");
 if(m==="fall")selMap=maps.find(x=>x.id==="harvest");
 const r=roster();if(!r.some(c=>c.id===selClass.id))selClass=r[0];
 renderMaps();renderClasses();AUDIO.ui()
});
$("controlsBtn").onclick=()=>{$("controlsOverlay").classList.remove("hidden");AUDIO.ui()};$("bossIndexBtn").onclick=()=>{renderBossIndex();$("bossIndexOverlay").classList.remove("hidden");AUDIO.ui()};$("eventBtn").onclick=()=>{$("eventOverlay").classList.remove("hidden");AUDIO.ui()};$("skinsBtn").onclick=()=>{renderSkins();$("skinsOverlay").classList.remove("hidden");AUDIO.ui()};$("codesBtn").onclick=()=>{$("codesOverlay").classList.remove("hidden");codeStatus(profile.ownerAccess?"8B OWNED • LEVEL 8000 + OWNER ACCESS ACTIVE.":"8B CAN BE CLAIMED BY EXACTLY ONE PLAYER WORLDWIDE.");setTimeout(()=>$("codeInput")?.focus(),30);AUDIO.ui()};$("redeemCodeBtn").onclick=redeemCode;$("codeInput").addEventListener("keydown",e=>{if(e.key==="Enter")redeemCode()});$("ownerBtn").onclick=ownerOpen;$("ownerHudBtn").onclick=ownerOpen;$("settingsBtn").onclick=()=>{$("settingsOverlay").classList.remove("hidden");AUDIO.ui()};$("settingsHudBtn").onclick=()=>{$("settingsOverlay").classList.remove("hidden");AUDIO.ui()};document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{$(b.dataset.close).classList.add("hidden");AUDIO.ui()});
if($("ownerApplyWave"))$("ownerApplyWave").onclick=()=>ownerSetWave(ownerNum("ownerWave",G?.wave||1));
if($("ownerRareWave"))$("ownerRareWave").onclick=ownerStartAnomaly;
if($("ownerBecomeMajor"))$("ownerBecomeMajor").onclick=ownerBecomeMajor;
if($("ownerBuildTeam"))$("ownerBuildTeam").onchange=()=>{OWNER_EDIT=newOwnerBuild(ownerValue("ownerBuildTeam","tower"));ownerFillBuild(OWNER_EDIT)};
if($("ownerNewBuild"))$("ownerNewBuild").onclick=()=>ownerFillBuild(newOwnerBuild(ownerValue("ownerBuildTeam","tower")));
if($("ownerSaveBuild"))$("ownerSaveBuild").onclick=ownerSaveBuild;
if($("ownerAddShape"))$("ownerAddShape").onclick=()=>{ownerCollectBuild();OWNER_EDIT.visual=Array.isArray(OWNER_EDIT.visual)?OWNER_EDIT.visual:[];if(OWNER_EDIT.visual.length>=24)return alert("Maximum 24 decoration shapes per build.");OWNER_EDIT.visual.push({kind:ownerValue("ownerShapeKind","rect"),color:ownerValue("ownerShapeColor","#ffffff"),x:ownerNum("ownerShapeX",0),y:ownerNum("ownerShapeY",0),w:ownerNum("ownerShapeW",20),h:ownerNum("ownerShapeH",20),rot:ownerNum("ownerShapeRot",0)});OWNER_SELECTED_SHAPE=OWNER_EDIT.visual.length-1;renderOwnerBuilder();ownerLoadShapeEditor()};
if($("ownerDeleteShape"))$("ownerDeleteShape").onclick=()=>{if(OWNER_SELECTED_SHAPE<0)return;OWNER_EDIT.visual.splice(OWNER_SELECTED_SHAPE,1);OWNER_SELECTED_SHAPE=Math.min(OWNER_SELECTED_SHAPE,OWNER_EDIT.visual.length-1);renderOwnerBuilder();ownerLoadShapeEditor()};
for(const id of ["ownerShapeKind","ownerShapeColor","ownerShapeX","ownerShapeY","ownerShapeW","ownerShapeH","ownerShapeRot"])if($(id))$(id).addEventListener("input",ownerApplyShapeEditor);
for(const id of ["ownerBuildName","ownerBaseColor","ownerAccentColor","ownerHp","ownerSpeed","ownerDamage","ownerRate","ownerRange","ownerMag","ownerReload","ownerGun","ownerCost","ownerUnlockWave","ownerUpgradeBase","ownerRespawnCooldown","ownerBuildKind","ownerQAbility","ownerEAbility","ownerQCooldown","ownerECooldown","ownerSummonTarget","ownerSummonCount","ownerBossTimer"])if($(id))$(id).addEventListener("input",()=>{ownerCollectBuild();ownerDrawPreview()});
$("resetBtn").onclick=()=>{if(confirm("Reset Battlefront: Reforged progress?")){try{localStorage.removeItem("bfr2")}catch{}profile=load();setupLobby()}};
$("deployBtn").onclick=start;$("leaveBtn").onclick=()=>finish(false,true);$("returnBtn").onclick=returnLobby;
setupLobby();setupSettingsUI();
addEventListener("pointerdown",()=>{AUDIO.ensure();if(!AUDIO.musicTimer)AUDIO.setMusic(G&&G.running?"battle":"lobby")},{once:true});

function buildWorld(){
 const deco=[];
 for(let i=0;i<48;i++)deco.push({x:rand(80,WORLD.w-80),y:rand(80,WORLD.h-80),r:rand(8,25),type:Math.random()<.55?"rock":"bush"});
 const seasons=[];
 const forced=modeSeason(selMode);
 if(forced)seasons.push(forced);
 else{if(HALLOWEEN)seasons.push("halloween");if(FALL)seasons.push("fall")}
 if(seasons.includes("halloween")){
  for(let i=0;i<34;i++)deco.push({x:rand(90,WORLD.w-90),y:rand(90,WORLD.h-90),r:rand(9,18),type:i%4===0?"grave":i%5===0?"candle":"pumpkin"});
 }
 if(seasons.includes("fall")){
  for(let i=0;i<30;i++)deco.push({x:rand(90,WORLD.w-90),y:rand(90,WORLD.h-90),r:rand(10,22),type:i%4===0?"hay":i%5===0?"autumntree":"leafpile"});
 }
 return {walls:selMap.walls.map(w=>({x:w[0],y:w[1],w:w[2],h:w[3]})),deco,seasons}
}
function start(){
 if((selMode==="sandbox"||selMode==="cursed")&&selServer!=="private")return alert("Sandbox and Cursed require PRIVATE SOLO.");
 if(selServer==="private"&&selTeam==="zombie"&&selMode!=="sandbox")return alert("This static private server is solo: Zombie Mode needs opposing players. Use PUBLIC SIMULATION for Zombie Mode, or Sandbox for private Zombie testing.");
 if(selTeam==="zombie"&&profile.level<500&&selMode!=="sandbox")return alert("Zombie Mode unlocks at Level 500.");
 const startingCash=selTeam==="tower"?650:400;
 const canStart=c=>{const ownerOverride=profile.ownerAccess&&(c.ownerOnly||(selTeam==="zombie"&&c.major));return ownerOverride||selMode==="sandbox"||(profile.level>=c.lvl&&(c.wave||0)<=0&&(c.cost||0)<=startingCash)};
 const chosen=roster().find(c=>c.id===selClass.id);
 let validStart=(chosen&&canStart(chosen)?chosen:null)||roster().find(canStart)||(selTeam==="zombie"?zombieClasses.find(z=>z.id==="normal"):towerClasses.find(t=>t.id==="scout"));
 if(!validStart)return alert("No valid starting class is available for this mode.");
 if(chosen&&!canStart(chosen)&&selMode!=="sandbox"&&selMode!=="cursed"){selClass=validStart;renderClasses();}
 else selClass=validStart;
 // Only transition away from the lobby after every validation succeeds.
 $("lobby").classList.add("hidden");$("hud").classList.remove("hidden");if(isMobile)$("mobile").classList.remove("hidden");
 if(selMode==="cursed"&&selTeam==="tower"){const pool=towerClasses.filter(c=>!c.rewardMode&&!c.event&&c.lvl<=profile.level);selClass=pool[Math.floor(Math.random()*pool.length)]||selClass}
 const cls={...selClass};
 const diff=selMode==="hard"?1.55:selMode==="halloween"?1.12:selMode==="fall"?1.18:1;
 G={running:true,team:selTeam,mode:selMode,server:selServer,map:selMap,world:buildWorld(),wave:0,totalWaves:modeTotal(selMode),state:"prep",stateT:1.8,timer:0,majorTime:null,cash:selMode==="sandbox"?999999:(selTeam==="tower"?650:400),kills:0,deaths:0,personalXp:0,damageBank:0,earned:{candy:0,leaves:0},difficulty:diff,bots:[],zombies:[],bullets:[],particles:[],drops:[],cam:{x:WORLD.w/2,y:WORLD.h/2},boss:null,god:false,ai:true,spawnQueue:[],spawnCd:0,shake:0,started:performance.now()/1000,elapsed:0,zombieCooldowns:{},anomaly:null,lastRewardSkin:null,towerUpgrades:{},towerOwned:{},respawnClass:cls};
 if(G.team==="tower"){G.towerUpgrades[cls.id]=1;G.towerOwned[cls.id]=true}
 G.player=makePlayer(cls,G.team);if(G.team==="tower")applyTowerProgress(G.player,G.towerUpgrades[cls.id]||1);
 if(cls.cost>0&&G.mode!=="sandbox"&&G.mode!=="cursed"&&!(profile.ownerAccess&&(cls.ownerOnly||cls.major)))G.cash=Math.max(0,G.cash-cls.cost)
 spawnBots();
 let proof=$("privateProof");if(proof)proof.remove();
 if(G.server==="private"){proof=document.createElement("div");proof.id="privateProof";proof.className="private-proof";proof.textContent="PRIVATE SOLO • 1 PLAYER • 0 AI PLAYERS";document.body.appendChild(proof)}
 $("waveLabel").textContent="0 / "+G.totalWaves;
 $("sandboxHudBtn").classList.toggle("hidden",G.mode!=="sandbox");$("ownerHudBtn").classList.toggle("hidden",!profile.ownerAccess);
 $("candyBox").classList.toggle("hidden",!(HALLOWEEN||G.mode==="halloween"));$("leafBox").classList.toggle("hidden",!(FALL||G.mode==="fall"));
 if(G.mode==="sandbox"){G.wave=1;G.state="sandbox";G.timer=9999;banner("SANDBOX • TEST ANYTHING");$("sandboxOverlay").classList.remove("hidden");renderSandboxSpawns()}
 else if(G.server==="private")banner(G.mode==="cursed"?"PRIVATE • CURSED":"PRIVATE SOLO • ZERO PLAYER BOTS");
 else if(G.mode==="halloween")banner("🎃 HALLOWEEN ASSAULT • 15 WAVES");
 else if(G.mode==="fall")banner("🍂 AUTUMN SIEGE • 20 WAVES");
 else banner(G.team==="tower"?"DEFENDERS • HOLD THE FRONT":"ZOMBIE MODE • PROTECT THE HORDE");
 updateHUD();AUDIO.setMusic("battle");AUDIO.wave();
}
function makePlayer(c,team){
 const tower=team==="tower";return{x:tower?2050:520,y:850,vx:0,vy:0,r:["zed","goldenzed","patrol"].includes(c.id)?30:(c.tier?28:19),hp:c.hp,maxHp:c.hp,speed:c.speed,c,team,dead:false,respawn:0,fireCd:0,reload:0,ammo:c.mag||999,q:0,e:0,inv:0,angle:tower?Math.PI:0,alpha:1,towerLevel:tower?1:0,ownerBoost:0};
}
function applyTowerProgress(p,level=1){
 if(!p||p.team!=="tower")return p;
 level=clamp(Math.floor(level||1),1,5);
 p.towerLevel=level;
 p.maxHp=p.c.hp*(1+(level-1)*.16);
 p.hp=p.maxHp;
 p.ammo=(p.c.mag||999)+(p.c.mag&&p.c.mag<900?(level-1)*Math.ceil(p.c.mag*.08):0);
 return p
}

function spawnBots(){
 // Private really means private now: no fake player names, no simulated teammates.
 if(G.server==="private")return;
 const names=["Bricky","Aviate","RailKid","Potato","VoidHater","Builder","Mango","Nooblet","OsterBot","BrickWarden","ScoutMain","PumpkinPie","WaveFarmer","MinigunEnjoyer","LagWizard","SniperJoe","CommanderFan","ZedDriver"];
 const count=isEventMode(G.mode)?14:18;
 const starters=towerClasses.filter(c=>!c.rewardMode&&!c.event&&c.lvl<=1&&c.wave<=4);
 for(let i=0;i<count;i++){
  const c=starters[i%Math.min(6,starters.length)];
  G.bots.push({x:rand(1760,2320),y:rand(280,1420),r:18,hp:c.hp*.68,maxHp:c.hp*.68,speed:c.speed*.68,c,team:"tower",dead:false,respawn:0,fireCd:rand(0,.6),reload:0,ammo:c.mag,name:names[i%names.length],angle:Math.PI,inv:0,cash:200+i*18,kills:0,rank:0,power:.38,towerLevel:1});
 }
 if(G.team==="zombie"){
  const zcount=isEventMode(G.mode)?6:8;
  for(let i=0;i<zcount;i++){const c=zombieClasses[i%3];const z=makeZombie(c,true,"ZM_Player"+(i+1));z.cash=150+i*60;z.kills=0;G.zombies.push(z)}
 }
}
function makeZombie(c,playerBot=false,name=""){
 const boss=!!c.tier||!!c.major;
 // Majors already carry authored endgame HP; don't multiply them again by wave scaling.
 const mult=c.major?1:(boss?G.difficulty*(1+Math.max(0,G.wave-1)*.010):G.difficulty*(1+Math.max(0,G.wave-1)*.024));
 return{x:rand(250,650),y:rand(250,1450),r:c.major?46:boss?Math.min(42,24+(c.hp/3000)*4):c.id.startsWith("boss")?27:18,hp:c.hp*mult,maxHp:c.hp*mult,speed:c.speed*(c.major?.82:boss?.86:.9),baseSpeed:c.speed,dmg:c.dmg*(c.major?1:G.difficulty),baseDmg:c.dmg,rate:c.rate,c,team:"zombie",dead:false,respawn:0,fireCd:rand(0,.5),stun:0,stealth:0,playerBot,name,angle:0,alpha:1,boss,ability:c.custom?Math.max(2,c.eCooldown||c.qCooldown||8):(["boss3","king3","lord3"].includes(c.id)?50:rand(3,8)),phase2:false};
}
function waveList(n){
 let out=[],table=modeWaveTable(G?.mode||selMode);
 (table[n-1]||[]).forEach(([id,count])=>{
  let use=id;
  if(G&&G.mode==="hard"){
   const hardMap={king1:"lord1",king2:"lord2",kinghidden:"lordhidden",king3:"lord3",king4:"lord4",void:"void2"};
   use=hardMap[id]||id;if(count>1&&use!=="void2")count=Math.ceil(count*1.12)
  }
  let c=zombieClasses.find(z=>z.id===use);
  if(G&&G.mode==="cursed"&&c&&!c.major){const pool=zombieClasses.filter(z=>z.playable!==false&&!z.event&&!z.rewardMode&&!z.secret&&(z.wave||0)<=Math.max(1,G.wave));c=pool[Math.floor(Math.random()*pool.length)]||c}
  if(c)for(let i=0;i<count;i++)out.push(c)
 });
 return out;
}

function npcActiveCount(){
 if(!G)return 0;
 return G.zombies.filter(z=>!z.dead&&!z.playerBot).length
}
function npcActiveLimit(){
 if(!G)return 18;
 // The real wave can contain many enemies, but they should arrive as a stream instead of one giant mob.
 if(G.mode==="halloween"||G.mode==="fall")return G.wave<8?14:G.wave<15?18:22;
 if(G.wave<=5)return 14;
 if(G.wave<=12)return 18;
 if(G.wave<=22)return 22;
 if(G.wave<=32)return 26;
 return 30;
}
function spawnDelayFor(c){
 if(!G)return .45;
 if(c?.major)return 1.25;
 if(c?.tier==="LORD"||c?.tier==="KING"||c?.tier==="PLANET")return .85;
 if(c?.tier==="BOSS")return .62;
 if(G.wave<=5)return .52;
 if(G.wave<=15)return .42;
 if(G.wave<=28)return .34;
 return .29;
}

function beginWave(){
 G.wave++;profile.bestWave=Math.max(profile.bestWave,G.wave);save();G.spawnQueue=waveList(G.wave);G.state="spawn";G.spawnCd=.1;
 const timed=G.spawnQueue.find(c=>c&&c.timer),boss=G.spawnQueue.find(c=>c&&c.tier);
 G.majorTime=null;G.timedBossId=timed?.id||null;
 G.timer=isEventMode(G.mode)?90:75;
 $("waveLabel").textContent=G.wave+" / "+G.totalWaves;banner(boss?`${boss.tier} • ${boss.name}`:`WAVE ${G.wave}`);
 AUDIO.wave();if(boss){AUDIO.boss();AUDIO.setMusic("boss")}else AUDIO.setMusic("battle");
 if(G.team==="zombie"){
  const unlocked=roster().filter(c=>c.wave===G.wave);
  unlocked.forEach(c=>feed("UNLOCKED • "+c.name,c.c));
 }
 payAndProgressBots(false);
}
function bossWave(n){
 const table=modeWaveTable(G?.mode||selMode),row=table[n-1]||[];
 return row.some(([id])=>zombieClasses.find(z=>z.id===id)?.tier)
}

function personalXpMultiplier(){return 1}
function awardPersonalXp(v,why="combat"){
 if(!G||G.mode==="sandbox"||G.mode==="cursed")return 0;
 const n=Math.max(0,Math.floor(v*personalXpMultiplier()));if(!n)return 0;
 G.personalXp+=n;addXp(n);return n
}
function killXpFor(c){
 if(c.major)return 650;
 if(c.tier==="LORD")return 220;
 if(c.tier==="KING"||c.tier==="PLANET")return 140;
 if(c.tier==="BOSS"||c.tier==="ODDITY")return 45;
 return Math.max(3,Math.round((c.hp||150)/75))
}
function finalMajorForMode(){return G.mode==="hard"?"Void2":G.mode==="halloween"?"King Jack":G.mode==="fall"?"Autumn Lord":G.mode==="cursed"?"Cursed Void":"Void"}

function update(dt){
 if(!G||!G.running)return;G.elapsed+=dt;G.shake=Math.max(0,G.shake-dt*22);updatePlayer(dt);if(G.ai)updateBots(dt);updateZombies(dt);updateBullets(dt);updateParticles(dt);
 if(G.mode!=="sandbox"){
  if(G.majorTime!=null&&G.boss&&!G.boss.dead&&G.boss.c.timer){
   G.majorTime-=dt;
   if(G.majorTime<=0){
    G.majorTime=0;
    if(G.anomaly){banner("ANOMALY ESCAPED • BASE WIN KEPT");G.anomaly=null;finish(true)}
    else if(G.team==="tower"){banner(G.boss.c.major?"MAJOR TIMER EXPIRED":"BOSS TIMER EXPIRED");finish(false)}
    else{banner((G.boss?.c?.major?"MAJOR":"BOSS")+" SURVIVED");finish(true)}
    return
   }
  }
  if(G.state==="anomalyIntro"){
   G.stateT-=dt;
   if(G.stateT<=0)startAnomalyOddities()
  }else if(G.state==="anomaly"){
   if(G.zombies.filter(z=>!z.dead&&!z.playerBot).length===0){
    if(G.anomaly.stage===1)startAnomalyMajor();
    else if(G.anomaly.stage===2)finish(true)
   }
  }else{
   G.timer-=dt;
   if(G.state==="prep"){G.stateT-=dt;if(G.stateT<=0)beginWave()}
   else if(G.state==="spawn"){
    G.spawnCd-=dt;
    const activeNpc=npcActiveCount(),limit=npcActiveLimit();
    if(G.spawnQueue.length&&G.spawnCd<=0&&activeNpc<limit){
     const c=G.spawnQueue.shift(),z=makeZombie(c);G.zombies.push(z);
     if(z.boss){if(z.c.timer&&G.timedBossId===z.c.id&&G.majorTime==null)G.majorTime=z.c.timer;refreshBossHud();AUDIO.boss();AUDIO.setMusic("boss")}
     G.spawnCd=spawnDelayFor(c);
    }else if(activeNpc>=limit&&G.spawnCd<=0){
     // Hold the remaining wave in reserve until the team thins the current group.
     G.spawnCd=.12;
    }
    if(!G.spawnQueue.length)G.state="fight"
   }else if(G.state==="fight"){
    const waveAlive=G.zombies.filter(z=>!z.dead&&!z.playerBot).length;
    if(G.team==="tower"&&waveAlive===0){
     if(G.wave>=G.totalWaves)completeModeWin();
     else{G.state="prep";G.stateT=2.2;G.cash+=Math.floor((180+G.wave*22)*(G.mode==="hard"?.9:1));
      if(G.mode==="halloween")G.earned.candy+=4;else if(HALLOWEEN&&Math.random()<.5)G.earned.candy+=1;
      if(G.mode==="fall")G.earned.leaves+=4;else if(FALL)G.earned.leaves+=2;
      payAndProgressBots(true);banner("WAVE CLEARED")
     }
    }else if(G.team==="zombie"){
     if(waveAlive===0){
      // TBBF-style Zombie Mode: wiping a horde does NOT defeat the human Zombie player.
      // The match only ends when the Defender side loses. If the final horde is wiped,
      // reform the final wave instead of showing a Zombie defeat screen.
      G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);G.majorTime=null;G.timedBossId=null;
      if(G.wave>=G.totalWaves){G.wave=Math.max(0,G.totalWaves-1);G.state="prep";G.stateT=2.0;banner("FINAL HORDE REFORMING")}
      else{G.state="prep";G.stateT=2.0;G.cash+=Math.floor((220+G.wave*28)*(G.mode==="hard"?.9:1));payAndProgressBots(true);banner("NEXT HORDE")}
      return
     }
     if(G.timer<=0&&G.majorTime==null){
      // Zombie team successfully protects the wave until time runs out.
      G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);
      if(G.wave>=G.totalWaves){completeModeWin()}
      else{G.state="prep";G.stateT=2.0;G.cash+=Math.floor((220+G.wave*28)*(G.mode==="hard"?.9:1));payAndProgressBots(true);banner("WAVE DEFENDED")}
     }
    }
   }
  }
 }
 updateCamera(dt);updateHUD();
}
function updatePlayer(dt){
 const p=G.player;if(p.inv>0)p.inv-=dt;if(p.dead){p.respawn-=dt;if(p.respawn<=0)respawnPlayer();return}
 if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=p.c.mag||999}
 p.fireCd-=dt;p.q=Math.max(0,p.q-dt);p.e=Math.max(0,p.e-dt);p.ownerBoost=Math.max(0,(p.ownerBoost||0)-dt);
 let dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+mMove.x,dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+mMove.y,m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
 let sp=p.speed*(keys.shift?1.22:1);moveEntity(p,dx*sp*dt,dy*sp*dt);
 if(isMobile&&Math.hypot(mAim.x,mAim.y)>.1)p.angle=Math.atan2(mAim.y,mAim.x);else{let wp=screenWorld(mouse.x,mouse.y);p.angle=Math.atan2(wp.y-p.y,wp.x-p.x)}
 if((mouse.down||mAim.fire||keys[" "])&&p.fireCd<=0&&p.reload<=0)attackPlayer();
}
function attackPlayer(){
 const p=G.player,c=p.c;if(p.team==="tower"){
  if(p.ammo<=0){reload();return}p.ammo--;const tl=p.towerLevel||1,rateMult=Math.max(.68,1-(tl-1)*.07);p.fireCd=c.rate*rateMult*((p.e>7||p.ownerBoost>0)?.55:1);
  if(c.gun==="ram"){melee(p,75,95);return}
  const pellets=c.gun==="shotgun"?7:1;for(let i=0;i<pellets;i++){let a=p.angle+rand(-(c.gun==="shotgun"?.14:.018),(c.gun==="shotgun"?.14:.018));let speed=c.gun==="rocket"?560:c.gun==="rail"?1150:900;G.bullets.push({x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:c.gun==="rocket"?7:3,dmg:c.dmg*(1+(tl-1)*.22),life:c.range/speed,team:"tower",c:c.c,pierce:c.gun==="rail"?4:1,rocket:c.gun==="rocket",owner:p})}
  soundShot(c.gun);
 }else{p.fireCd=c.rate;melee(p,c.dmg,p.r+42)}
}
function reload(){const p=G.player;if(p.team==="tower"&&p.reload<=0&&p.ammo<(p.c.mag||999)){p.reload=p.c.reload||1.4;AUDIO.reload()}}
function melee(src,dmg,range){
 const targets=src.team==="tower"?G.zombies:G.bots.concat(G.player.team==="tower"?[G.player]:[]);let hit=false;
 targets.forEach(t=>{if(t.dead||t===src)return;if(dd(src,t)<range+(t.r||18)){damage(t,dmg,src);hit=true}});
 if(hit){impact(src.x+Math.cos(src.angle)*35,src.y+Math.sin(src.angle)*35,src.c.c,8);sound(95,.05,.05)}
}
function runOwnerCustomAbility(which){
 const p=G.player,c=p.c;if(!c.custom)return false;const ability=which==="q"?c.qAbility:c.eAbility,cd=which==="q"?c.qCooldown:c.eCooldown;if(which==="q")p.q=cd;else p.e=cd;AUDIO.ability();
 if(ability==="dash"||ability==="lunge"){const dist=ability==="dash"?175:125;moveEntity(p,Math.cos(p.angle)*dist,Math.sin(p.angle)*dist);p.inv=.25;if(ability==="lunge")melee(p,c.dmg*1.8,p.r+105)}
 else if(ability==="heal"){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.38);banner(c.name+" • HEAL")}
 else if(ability==="shield"){p.inv=3;banner(c.name+" • SHIELD")}
 else if(ability==="burst"||ability==="frenzy"){p.fireCd=-1;if(p.team==="tower")p.ownerBoost=3.5;else{p.speed*=1.3;setTimeout(()=>{if(G&&G.running&&G.player===p)p.speed=c.speed},3000)}banner(c.name+" • "+(ability==="burst"?"OVERDRIVE":"FRENZY"))}
 else if(ability==="barrage"&&p.team==="tower"){for(let i=-4;i<=4;i++){let a=p.angle+i*.08;G.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*560,vy:Math.sin(a)*560,r:7,dmg:c.dmg*1.8,life:1.8,team:"tower",c:c.c,pierce:1,rocket:true,owner:p})}banner(c.name+" • BARRAGE")}
 else if(ability==="stomp"){const radius=p.c.tier?330:220;const targets=p.team==="tower"?G.zombies:G.bots.concat(G.player.team==="tower"?[G.player]:[]);targets.forEach(t=>{if(t!==p&&!t.dead&&dd(t,p)<radius)damage(t,c.dmg*2,p)});impact(p.x,p.y,c.c,35);banner(c.name+" • STOMP")}
 else if(ability==="summon"&&p.team==="zombie"){const sc=findOwnerZombie(c.summonId);if(sc){for(let i=0;i<clamp(c.summonCount||1,1,6);i++){const z=makeZombie(sc,false);z.x=p.x+rand(-90,90);z.y=p.y+rand(-90,90);G.zombies.push(z)}banner(c.name+" • SUMMONED "+sc.name)}else feed("CHOOSE A BUILT ZOMBIE TO SUMMON","#ffb35c")}
 return true
}
function useAbility(which){
 if(!G||G.player.dead)return;const p=G.player;if(p.c.custom){if((which==="q"&&p.q>0)||(which==="e"&&p.e>0))return;runOwnerCustomAbility(which);return}
 if(which==="q"){if(p.q>0)return;p.q=6;AUDIO.ability();
  if(p.team==="tower"){
   if(["scout","sniper","marksman","rail","golden","goldenscout","tweeter","archer"].includes(p.c.id)){moveEntity(p,Math.cos(p.angle)*145,Math.sin(p.angle)*145);p.inv=.25}
   else if(p.c.id==="enforcer"){melee(p,60,130)}
   else if(p.c.id==="commander"){G.bots.forEach(b=>{if(!b.dead&&dd(b,p)<450){b.hp=Math.min(b.maxHp,b.hp+35);b.fireCd=0}});banner("RALLY")}
   else if(["fragger","tuber","mortar","hallowboomer","pumpkinpaladin"].includes(p.c.id)){moveEntity(p,-Math.cos(p.angle)*110,-Math.sin(p.angle)*110)}
   else if(["zed","goldenzed","patrol"].includes(p.c.id)){moveEntity(p,Math.cos(p.angle)*190,Math.sin(p.angle)*190);melee(p,120,110)}
   else p.fireCd=-.5;
  }else{
   if(["speedy","lightning","boss3","king2","king3","lord3"].includes(p.c.id)){moveEntity(p,Math.cos(p.angle)*180,Math.sin(p.angle)*180);p.inv=.25}
   else if(["necro","reaper","void","void2","kingjack","autumnlord"].includes(p.c.id)){for(let i=0;i<(p.c.tier?4:3);i++)G.zombies.push(makeZombie(zombieClasses[Math.floor(rand(0,3))],false))}
   else melee(p,p.c.dmg*1.8,p.r+90);
  }
 }else{if(p.e>0)return;const boss3Family=["boss3","king3","lord3"].includes(p.c.id);p.e=boss3Family?50:13;AUDIO.ability();
  if(p.team==="tower"){
   if(p.c.id==="commander"){for(let i=0;i<8;i++)setTimeout(()=>{if(G&&G.running){let z=nearest(G.zombies.filter(z=>!z.dead),p);if(z){damage(z,95,p);impact(z.x,z.y,"#ffca5a",15)}}},i*120)}
   else if(["fragger","tuber","mortar","hallowboomer","pumpkinpaladin"].includes(p.c.id)){for(let i=-3;i<=3;i++){let a=p.angle+i*.095;G.bullets.push({x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:8,dmg:p.c.id==="hallowboomer"||p.c.id==="pumpkinpaladin"?105:115,life:1.5,team:"tower",c:p.c.c,pierce:1,rocket:true,owner:p})}}
   else if(p.c.id==="rail"){let z=nearest(G.zombies.filter(z=>!z.dead),p);if(z)damage(z,650,p)}
   else{p.hp=Math.min(p.maxHp,p.hp+80);p.inv=2}
  }else{
   if(boss3Family){spawnNamed(p.c.id==="boss3"?"boss3support":"king3support",3,p);banner(p.c.name+" • 3 SUPPORTERS • 50s COOLDOWN")}
   else{const radius=p.c.tier?270:170;G.bots.forEach(b=>{if(!b.dead&&dd(b,p)<radius)damage(b,p.c.dmg*1.6,p)});if(G.player.team==="tower"&&!G.player.dead&&dd(G.player,p)<radius)damage(G.player,p.c.dmg*1.6,p);impact(p.x,p.y,p.c.c,30)}
  }
 }
}
function swapClass(c){
 if(!G)return;
 const ownerOverride=profile.ownerAccess&&(c.ownerOnly||(G.team==="zombie"&&c.major));if(c.playable===false&&!ownerOverride){feed("MAJOR BOSSES REQUIRE OWNER ACCESS","#ff6969");return}

 if(G.team==="tower"){
  if(!ownerOverride&&G.mode!=="sandbox"&&(c.wave||0)>G.wave){feed("UNLOCKS AT WAVE "+c.wave,"#ff6969");return}
  const owned=!!G.towerOwned?.[c.id];
  if(!ownerOverride&&G.mode!=="sandbox"&&!owned&&(c.cost||0)>G.cash){feed("NOT ENOUGH CASH","#ff6969");return}

  // A Tower purchase is permanent for this match. Switching back to it later is free.
  if(!owned){
   if(!ownerOverride&&G.mode!=="sandbox")G.cash-=c.cost||0;
   G.towerOwned[c.id]=true;
   if(!G.towerUpgrades[c.id])G.towerUpgrades[c.id]=1;
   feed("PURCHASED • "+c.name,c.c)
  }

  selClass=c;
  G.respawnClass=c;

  if(G.mode==="sandbox"&&!G.player.dead){
   const keep={x:G.player.x,y:G.player.y};
   G.player=makePlayer({...c},"tower");G.player.x=keep.x;G.player.y=keep.y;G.player.inv=.5;
   applyTowerProgress(G.player,G.towerUpgrades[c.id]||1);
   feed("SANDBOX SWAP • "+c.name,c.c)
  }else{
   feed((G.player.dead?"RESPAWN QUEUED • ":"NEXT RESPAWN • ")+c.name,c.c)
  }

  $("rosterOverlay").classList.add("hidden");renderClasses("swapGrid");updateHUD();AUDIO.ui();return
 }

 if(!ownerOverride&&G.mode!=="sandbox"&&!G.player.dead){feed("ZOMBIE SWAP AVAILABLE AFTER DEATH","#f5b457");AUDIO.ui();return}
 if(G.team==="zombie"){
  if(!ownerOverride&&G.mode!=="sandbox"&&profile.level<c.lvl){feed("REQUIRES LEVEL "+c.lvl,"#ff6969");return}
  if(!ownerOverride&&G.mode!=="sandbox"&&c.wave>G.wave){feed("UNLOCKS AT WAVE "+c.wave,"#ff6969");AUDIO.ui();return}
  const left=ownerOverride?0:zombieCooldownLeft(c);if(left>0){feed(c.name+" COOLDOWN • "+Math.ceil(left)+"s","#ffb35c");return}
  if(!ownerOverride&&c.cost>0){if(G.cash<c.cost){feed("NOT ENOUGH CASH","#ff6969");AUDIO.ui();return}G.cash-=c.cost}
  if(G.player.dead&&G.mode!=="sandbox"){
   G.respawnClass=c;selClass=c;$("rosterOverlay").classList.add("hidden");feed("RESPAWN QUEUED • "+c.name,c.c);updateHUD();AUDIO.ui();return
  }
 }
 const keep={x:G.player.x,y:G.player.y,dead:G.player.dead,respawn:G.player.respawn};G.player=makePlayer({...c},G.team);G.player.x=keep.x;G.player.y=keep.y;G.player.dead=keep.dead;G.player.respawn=keep.respawn;
 $("rosterOverlay").classList.add("hidden");updateHUD();AUDIO.ui();
}


function towerUpgradeCost(c,level){const base=c.upgradeBase||Math.max(250,(c.cost||300)*.65);return Math.floor(base*Math.pow(1.65,Math.max(0,level-1)))}
function towerUpgradeWave(level){return [0,0,2,4,6,8][Math.min(5,level+1)]||8}
function upgradeTower(){
 if(!G||G.team!=="tower"||G.player.dead){if(G?.player?.dead)feed("WAIT UNTIL YOU RESPAWN","#ffb35c");return}
 const p=G.player,l=p.towerLevel||1;if(l>=5){feed("TOWER MAX LEVEL","#ffd76a");return}
 const next=l+1,gate=towerUpgradeWave(l),cost=towerUpgradeCost(p.c,l);
 if(G.mode!=="sandbox"&&G.wave<gate){feed("UPGRADE UNLOCKS WAVE "+gate,"#ffb35c");try{navigator.vibrate?.(35)}catch{}return}
 if(G.mode!=="sandbox"&&G.cash<cost){feed("NEED $"+cost,"#ff6969");try{navigator.vibrate?.([25,30,25])}catch{}return}
 if(G.mode!=="sandbox")G.cash-=cost;
 const ratio=p.hp/Math.max(1,p.maxHp);p.towerLevel=next;p.maxHp=p.c.hp*(1+(next-1)*.16);p.hp=Math.max(1,p.maxHp*ratio);p.ammo=(p.c.mag||999)+(p.c.mag&&p.c.mag<900?(next-1)*Math.ceil(p.c.mag*.08):0);
 G.towerOwned[p.c.id]=true;G.towerUpgrades[p.c.id]=next;
 feed(p.c.name+" UPGRADED • LEVEL "+next+" • SAVED FOR THIS MATCH","#ffd76a");AUDIO.ability();try{navigator.vibrate?.(45)}catch{}renderClasses("swapGrid");updateHUD()
}

const BOT_PATH=[
 {id:"scout",wave:0,cost:0},{id:"soldier",wave:3,cost:500},{id:"mercenary",wave:6,cost:1200},{id:"shotgunner",wave:9,cost:1500},{id:"commando",wave:14,cost:3000},{id:"rail",wave:20,cost:4800},{id:"phaser",wave:26,cost:6500}
];
function ownerWaveUpgradeLevel(w){return w>=32?5:w>=24?4:w>=16?3:w>=8?2:1}
function ownerScaleTowersToWave(w){
 if(!G)return;const lvl=ownerWaveUpgradeLevel(w),path=BOT_PATH.filter(x=>x.wave<=w).at(-1)||BOT_PATH[0];
 for(const b of G.bots){const c=towerClasses.find(t=>t.id===path.id)||b.c;b.c=c;b.towerLevel=Math.max(b.towerLevel||1,lvl);b.power=Math.max(b.power||.38,.38+(b.towerLevel-1)*.07);b.maxHp=c.hp*(.68+(b.towerLevel-1)*.075);b.hp=b.maxHp;b.speed=c.speed*.68;b.ammo=c.mag||999;b.cash=Math.max(b.cash||0,200+w*250)}
 if(G.team==="tower"&&G.player&&!G.player.dead){const p=G.player;G.towerOwned[p.c.id]=true;G.towerUpgrades[p.c.id]=Math.max(G.towerUpgrades[p.c.id]||1,lvl);applyTowerProgress(p,G.towerUpgrades[p.c.id])}
 for(const id of Object.keys(G.towerUpgrades||{}))G.towerUpgrades[id]=Math.max(G.towerUpgrades[id]||1,lvl)
}
function ownerSetWave(target){
 if(!profile.ownerAccess||!G||!G.running)return;target=clamp(Math.floor(+target||1),1,G.totalWaves);G.spawnQueue=[];G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);G.boss=null;G.majorTime=null;G.timedBossId=null;$("bossHud").classList.add("hidden");G.wave=target-1;G.state="prep";G.stateT=.05;G.timer=0;ownerScaleTowersToWave(target);$("ownerWave").value=target;banner("OWNER • JUMPING TO WAVE "+target);setTimeout(()=>{if(G&&G.running&&G.state==="prep")beginWave()},80);renderClasses("swapGrid");updateHUD()
}
function ownerStartAnomaly(){
 if(!profile.ownerAccess||!G||!G.running)return;G.spawnQueue=[];G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);G.boss=null;G.majorTime=null;G.timedBossId=null;G.anomaly={stage:0,skin:ANOMALY_SKIN[G.mode]||"staticcrown"};G.state="anomalyIntro";G.stateT=.6;document.body.classList.add("anomaly-flash");AUDIO.setMusic("weird");banner("OWNER • WAVE 0000000");setTimeout(()=>document.body.classList.remove("anomaly-flash"),1200)
}
function ownerBecomeMajor(){
 if(!profile.ownerAccess||!G||!G.running||G.team!=="zombie"){feed("OWNER MAJOR PLAY REQUIRES ZOMBIE TEAM","#ffb35c");return}const c=zombieClasses.find(z=>z.id===ownerValue("ownerMajorSelect","void"));if(!c||!c.major)return;selClass=c;G.respawnClass=c;const keep={x:G.player.x,y:G.player.y};G.player=makePlayer({...c},"zombie");G.player.x=keep.x;G.player.y=keep.y;G.player.inv=1;$("ownerOverlay").classList.add("hidden");banner("OWNER MAJOR • "+c.name.toUpperCase());updateHUD()
}
function payAndProgressBots(waveClear){
 if(!G)return;for(const b of G.bots){if(waveClear)b.cash+=(90+G.wave*18);tryBotUpgrade(b)}
 if(G.team==="zombie"&&waveClear)for(const z of G.zombies.filter(z=>z.playerBot)){z.cash=(z.cash||0)+(85+G.wave*18);tryZombieBotUpgrade(z)}
}
function tryBotUpgrade(b){
 // Bots level their current Tower before buying a stronger one. They are intentionally weaker than the human.
 if((b.towerLevel||1)<5){const cost=towerUpgradeCost(b.c,b.towerLevel||1);if(G.wave>=towerUpgradeWave(b.towerLevel||1)&&b.cash>=cost){b.cash-=cost;b.towerLevel++;b.power=Math.min(.66,(b.power||.38)+.045);b.maxHp*=1.08;b.hp=Math.min(b.maxHp,b.hp+25);return}}
 const idx=Math.max(0,BOT_PATH.findIndex(x=>x.id===b.c.id)),next=BOT_PATH[Math.min(BOT_PATH.length-1,idx+1)];
 if(next&&next.id!==b.c.id&&G.wave>=next.wave&&b.cash>=next.cost){b.cash-=next.cost;b.c=towerClasses.find(c=>c.id===next.id)||b.c;b.towerLevel=1;b.power=Math.min(.66,(b.power||.38)+.02);b.maxHp=b.c.hp*.68;b.hp=b.maxHp;b.speed=b.c.speed*.68;feed(`${b.name} bought ${b.c.name}`,b.c.c)}
}
function tryZombieBotUpgrade(z){
 const choices=zombieClasses.filter(c=>c.playable!==false&&!c.event&&!c.rewardMode&&!c.secret&&c.lvl<=1500&&(c.wave||0)<=G.wave&&(!c.cost||c.cost<=z.cash)&&!["KING","LORD","PLANET"].includes(c.tier));
 if(!choices.length)return;choices.sort((a,b)=>(a.wave||0)-(b.wave||0));const c=choices.at(-1);if(c&&c.id!==z.c.id){z.cash-=c.cost||0;z.c=c;z.maxHp=c.hp*G.difficulty*.75;z.hp=z.maxHp;z.speed=c.speed*.82;z.dmg=c.dmg*G.difficulty*.75;feed(`${z.name} became ${c.name}`,c.c)}
}

function updateBots(dt){
 G.bots.forEach(b=>{if(b.dead){b.respawn-=dt;if(b.respawn<=0){b.dead=false;b.hp=b.maxHp;b.x=rand(1800,2250);b.y=rand(250,1450)}return}if(b.inv>0)b.inv-=dt;b.fireCd-=dt;
  let hostiles=G.zombies.filter(z=>!z.dead&&(z.alpha>=.4||dd(b,z)<120));
  if(G.player.team==="zombie"&&!G.player.dead)hostiles.push(G.player);
  let z=nearest(hostiles,b);
  if(G.player.team==="zombie"&&!G.player.dead&&dd(b,G.player)<760)z=G.player;
  if(z){
   let d=dd(b,z);b.angle=Math.atan2(z.y-b.y,z.x-b.x);
   const closeGun=b.c.gun==="shotgun"||b.c.gun==="ram";
   const ideal=closeGun?(b.c.gun==="ram"?76:125):(z===G.player?Math.min(650,b.c.range*.78):Math.min(480,b.c.range*.58));
   if(d>ideal+28)moveToward(b,z,b.speed*(closeGun?.82:.68)*dt);
   else if(!closeGun&&d<125)moveToward(b,z,-b.speed*.38*dt);
   if(d<b.c.range&&b.fireCd<=0){b.fireCd=b.c.rate*1.42;botShoot(b,z)}
  }
 })}
function botShoot(b,z){
 if(b.c.gun==="ram"||b.c.gun==="shotgun"){const reach=b.c.gun==="shotgun"?185:105;if(dd(b,z)<reach){damage(z,b.c.dmg*(b.power||.38)*(1+((b.towerLevel||1)-1)*.12)*(b.c.gun==="shotgun"?3.0:1),b);AUDIO.shot(b.c.gun)}return}
 let a=Math.atan2(z.y-b.y,z.x-b.x)+rand(-.09,.09),spd=780;
 G.bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:3,dmg:b.c.dmg*(b.power||.38)*(1+((b.towerLevel||1)-1)*.12),life:Math.max(1.2,(b.c.range||800)/780),team:"tower",c:b.c.c,pierce:1,owner:b})
}
function runOwnerNpcAbility(z){
 const c=z.c,ability=c.eAbility||c.qAbility||"stomp";
 if(ability==="heal")z.hp=Math.min(z.maxHp,z.hp+z.maxHp*.28);
 else if(ability==="shield"){z.inv=2.2;z.stun=0}
 else if(ability==="dash"||ability==="lunge"){bossCharge(z,ability==="dash"?"CUSTOM DASH":"CUSTOM LUNGE")}
 else if(ability==="frenzy"||ability==="burst"){z.speed*=1.18;z.dmg*=1.12;setTimeout(()=>{if(G&&G.running&&!z.dead){z.speed=z.baseSpeed*(z.c.major?.82:z.boss?.86:.9);z.dmg=z.baseDmg*(z.c.major?1:G.difficulty)}},2600);banner(z.c.name+" • CUSTOM FRENZY")}
 else if(ability==="summon"){const sc=findOwnerZombie(c.summonId);if(sc&&G.zombies.filter(a=>!a.dead&&a.c.custom).length<45){for(let i=0;i<clamp(c.summonCount||1,1,6);i++){const a=makeZombie(sc);a.x=z.x+rand(-85,85);a.y=z.y+rand(-85,85);G.zombies.push(a)}banner(z.c.name+" • SUMMONED "+sc.name)}}
 else bossSplash(z,z.boss?310:210,1.2,"CUSTOM STOMP")
}
function updateZombies(dt){
 G.zombies.forEach(z=>{
  if(z.dead){
   if(z.playerBot){
    z.respawn=(z.respawn||0)-dt;
    if(z.respawn<=0){
     z.dead=false;z.hp=z.maxHp;z.x=rand(250,650);z.y=rand(250,1450);z.inv=1.2;z.fireCd=.5;
     feed(`${z.name} respawned as ${z.c.name}`,z.c.c)
    }
   }
   return
  }
  if(z.inv>0)z.inv-=dt;
  if(z.stealth>0){z.stealth-=dt;if(z.stealth<=0)z.alpha=1}
  if(z.stun>0){z.stun-=dt;return}z.fireCd-=dt;z.ability-=dt;
  let targets=G.bots.filter(b=>!b.dead);
  if(G.player.team==="tower"&&!G.player.dead)targets.push(G.player);
  let t=nearest(targets,z);if(!t)return;
  if(G.player.team==="tower"&&!G.player.dead&&dd(z,G.player)<520)t=G.player;
  let d=dd(z,t);z.angle=Math.atan2(t.y-z.y,t.x-z.x);
  if(d>z.r+t.r+34)moveToward(z,t,z.speed*dt);else if(z.fireCd<=0){z.fireCd=z.rate;damage(t,z.dmg,z);impact(t.x,t.y,z.c.c,5)}
  if(z.boss&&!z.phase2&&z.hp<z.maxHp*.5){z.phase2=true;z.speed*=1.14;z.dmg*=1.18;if(!["boss3","king3","lord3"].includes(z.c.id))z.ability=Math.min(z.ability,2);banner(z.c.name+" • PHASE 2");AUDIO.boss()}
  if(z.c.custom&&z.ability<=0){runOwnerNpcAbility(z);z.ability=Math.max(2,z.c.eCooldown||z.c.qCooldown||8)}
  else if(z.boss&&z.ability<=0){bossAbility(z);z.ability=["boss3","king3","lord3"].includes(z.c.id)?50:rand(z.phase2?4.2:6,z.phase2?7:10)}
 })}
function bossTargets(z){const a=G.bots.filter(b=>!b.dead);if(G.player.team==="tower"&&!G.player.dead)a.push(G.player);return a}
function bossSplash(z,r,mult,label){for(const t of bossTargets(z))if(dd(t,z)<r)damage(t,z.dmg*mult,z);impact(z.x,z.y,z.c.c,28);banner(z.c.name+" • "+label)}
function bossCharge(z,label="CHARGE"){
 const t=nearest(bossTargets(z),z);if(!t)return;const dx=t.x-z.x,dy=t.y-z.y,d=Math.hypot(dx,dy)||1;moveEntity(z,dx/d*220,dy/d*220);if(dd(t,z)<z.r+(t.r||18)+85)damage(t,z.dmg*1.25,z);impact(z.x,z.y,z.c.c,16);banner(z.c.name+" • "+label)
}
function spawnNamed(id,n,z){const c=zombieClasses.find(x=>x.id===id);if(!c)return;for(let i=0;i<n;i++){const a=makeZombie(c);a.x=z.x+rand(-90,90);a.y=z.y+rand(-90,90);G.zombies.push(a)}}
function bossAbility(z){
 const id=z.c.id;
 if(["hiddenboss","kinghidden","lordhidden"].includes(id)){z.stealth=3.2;z.alpha=.18;bossCharge(z,"VANISH");return}
 if(["boss3","king3","lord3"].includes(id)){spawnNamed(id==="boss3"?"boss3support":"king3support",3,z);banner(z.c.name+" • 3 SUPPORTERS • 50s COOLDOWN");return}
 if(["necro","necroboss"].includes(id)){spawnNamed("normal",3,z);spawnNamed("speedy",2,z);banner(z.c.name+" • SUMMON");return}
 if(id==="guardian"||id==="specialguardian"){bossSplash(z,340,1.12,"AXE OVERHEAD");return}
 if(id==="boss5"){z.speed*=1.12;z.dmg*=1.08;bossCharge(z,"RAGE RUSH");return}
 if(["king2","lord2"].includes(id)){bossCharge(z,"ROYAL CHARGE");return}
 if(["king4","lord4"].includes(id)){for(const t of bossTargets(z)){if(dd(t,z)<440){damage(t,z.dmg*.65,z);t.fireCd=(t.fireCd||0)+1.1}}impact(z.x,z.y,z.c.c,36);banner(z.c.name+" • WAR CRY");return}
 if(id==="planet3arth"){for(const t of bossTargets(z).slice(0,4)){damage(t,z.dmg*.75,z);impact(t.x,t.y,"#4fffd7",18)}banner("PLANET3ARTH • MISSILE VOLLEY");return}
 if(["void","void2","specialvoid","specialvoid2"].includes(id)){if(Math.random()<.5){spawnNamed("spawn1",2,z);spawnNamed("spawn2",2,z);spawnNamed("spawn3",1,z);banner(z.c.name+" • VOID SUPPORTERS")}else bossSplash(z,z.phase2?460:380,z.phase2?.95:.75,"VOID BURST");return}
 if(["king1","lord1"].includes(id)){bossSplash(z,300,.9,"ROYAL STOMP");return}
 if(id==="kingjack"||id==="expiredjack"||id==="emperorjack"){bossSplash(z,330,.9,"PUMPKIN CLEAVE");return}
 // Boss1, Boss2, Boss4 and miscellaneous boss-class enemies retain a direct physical attack.
 if(Math.random()<.55)bossSplash(z,280,.72,"SHOCKWAVE");else bossCharge(z,"RUSH")
}
function updateBullets(dt){
 for(const b of G.bullets){
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.team==="tower"){
   if(G.player.team==="zombie"&&!G.player.dead&&Math.hypot(b.x-G.player.x,b.y-G.player.y)<b.r+G.player.r){
    if(b.rocket){
     damage(G.player,b.dmg,b.owner||{team:"tower",name:"Defender"});
     for(const z2 of G.zombies)if(!z2.dead&&dd(z2,G.player)<110)damage(z2,b.dmg,b.owner||G.player);
     impact(G.player.x,G.player.y,"#ff875a",20);
    }else{
     damage(G.player,b.dmg,b.owner||{team:"tower",name:"Defender"});
     impact(b.x,b.y,b.c,3);
    }
    b.pierce--;if(b.pierce<=0){b.life=0;continue}
   }
   for(const z of G.zombies){
    if(z.dead)continue;
    if(Math.hypot(b.x-z.x,b.y-z.y)<b.r+z.r){
     if(b.rocket){
      for(const z2 of G.zombies)if(!z2.dead&&dd(z2,z)<110)damage(z2,b.dmg,b.owner||{team:"tower",name:"Defender"});
      if(G.player.team==="zombie"&&!G.player.dead&&dd(G.player,z)<110)damage(G.player,b.dmg,b.owner||{team:"tower",name:"Defender"});
      impact(z.x,z.y,"#ff875a",20);b.life=0;break
     }else{
      damage(z,b.dmg,b.owner||{team:"tower",name:"Defender"});impact(b.x,b.y,b.c,3);b.pierce--;
      if(b.pierce<=0){b.life=0;break}
     }
    }
   }
  }
 }
 G.bullets=G.bullets.filter(b=>b.life>0&&b.x>-100&&b.x<WORLD.w+100&&b.y>-100&&b.y<WORLD.h+100)
}
function damage(t,v,src){
 if(t.dead||t.inv>0)return;if(t===G.player&&G.god)return;
 const before=Math.max(0,t.hp);t.hp-=v;const dealt=Math.max(0,Math.min(before,v));
 if(src===G.player&&dealt>0)awardPersonalXp(dealt,"damage");
 if(t===G.player){t.inv=.08;AUDIO.hurt()}
 else if(src===G.player)AUDIO.hit();
 showDamage(t,v,src);
 if(t.hp<=0){t.hp=0;t.dead=true;if(t===G.player){
   G.deaths++;t.respawn=5;AUDIO.death();
   if(G.team==="tower"){
    G.towerOwned[t.c.id]=true;G.towerUpgrades[t.c.id]=t.towerLevel||G.towerUpgrades[t.c.id]||1;
    if(!G.respawnClass)G.respawnClass=t.c;
    feed(`UPGRADES SAVED • ${t.c.name} UPGRADE ${G.towerUpgrades[t.c.id]}`,"#ffd76a");
    setTimeout(()=>{if(G&&G.running&&G.team==="tower"&&G.player.dead){renderClasses("swapGrid");$("swapTitle").textContent="CHOOSE NEXT TOWER • RESPAWNING";$("rosterOverlay").classList.remove("hidden")}},250)
   }
   if(G.team==="zombie"&&G.mode!=="sandbox"){
    if(t.c.cost>0){const key=t.c.cooldownGroup||t.c.id;G.zombieCooldowns[key]=G.elapsed+(t.c.cooldown||12)}
    G.respawnClass=zombieClasses.find(z=>z.id==="normal")
   }
   feed("YOU WERE ELIMINATED",G.team==="tower"?COLORS.zombie:COLORS.tower)
  }
  else if(t.team==="tower"){t.respawn=7;if(src&&src.team==="zombie"){
    if(src===G.player){G.cash+=Math.floor(120*(G.mode==="hard"?.9:1))}else{src.cash=(src.cash||0)+100;src.kills=(src.kills||0)+1;tryZombieBotUpgrade(src)}
   }feed((src.c?.name||src.name||"Zombie")+" eliminated "+(t.name||"Defender"),COLORS.zombie)}
  else{killZombie(t,src)}
 }}

function refreshBossHud(){
 if(!G)return;
 const alive=G.zombies.filter(z=>!z.dead&&z.boss).sort((a,b)=>(b.c.major?2:1)-(a.c.major?2:1)||b.maxHp-a.maxHp);
 G.boss=alive[0]||null;
 if(G.boss){
  $("bossHud").classList.remove("hidden");$("bossTier").textContent=G.boss.c.tier||"BOSS";$("bossName").textContent=G.boss.c.name;
  // Boss timers begin when their timed boss actually spawns.
 }else{
  $("bossHud").classList.add("hidden");G.majorTime=null;G.timedBossId=null;
  if(G.running&&G.mode!=="sandbox"&&!G.anomaly)AUDIO.setMusic("battle")
 }
}

function killZombie(z,src){
 if(z.playerBot)z.respawn=5;
 G.kills++;
 const reward=Math.round((z.c.cost?Math.max(25,z.c.cost*.045):40)*(G.mode==="hard"?.9:1));
 if(src===G.player&&src.team==="tower"){G.cash+=reward}
 else if(src&&src.team==="tower"&&src!==G.player){src.cash=(src.cash||0)+Math.ceil(reward*.55);src.kills=(src.kills||0)+1;tryBotUpgrade(src)}
 if(HALLOWEEN||G.mode==="halloween"){let n=z.c.event==="halloween"?2:z.boss?12:Math.random()<.18?1:0;G.earned.candy+=n}
 if((FALL||G.mode==="fall")&&Math.random()<(z.boss?.8:.2))G.earned.leaves+=z.c.event==="fall"?(z.boss?10:2):(z.boss?7:1);
 if(src===G.player)AUDIO.kill();feed((src?.c?.name||src?.name||"Defender")+" defeated "+z.c.name,z.boss?z.c.c:"#9fd56d");impact(z.x,z.y,z.c.c,z.boss?30:9);
 if(z.boss){
  if(z.c.timer&&G.timedBossId===z.c.id){G.majorTime=null;G.timedBossId=null}
  banner(z.c.name+" DEFEATED");refreshBossHud();
  if(z.c.major&&G.team==="zombie"&&!G.anomaly&&G.running){banner("MAJOR DESTROYED • HORDE CONTINUES");return}
 }
}

function showDamage(t,v,src){
 if(!SETTINGS.damageNumbers||!G||!visible(t.x,t.y,80))return;
 if(src!==G.player&&t!==G.player)return;
 const s=worldScreen(t.x,t.y),e=document.createElement("div");e.className="damage-number";e.textContent=Math.max(1,Math.round(v));e.style.left=s.x+"px";e.style.top=(s.y-(t.r||18)-12)+"px";e.style.color=t.team==="zombie"?"#ffcf74":"#8fd2ff";document.body.appendChild(e);setTimeout(()=>e.remove(),760)
}

function respawnPlayer(){
 let team=G.team,c=G.player.c;
 if(team==="tower"){
  c=G.respawnClass||c;
  G.player=makePlayer(c,"tower");
  applyTowerProgress(G.player,G.towerUpgrades[c.id]||1);
  G.player.inv=2;G.respawnClass=c;selClass=c;
  $("rosterOverlay").classList.add("hidden");
  banner(`RESPAWNED • ${c.name} • UPGRADE ${G.player.towerLevel}`);
  feed(`RESTORED ${c.name} UPGRADE ${G.player.towerLevel}`,"#ffd76a");
  renderClasses("swapGrid");updateHUD();return
 }
 if(team==="zombie"&&G.mode!=="sandbox")c=G.respawnClass||zombieClasses.find(z=>z.id==="normal");
 G.player=makePlayer(c,team);G.player.inv=2;G.respawnClass=null;selClass=c;banner("RESPAWNED");renderClasses("swapGrid")
}
function moveToward(o,t,amount){let dx=t.x-o.x,dy=t.y-o.y,d=Math.hypot(dx,dy)||1;moveEntity(o,dx/d*amount,dy/d*amount)}
function moveEntity(o,dx,dy){
 let nx=clamp(o.x+dx,o.r,WORLD.w-o.r),ny=clamp(o.y+dy,o.r,WORLD.h-o.r);
 const hit=(x,y)=>G.world.walls.some(w=>x+o.r>w.x&&x-o.r<w.x+w.w&&y+o.r>w.y&&y-o.r<w.y+w.h);
 if(!hit(nx,o.y))o.x=nx;if(!hit(o.x,ny))o.y=ny;
}
function nearest(a,s){let q=null,d=1e9;for(const o of a){let n=dd(o,s);if(n<d){d=n;q=o}}return q}
function updateParticles(dt){for(const p of G.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.leaf){p.vx+=Math.sin((p.y+p.seed)*.01)*10*dt}}if((FALL||G.mode==="fall")&&Math.random()<dt*16)G.particles.push({x:G.cam.x+rand(-W*.65,W*.65),y:G.cam.y-H*.55,vx:rand(-20,30),vy:rand(60,120),life:8,max:8,c:"#bd7a35",s:rand(3,7),leaf:true,seed:rand(0,999)});G.particles=G.particles.filter(p=>p.life>0)}
function impact(x,y,c,n){for(let i=0;i<n;i++)G.particles.push({x,y,vx:rand(-180,180),vy:rand(-180,180),life:rand(.2,.65),max:.65,c,s:rand(2,5)})}
function updateCamera(dt){let p=G.player,t=.11;G.cam.x=lerp(G.cam.x,p.x,t);G.cam.y=lerp(G.cam.y,p.y,t)}
function updateHUD(){
 if(!G)return;let p=G.player;$("cashLabel").textContent="$"+Math.floor(G.cash);$("timerLabel").textContent=G.mode==="sandbox"?"∞":fmt(Math.max(0,G.majorTime!=null?G.majorTime:G.timer));$("teamLabel").textContent=(G.server==="private"?"PRIVATE • ":"")+(G.team==="tower"?"DEFENDERS":"ZOMBIES");
 if($("xpLabel"))$("xpLabel").textContent=profile.xp+" / "+xpNeed(profile.level);$("classLabel").textContent=p.c.name.toUpperCase();$("portrait").textContent=p.c.icon;$("portrait").style.background=p.c.c;$("hpFill").style.width=(100*p.hp/p.maxHp)+"%";$("hpText").textContent=Math.ceil(p.hp)+"/"+Math.ceil(p.maxHp);$("ammoText").textContent=p.team==="tower"?(p.c.mag?`${p.ammo}/${p.c.mag}`:"∞"):"MELEE";
 if($("nextTowerLabel")){
  if(p.team==="tower"){const n=G.respawnClass||p.c,lv=G.towerUpgrades?.[n.id]||1;$("nextTowerLabel").textContent=`NEXT: ${n.name.toUpperCase()} • UPGRADE ${lv}`}
  else $("nextTowerLabel").textContent="NEXT: NORMAL AFTER DEATH"
 }
 $("qLabel").textContent=p.c.q;$("eLabel").textContent=p.c.e;$("qCd").textContent=p.q>0?p.q.toFixed(1):"READY";$("eCd").textContent=p.e>0?p.e.toFixed(1):"READY";$("rCd").textContent=p.reload>0?p.reload.toFixed(1):"READY";
 if($("hordeLabel")){
  const active=npcActiveCount(),reserve=G.spawnQueue?.length||0;
  $("hordeLabel").textContent=reserve?`${active} ACTIVE • ${reserve} QUEUED`:`${active} ACTIVE`;
 }if($("upgradeLabel")){$("upgradeLabel").textContent=p.team==="tower"?(p.towerLevel>=5?"MAX":`LV ${p.towerLevel}/5 • $${towerUpgradeCost(p.c,p.towerLevel)}`):"N/A";}
 if($("mobileUpgrade")){
  $("mobileUpgrade").classList.toggle("hidden",p.team!=="tower");
  if(p.team==="tower"){
   const ul=p.towerLevel||1;
   if(ul>=5)$("mobileUpgrade").textContent="MAX LEVEL";
   else{
    const ug=towerUpgradeWave(ul),uc=towerUpgradeCost(p.c,ul);
    $("mobileUpgrade").textContent=G.mode!=="sandbox"&&G.wave<ug?`UPGRADE • WAVE ${ug}`:`UPGRADE • $${uc}`;
   }
  }
 }$("candyLabel").textContent=profile.candy+G.earned.candy;$("leafLabel").textContent=profile.leaves+G.earned.leaves;
 if(G.boss&&!G.boss.dead){
  $("bossFill").style.width=(100*G.boss.hp/G.boss.maxHp)+"%";$("bossHp").textContent=Math.ceil(G.boss.hp)+" / "+Math.ceil(G.boss.maxHp);
  if(G.boss.c.timer&&G.majorTime!=null){$("majorClock").classList.remove("hidden");$("majorClock").textContent=(G.boss.c.major?"MAJOR TIMER ":"BOSS TIMER ")+fmt(Math.max(0,G.majorTime))}
  else $("majorClock").classList.add("hidden")
 }else $("majorClock").classList.add("hidden")
}
function fmt(s){s=Math.floor(s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function banner(t){const e=$("waveBanner");e.textContent=t;e.classList.add("show");clearTimeout(banner.t);banner.t=setTimeout(()=>e.classList.remove("show"),1650)}
function feed(t,c="#fff"){if(!G)return;const e=document.createElement("div");e.className="feed";e.style.setProperty("--c",c);e.textContent=t;$("killfeed").prepend(e);setTimeout(()=>e.remove(),4100)}


function rewardForMode(mode=G.mode){return MODE_REWARDS[mode]||MODE_REWARDS.classic}
function grantModeRewards(mode=G.mode){
 const r=rewardForMode(mode),fresh=[];
 for(const id of [r.tower,r.zombie])if(!(profile.rewards||[]).includes(id)){profile.rewards.push(id);fresh.push(id)}
 profile.modeWins[mode]=(profile.modeWins[mode]||0)+1;save();return {data:r,fresh}
}
function completeModeWin(){
 if(!G||!G.running)return;
 // TBBF-style Wave 0000000: 1/20 after defeating the main Major in Classic/Hard.
 if(G.team==="tower"&&!G.anomaly&&["classic","hard"].includes(G.mode)&&Math.random()<.05){
  G.anomaly={stage:0,skin:ANOMALY_SKIN[G.mode]};G.state="anomalyIntro";G.stateT=4;G.majorTime=null;
  document.body.classList.add("anomaly-flash");AUDIO.setMusic("weird");banner("WAVE 0000000");
  setTimeout(()=>{if(G&&G.anomaly)document.body.classList.remove("anomaly-flash")},3500);return
 }
 finish(true)
}
function startAnomalyOddities(){
 G.anomaly.stage=1;G.state="anomaly";G.majorTime=null;G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);
 const spec=G.mode==="hard"?[["issue",16],["error",8],["virus",12],["j",1],["m",1],["patientzero",1],["planet3arth",1],["emperorjack",3],["specialguardian",3]]:[["issue",16],["error",8],["virus",12],["j",1],["m",1],["patientzero",1],["necroboss",1],["noobgod",1],["expiredjack",3],["guardian",3]];
 for(const [id,n] of spec){const c=zombieClasses.find(z=>z.id===id);for(let i=0;i<n;i++)G.zombies.push(makeZombie(c))}
 banner("WAVE 0000000 • SOMETHING IS WRONG");AUDIO.setMusic("weird")
}
function startAnomalyMajor(){
 G.anomaly.stage=2;G.zombies=G.zombies.filter(z=>z.playerBot&&!z.dead);
 const id=G.mode==="hard"?"specialvoid2":"specialvoid",c=zombieClasses.find(z=>z.id===id),z=makeZombie(c);G.zombies.push(z);G.majorTime=c.timer;G.timedBossId=c.id;refreshBossHud();banner(c.name.toUpperCase());AUDIO.setMusic("weird")
}
function unlockAnomalySkin(){
 if(!G?.anomaly)return null;const id=G.anomaly.skin;
 if(!(profile.skins||[]).includes(id)){profile.skins.push(id);profile.selectedSkin=id;G.lastRewardSkin=id;save();return id}
 G.lastRewardSkin=id;return id
}

function finish(win,quit=false){
 if(!G||!G.running)return;G.running=false;$("hud").classList.add("hidden");$("mobile").classList.add("hidden");$("rosterOverlay").classList.add("hidden");$("sandboxOverlay").classList.add("hidden");
 document.body.classList.remove("anomaly-flash");
 if(quit){returnLobby();return}AUDIO.setMusic("lobby");
 const legit=G.mode!=="sandbox";
 let rewards={data:{towerName:"—",zombieName:"—"},fresh:[]},skin=null;
 if(legit){
  profile.candy+=G.earned.candy;profile.leaves+=G.earned.leaves;
  if(win){profile.wins++;rewards=grantModeRewards(G.mode);if(G.anomaly)skin=unlockAnomalySkin()}
  save()
 }
 $("resultTag").textContent=win?"VICTORY":"DEFEAT";
 const bossTitle=finalMajorForMode();
 $("resultTitle").textContent=win?(G.team==="tower"?bossTitle+" DEFEATED":"THE HORDE SURVIVED"):(G.team==="tower"?"THE FRONT COLLAPSED":"THE HORDE WAS ERASED");
 $("resultSummary").textContent=`${G.mode.toUpperCase()} • Wave ${G.wave} • ${G.kills} eliminations • ${G.deaths} deaths • Win XP: 0`;
 $("resultXp").textContent="+"+G.personalXp;
 $("resultTowerReward").textContent=win?rewards.data.towerName:"—";
 $("resultZombieReward").textContent=win?rewards.data.zombieName:"—";
 const sk=skin?SKIN_DATA.find(s=>s.id===skin):null;$("resultSkin").textContent=sk?sk.name:"—";
 $("resultCandy").textContent="+"+(legit?G.earned.candy:0);$("resultLeaves").textContent="+"+(legit?G.earned.leaves:0);
 $("results").classList.remove("hidden")
}
function returnLobby(){$("results").classList.add("hidden");$("lobby").classList.remove("hidden");const proof=$("privateProof");if(proof)proof.remove();G=null;AUDIO.setMusic("lobby");levelUI();renderClasses();renderMaps();renderSkins()}

function renderSandboxSpawns(){const g=$("sandboxSpawnGrid");g.innerHTML="";zombieClasses.concat(ownerZombieClasses()).forEach(c=>{const b=document.createElement("button");b.textContent=c.name;b.style.borderColor=c.c+"55";b.onclick=()=>{let n=clamp(+$("spawnAmount").value||1,1,50);for(let i=0;i<n;i++)G.zombies.push(makeZombie(c));feed("Spawned "+n+" "+c.name,c.c)};g.appendChild(b)})}
$("applySandbox").onclick=()=>{if(!G)return;G.wave=clamp(+$("sandboxWave").value||1,1,G.totalWaves);G.cash=clamp(+$("sandboxCash").value||0,0,99999999);$("waveLabel").textContent=G.wave+" / "+G.totalWaves;feed("Sandbox values applied","#bd8cff")};
$("toggleGod").onclick=()=>{G.god=!G.god;$("toggleGod").textContent="GOD MODE: "+(G.god?"ON":"OFF")};$("toggleAi").onclick=()=>{G.ai=!G.ai;$("toggleAi").textContent="BOT AI: "+(G.ai?"ON":"OFF")};$("clearZombies").onclick=()=>{G.zombies.forEach(z=>z.dead=true);G.zombies=[];G.boss=null;$("bossHud").classList.add("hidden");feed("All zombies removed","#bd8cff")};$("healAll").onclick=()=>{G.player.hp=G.player.maxHp;G.bots.forEach(b=>b.hp=b.maxHp);G.zombies.forEach(z=>z.hp=z.maxHp);feed("Everyone healed","#69dc8b")};

function worldScreen(x,y){return{x:x-G.cam.x+W/2,y:y-G.cam.y+H/2}}
function screenWorld(x,y){return{x:x-W/2+G.cam.x,y:y-H/2+G.cam.y}}
function visible(x,y,pad=100){let s=worldScreen(x,y);return s.x>-pad&&s.x<W+pad&&s.y>-pad&&s.y<H+pad}
function draw(){
 X.clearRect(0,0,W,H);if(!G){drawLobbyBg();return}X.save();if(G.shake&&SETTINGS.shake>0){const sh=G.shake*(SETTINGS.shake/100);X.translate(rand(-sh,sh),rand(-sh,sh));}drawWorld();drawParticles();X.restore();
}
function drawLobbyBg(){let g=X.createLinearGradient(0,0,W,H);g.addColorStop(0,"#152333");g.addColorStop(1,"#4a1d19");X.fillStyle=g;X.fillRect(0,0,W,H);X.globalAlpha=.12;for(let i=0;i<30;i++){X.fillStyle=i%2?"#fff":"#f0a13b";X.fillRect((i*173)%W,(i*97)%H,3,3)}X.globalAlpha=1}
function drawWorld(){
 X.fillStyle=G.map.ground;X.fillRect(0,0,W,H);
 // world grid
 let top=screenWorld(0,0),sx=Math.floor(top.x/100)*100,sy=Math.floor(top.y/100)*100;X.strokeStyle="#00000010";X.lineWidth=1;
 for(let x=sx;x<top.x+W+100;x+=100){let a=worldScreen(x,0).x;X.beginPath();X.moveTo(a,0);X.lineTo(a,H);X.stroke()}for(let y=sy;y<top.y+H+100;y+=100){let a=worldScreen(0,y).y;X.beginPath();X.moveTo(0,a);X.lineTo(W,a);X.stroke()}
 // team zones
 zone(350,850,280,COLORS.zombie,"ZOMBIE SPAWN");zone(2250,850,280,COLORS.tower,"DEFENDER SPAWN");
 // roads
 X.globalAlpha=.28;X.fillStyle=G.map.road;let rs=worldScreen(0,770);X.fillRect(rs.x,rs.y,WORLD.w,160);X.globalAlpha=1;
 // deco
 for(const d of G.world.deco){
  if(!visible(d.x,d.y,50))continue;let s=worldScreen(d.x,d.y);
  if(d.type==="rock"){X.fillStyle="#27312966";X.beginPath();X.ellipse(s.x,s.y,d.r,d.r*.65,0,0,TAU);X.fill()}
  else if(d.type==="bush"){X.fillStyle="#28452b77";X.beginPath();X.arc(s.x,s.y,d.r,0,TAU);X.fill()}
  else if(d.type==="pumpkin"){X.fillStyle="#e57b27";X.beginPath();X.ellipse(s.x,s.y,d.r,d.r*.78,0,0,TAU);X.fill();X.strokeStyle="#9f4d18";X.stroke();X.fillStyle="#49602b";X.fillRect(s.x-2,s.y-d.r*.9,4,6)}
  else if(d.type==="grave"){X.fillStyle="#70747d";X.fillRect(s.x-d.r*.55,s.y-d.r,d.r*1.1,d.r*1.5);X.fillStyle="#4d5159";X.fillRect(s.x-d.r*.72,s.y+d.r*.35,d.r*1.44,d.r*.22)}
  else if(d.type==="candle"){X.fillStyle="#e6d59a";X.fillRect(s.x-2,s.y-6,4,10);X.fillStyle="#ff9e35";X.beginPath();X.arc(s.x,s.y-8,3,0,TAU);X.fill()}
  else if(d.type==="hay"){X.fillStyle="#b88b39";X.fillRect(s.x-d.r,s.y-d.r*.6,d.r*2,d.r*1.2);X.strokeStyle="#7f5c23";X.strokeRect(s.x-d.r,s.y-d.r*.6,d.r*2,d.r*1.2)}
  else if(d.type==="leafpile"){X.fillStyle="#ba6f33";X.beginPath();X.ellipse(s.x,s.y,d.r*1.2,d.r*.55,0,0,TAU);X.fill()}
  else if(d.type==="autumntree"){X.fillStyle="#6f4827";X.fillRect(s.x-3,s.y,6,d.r*1.5);for(let i=0;i<5;i++){X.fillStyle=i%2?"#c76e2d":"#d69b3a";const ox=Math.sin(d.x*.017+i*1.73)*d.r,oy=(.18+((Math.sin(d.y*.013+i*2.1)+1)*.4))*d.r;X.beginPath();X.arc(s.x+ox,s.y-oy,d.r*.55,0,TAU);X.fill()}}
 }
 // walls
 for(const w of G.world.walls){let s=worldScreen(w.x,w.y);if(s.x>W||s.x+w.w<0||s.y>H||s.y+w.h<0)continue;X.fillStyle="#00000035";X.fillRect(s.x+8,s.y+10,w.w,w.h);X.fillStyle="#59636d";X.fillRect(s.x,s.y,w.w,w.h);X.fillStyle="#727d87";X.fillRect(s.x,s.y,w.w,10);X.strokeStyle="#313943";X.strokeRect(s.x,s.y,w.w,w.h)}
 // sort actors by y
 let actors=[];G.zombies.forEach(z=>{if(!z.dead)actors.push(z)});G.bots.forEach(b=>{if(!b.dead)actors.push(b)});if(!G.player.dead)actors.push(G.player);actors.sort((a,b)=>a.y-b.y);actors.forEach(drawActor);
 for(const b of G.bullets){if(!visible(b.x,b.y))continue;let s=worldScreen(b.x,b.y);X.fillStyle=b.c;X.beginPath();X.arc(s.x,s.y,b.r,0,TAU);X.fill();X.globalAlpha=.3;X.beginPath();X.moveTo(s.x,s.y);X.lineTo(s.x-b.vx*.025,s.y-b.vy*.025);X.strokeStyle=b.c;X.lineWidth=2;X.stroke();X.globalAlpha=1}
 // crosshair
 if(!isMobile&&!G.player.dead){X.strokeStyle="#fff";X.globalAlpha=.8;X.lineWidth=1.3;X.beginPath();X.arc(mouse.x,mouse.y,9,0,TAU);X.moveTo(mouse.x-14,mouse.y);X.lineTo(mouse.x-5,mouse.y);X.moveTo(mouse.x+5,mouse.y);X.lineTo(mouse.x+14,mouse.y);X.stroke();X.globalAlpha=1}
}
function zone(x,y,r,c,label){let s=worldScreen(x,y);if(s.x<-r||s.x>W+r||s.y<-r||s.y>H+r)return;X.globalAlpha=.11;X.fillStyle=c;X.beginPath();X.arc(s.x,s.y,r,0,TAU);X.fill();X.globalAlpha=.5;X.strokeStyle=c;X.lineWidth=3;X.stroke();X.globalAlpha=.65;X.fillStyle=c;X.font="900 12px system-ui";X.textAlign="center";X.fillText(label,s.x,s.y-r+22);X.globalAlpha=1}
function bossPoly(points,fill,stroke=null,lw=2){
 X.beginPath();X.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)X.lineTo(points[i][0],points[i][1]);X.closePath();X.fillStyle=fill;X.fill();
 if(stroke){X.strokeStyle=stroke;X.lineWidth=lw;X.stroke()}
}
function bossDiamond(x,y,w,h,c){
 X.fillStyle=c;X.beginPath();X.moveTo(x,y-h/2);X.lineTo(x+w/2,y);X.lineTo(x,y+h/2);X.lineTo(x-w/2,y);X.closePath();X.fill()
}
function bossCrown(r,c,wide=1){
 bossPoly([[-r*.58*wide,-r*1.47],[-r*.66*wide,-r*1.93],[-r*.25*wide,-r*1.69],[0,-r*2.08],[r*.25*wide,-r*1.69],[r*.66*wide,-r*1.93],[r*.58*wide,-r*1.47]],c)
}
function bossCape(r,c,w=1){
 X.fillStyle=c;X.beginPath();X.moveTo(-r*.72*w,-r*.55);X.lineTo(r*.72*w,-r*.55);X.lineTo(r*.92*w,r*1.1);X.lineTo(0,r*1.42);X.lineTo(-r*.92*w,r*1.1);X.closePath();X.fill()
}
function bossTopHat(r,hat,band="#1a1a1a"){
 X.fillStyle=hat;X.fillRect(-r*.45,-r*1.98,r*.9,r*.53);X.fillRect(-r*.68,-r*1.5,r*1.36,r*.14);X.fillStyle=band;X.fillRect(-r*.45,-r*1.63,r*.9,r*.12)
}
function bossDominus(r,body,accent){
 X.fillStyle=body;X.beginPath();X.moveTo(-r*.56,-r*1.38);X.lineTo(-r*.86,-r*1.83);X.lineTo(-r*.46,-r*1.7);X.lineTo(-r*.28,-r*2.05);X.lineTo(0,-r*1.72);X.lineTo(r*.28,-r*2.05);X.lineTo(r*.46,-r*1.7);X.lineTo(r*.86,-r*1.83);X.lineTo(r*.56,-r*1.38);X.closePath();X.fill();
 X.strokeStyle=accent;X.lineWidth=Math.max(2,r*.08);X.beginPath();X.moveTo(-r*.42,-r*1.55);X.lineTo(r*.42,-r*1.55);X.stroke()
}
function bossArmBands(r,c,count=2){
 X.fillStyle=c;for(const side of [-1,1])for(let i=0;i<count;i++)X.fillRect(side*r*.74-(side<0?r*.26:0),-r*.35+i*r*.23,r*.26,r*.08)
}
function bossBodyBase(r,skin,armor,leg="#15181b",headScale=1){
 // legs
 X.fillStyle=leg;X.fillRect(-r*.64,r*.48,r*.47,r*1.08);X.fillRect(r*.17,r*.48,r*.47,r*1.08);
 // torso
 X.fillStyle=armor;X.fillRect(-r*.76,-r*.62,r*1.52,r*1.2);
 // arms
 X.fillStyle=skin;X.fillRect(-r*1.03,-r*.48,r*.31,r*.95);X.fillRect(r*.72,-r*.48,r*.31,r*.95);
 // head
 X.fillStyle=skin;X.fillRect(-r*.43*headScale,-r*1.35,r*.86*headScale,r*.67)
}
function moltenCracks(r,c="#ff7a31"){
 X.strokeStyle=c;X.lineWidth=Math.max(1.5,r*.05);for(const side of [-1,1]){
  X.beginPath();X.moveTo(side*r*.16,-r*1.25);X.lineTo(side*r*.3,-r*.98);X.lineTo(side*r*.12,-r*.78);X.stroke();
  X.beginPath();X.moveTo(side*r*.88,-r*.36);X.lineTo(side*r*.78,-r*.05);X.lineTo(side*r*.94,r*.15);X.stroke()
 }
}
function neonWings(r,c,pairs=3,reach=2.3){
 X.strokeStyle=c;X.lineWidth=Math.max(3,r*.09);X.shadowColor=c;X.shadowBlur=12;
 for(const side of [-1,1])for(let i=0;i<pairs;i++){let y=(-.58+i*.48)*r;X.beginPath();X.moveTo(side*r*.56,y);X.lineTo(side*r*(reach+i*.12),y-r*(.78-i*.23));X.stroke()}
 X.shadowBlur=0
}
function drawAccurateBoss(o,c){
 const r=o.r,id=o.c.style||o.c.id,hard=G?.mode==="hard";
 X.shadowBlur=0;

 if(id==="boss1"){
  const skin=hard?"#e57c2b":"#4f8250",armor=hard?"#575d63":"#31383b";
  bossBodyBase(r,skin,armor,"#24292d");
  bossArmBands(r,hard?"#2a2d31":"#1e2428",2);
  if(hard){X.fillStyle="#4c5258";bossPoly([[-r*.78,-r*.55],[-r*1.2,-r*.9],[-r*.92,-r*.12]],"#4c5258");bossPoly([[r*.78,-r*.55],[r*1.2,-r*.9],[r*.92,-r*.12]],"#4c5258")}
  return true
 }
 if(id==="king1"){
  bossCape(r,"#090b0c",1.05);bossBodyBase(r,"#48b85a","#343b3e","#23272a");bossArmBands(r,"#161a1d",2);bossCrown(r,"#3c4144");bossDiamond(0,-r*.08,r*.48,r*.62,"#1fd76a");
  X.strokeStyle="#7d8589";X.lineWidth=2;X.strokeRect(-r*.72,-r*.58,r*1.44,r*1.1);
  return true
 }
 if(id==="lord1"){
  bossCape(r,"#050607",1.08);bossBodyBase(r,"#8d2e22","#0a0b0d","#101113");moltenCracks(r,"#ff6a28");bossArmBands(r,"#35373b",2);bossCrown(r,"#07080a");bossDiamond(0,-r*1.76,r*.25,r*.28,"#ff342e");return true
 }
 if(id==="boss2"){
  const skin=hard?"#274c74":"#456b45",armor=hard?"#26343f":"#665740";
  bossBodyBase(r,skin,armor,shade(armor,-18),1.08);
  X.fillStyle=shade(armor,-10);X.fillRect(-r*.86,-r*.65,r*1.72,r*.24);
  if(hard){for(const side of [-1,1]){bossDiamond(side*r*.52,-r*.36,r*.23,r*.38,"#53cfff");bossDiamond(side*r*.72,-r*.82,r*.2,r*.32,"#4bbde8")}}
  return true
 }
 if(id==="king2"){
  bossCape(r,"#28231d",1.08);bossBodyBase(r,"#556f48","#665944","#342f29");bossArmBands(r,"#7e8588",2);bossCrown(r,"#70694f");X.fillStyle="#7f8588";X.fillRect(-r*1.02,-r*.4,r*.28,r*.72);X.fillRect(r*.74,-r*.4,r*.28,r*.72);return true
 }
 if(id==="lord2"){
  bossCape(r,"#273242",1.12);bossBodyBase(r,"#264b77","#4d4a42","#262b32");bossCrown(r,"#745d43");bossArmBands(r,"#6c7985",3);bossDiamond(0,-r*.08,r*.48,r*.66,"#37d7ff");
  for(const side of [-1,1]){bossPoly([[side*r*.7,-r*.6],[side*r*1.2,-r*1.05],[side*r*1.05,-r*.14]],"#188fc2");bossDiamond(side*r*.88,-r*.7,r*.22,r*.38,"#5ceaff")}
  return true
 }
 if(id==="boss3"){
  const skin=hard?"#979da3":"#e0c45d",suit=hard?"#11161f":"#c99d35",hat=hard?"#26354c":"#c69b32";
  bossBodyBase(r,skin,suit,shade(suit,-28));bossTopHat(r,hat,hard?"#111827":"#8b6822");
  if(hard){X.strokeStyle="#c9d0d7";X.lineWidth=2;X.beginPath();X.moveTo(-r*.35,-r*.38);X.lineTo(r*.35,r*.18);X.stroke();bossArmBands(r,"#424a52",1)}
  return true
 }
 if(id==="king3"){
  bossCape(r,"#9a7c48",1.05);bossBodyBase(r,"#d7c56c","#4f3a2c","#33291f");bossTopHat(r,"#4a3427","#d5ad43");bossCrown(r,"#cfad45",.75);bossArmBands(r,"#2f3338",1);
  X.fillStyle="#ffd74e";X.fillRect(-r*.09,-r*.48,r*.18,r*.72);return true
 }
 if(id==="lord3"){
  bossCape(r,"#24372d",1.1);bossBodyBase(r,"#aeb4ad","#39463f","#232a27");bossArmBands(r,"#59645e",2);bossDiamond(0,-r*.08,r*.46,r*.62,"#55f26e");bossTopHat(r,"#214f35","#63ff7a");
  for(const side of [-1,1])bossPoly([[side*r*.74,-r*.6],[side*r*1.22,-r*1.0],[side*r*.98,-r*.14]],"#56ff74");
  return true
 }
 if(id==="boss4"){
  if(hard){
   bossBodyBase(r,"#742b36","#45464c","#22252a");bossArmBands(r,"#20252a",2);
   bossPoly([[r*.72,-r*.6],[r*1.32,-r*1.1],[r*1.1,-r*.08]],"#50545a");for(let i=0;i<3;i++){X.fillStyle="#8c3540";X.fillRect(r*(.88+i*.1),-r*(.92-i*.16),r*.07,r*.3)}
  }else{
   bossBodyBase(r,"#385c3e","#101317","#17191c");
   // left arm bare, right arm sleeved/armband
   X.fillStyle="#385c3e";X.fillRect(-r*1.04,-r*.48,r*.33,r*.95);
   X.fillStyle="#111418";X.fillRect(r*.71,-r*.48,r*.34,r*.95);X.fillStyle="#3c4145";X.fillRect(r*.72,-r*.12,r*.33,r*.12)
  }
  // knife in back of head
  X.strokeStyle="#b9bdc0";X.lineWidth=Math.max(3,r*.09);X.beginPath();X.moveTo(r*.18,-r*1.62);X.lineTo(r*.82,-r*2.02);X.stroke();X.fillStyle="#5f3f2a";X.fillRect(r*.65,-r*2.08,r*.28,r*.12);
  return true
 }
 if(id==="king4"){
  bossCape(r,"#050607",1.15);bossBodyBase(r,"#3e754d","#242a2d","#171b1d");bossArmBands(r,"#14181a",2);bossCrown(r,"#08090a");bossDiamond(0,-r*.05,r*.5,r*.62,"#1e6f3e");
  for(const side of [-1,1]){bossPoly([[side*r*.72,-r*.6],[side*r*1.3,-r*1.1],[side*r*1.08,-r*.05]],"#343b3e");X.fillStyle="#202529";X.fillRect(side*r*.99-(side<0?r*.35:0),-r*.35,r*.35,r*.72)}
  X.strokeStyle="#c0c4c8";X.lineWidth=Math.max(3,r*.08);X.beginPath();X.moveTo(r*.08,-r*1.62);X.lineTo(r*.72,-r*2.02);X.stroke();return true
 }
 if(id==="lord4"){
  bossCape(r,"#08050b",1.22);bossBodyBase(r,"#7d28aa","#0c0d12","#0b0d11");bossArmBands(r,"#ff67ee",4);bossCrown(r,"#7d28aa");bossDiamond(0,-r*.04,r*.55,r*.7,"#ff73f3");
  for(const side of [-1,1])bossPoly([[side*r*.72,-r*.58],[side*r*1.42,-r*1.22],[side*r*1.14,-r*.02]],"#17131d","#ff6df1",3);
  neonWings(r,"#f072ff",3,2.45);return true
 }
 if(id==="boss5"){
  const red=hard,cloth=red?"#711f2a":"#273752",trim=red?"#ff443f":"#536f9c";
  bossCape(r,shade(cloth,-18),1.15);bossBodyBase(r,red?"#22252a":"#252b35",cloth,"#171b22");bossDominus(r,shade(cloth,-16),trim);bossArmBands(r,shade(cloth,16),1);
  // torn sleeve points
  for(const side of [-1,1])bossPoly([[side*r*.72,-r*.3],[side*r*1.02,-r*.18],[side*r*.83,r*.06]],cloth);
  if(red)bossDiamond(0,-r*.05,r*.46,r*.58,"#ff3838");return true
 }
 if(id==="guardian"||id==="specialguardian"){
  const red=id==="specialguardian"||hard,accent=red?"#ef3b54":"#8a5dff",armor=red?"#27151a":"#211b34";
  bossBodyBase(r,"#17151f",armor,"#101118",1.02);bossDominus(r,"#111019",accent);bossArmBands(r,accent,2);bossDiamond(0,-r*.02,r*.32,r*.45,"#eeeeff");
  // eyes under the dominus
  X.fillStyle=red?"#ff3f45":"#b98cff";X.fillRect(-r*.25,-r*1.32,r*.14,r*.06);X.fillRect(r*.11,-r*1.32,r*.14,r*.06);
  // giant axe
  X.strokeStyle="#292b31";X.lineWidth=Math.max(6,r*.16);X.beginPath();X.moveTo(-r*.25,r*.18);X.lineTo(-r*2.05,r*.92);X.stroke();
  bossPoly([[-r*2.0,r*.35],[-r*2.82,r*.65],[-r*2.08,r*1.32],[-r*1.73,r*.86]],red?"#641d28":"#352b51",accent,2);return true
 }
 if(id==="kinghidden"){
  bossCape(r,"#08090b",1.15);bossBodyBase(r,"rgba(92,105,120,.72)","#111418","#14171b");bossArmBands(r,"#080a0d",2);bossCrown(r,"#24272b");
  // trench coat lapels
  bossPoly([[-r*.7,-r*.55],[-r*.1,r*.1],[-r*.45,r*.58]],"#1a1e22");bossPoly([[r*.7,-r*.55],[r*.1,r*.1],[r*.45,r*.58]],"#1a1e22");return true
 }
 if(id==="lordhidden"){
  bossCape(r,"#4d5158",1.12);bossBodyBase(r,"rgba(232,236,241,.78)","#4c5056","#30343a");bossArmBands(r,"#aab0b6",2);bossCrown(r,"#b7bcc1");bossDiamond(0,-r*.02,r*.38,r*.52,"#f9fbff");
  X.strokeStyle="#f8fbff";X.lineWidth=3;X.beginPath();X.moveTo(-r*.45,-r*.45);X.lineTo(0,r*.08);X.lineTo(r*.45,-r*.45);X.stroke();for(const side of [-1,1])bossPoly([[side*r*.75,-r*.55],[side*r*1.2,-r*.9],[side*r*.98,-r*.1]],"#737980","#f7f7ff",2);return true
 }
 if(id==="void"){
  bossCape(r,"#120b18",1.25);bossBodyBase(r,"#352041","#17111f","#120d17",1.08);bossDiamond(0,-r*.02,r*.6,r*.78,"#ed5df5");bossCrown(r,"#271530",1.08);
  // veins and body bulges
  X.strokeStyle="#7e3f8d";X.lineWidth=2;for(const side of [-1,1]){X.beginPath();X.moveTo(side*r*.22,-r*.55);X.lineTo(side*r*.5,-r*.1);X.lineTo(side*r*.28,r*.48);X.stroke();X.fillStyle="#26132f";X.beginPath();X.arc(side*r*.56,r*.55,r*.23,0,TAU);X.fill()}
  for(const side of [-1,1])for(let i=0;i<2;i++)bossDiamond(side*r*(.55+i*.25),-r*(.72+i*.25),r*.22,r*.38,"#8d48a6");
  return true
 }
 if(id==="void2"||id==="specialvoid2"){
  const red=id==="specialvoid2",accent=red?"#ff4057":"#ff5ee9",purple=red?"#431a28":"#24183f";
  bossCape(r,"#07070a",1.18);bossBodyBase(r,"#09090d",purple,"#09090c");bossArmBands(r,accent,3);bossDiamond(0,-r*.02,r*.55,r*.72,red?"#ff493f":"#f56eff");bossCrown(r,"#07070a",1.02);neonWings(r,accent,3,2.45);
  // floating crystal
  X.shadowColor=accent;X.shadowBlur=14;bossDiamond(0,-r*2.55,r*.72,r*.9,red?"#8d1f48":"#642b9e");X.shadowBlur=0;
  // huge black greatsword with luminous alloy
  X.strokeStyle="#050609";X.lineWidth=Math.max(10,r*.25);X.beginPath();X.moveTo(r*.6,-r*.2);X.lineTo(r*2.9,r*.9);X.stroke();X.strokeStyle=accent;X.lineWidth=Math.max(3,r*.07);X.beginPath();X.moveTo(r*.7,-r*.17);X.lineTo(r*2.75,r*.82);X.stroke();return true
 }
 return false
}
function drawGenericBoss(o,c){
 const r=o.r,glow=o.c.c;bossCape(r,"#11131a",1.03);bossBodyBase(r,shade(c,-20),shade(c,-40),"#101217");bossDiamond(0,-r*.05,r*.42,r*.55,glow);
 if(["KING","LORD","MAJOR","ANOMALY","PLANET"].includes(o.c.tier))bossCrown(r,glow);
 if(o.c.tier==="LORD")neonWings(r,glow,2,1.8)
}
function drawActor(o){
 let s=worldScreen(o.x,o.y),base=o.c.c,ang=o.angle||0;if(!visible(o.x,o.y,150))return;
 let c=base;if(o===G.player){const sk=currentSkin();if(sk.id!=="default")c=sk.a}
 X.save();X.translate(s.x,s.y);X.rotate(ang);X.globalAlpha=o.alpha??1;
 X.save();X.rotate(-ang);X.fillStyle="#00000044";X.beginPath();X.ellipse(6,13,o.r*1.25,o.r*.72,0,0,TAU);X.fill();X.restore();

 if(o.c.custom){
  X.fillStyle="#1b1f24";X.fillRect(-o.r*.55,o.r*.2,o.r*.42,o.r*.95);X.fillRect(o.r*.12,o.r*.2,o.r*.42,o.r*.95);
  X.fillStyle=c;roundRect(-o.r*.75,-o.r*.65,o.r*1.5,o.r*1.35,3);X.fill();X.fillStyle=o.c.accent||"#ffffff";X.fillRect(-o.r*.45,-o.r*1.25,o.r*.9,o.r*.67);
  for(const sh of (o.c.visual||[])){X.save();X.translate((+sh.x||0)*o.r/34,(+sh.y||0)*o.r/34);X.rotate((+sh.rot||0)*Math.PI/180);X.fillStyle=sh.color||o.c.accent||"#fff";const sw=Math.max(2,(+sh.w||20)*o.r/34),hh=Math.max(2,(+sh.h||20)*o.r/34);if(sh.kind==="circle"){X.beginPath();X.ellipse(0,0,sw/2,hh/2,0,0,TAU);X.fill()}else if(sh.kind==="triangle"){X.beginPath();X.moveTo(0,-hh/2);X.lineTo(sw/2,hh/2);X.lineTo(-sw/2,hh/2);X.closePath();X.fill()}else if(sh.kind==="diamond"){X.beginPath();X.moveTo(0,-hh/2);X.lineTo(sw/2,0);X.lineTo(0,hh/2);X.lineTo(-sw/2,0);X.closePath();X.fill()}else X.fillRect(-sw/2,-hh/2,sw,hh);X.restore()}
 }else if(o.boss||o.c.tier){
  const glow=o.c.style==="void2"?"#f56eff":o.c.style==="void"?"#ed5df5":o.c.tier==="LORD"?"#e166ff":o.c.tier==="KING"?"#e8b24a":o.c.c;
  X.shadowColor=glow;X.shadowBlur=o.c.major?18:8;
  if(!drawAccurateBoss(o,c))drawGenericBoss(o,c);
  X.shadowBlur=0
 }else{
  X.fillStyle="#1b1f24";X.fillRect(-o.r*.55,o.r*.2,o.r*.42,o.r*.95);X.fillRect(o.r*.12,o.r*.2,o.r*.42,o.r*.95);
  X.fillStyle=c;roundRect(-o.r*.75,-o.r*.65,o.r*1.5,o.r*1.35,3);X.fill();
  X.fillStyle=shade(c,-22);X.fillRect(-o.r*.98,-o.r*.45,o.r*.28,o.r*.9);X.fillRect(o.r*.7,-o.r*.45,o.r*.28,o.r*.9);
  X.fillStyle=o.team==="tower"?"#f2d58b":"#91b56b";X.fillRect(-o.r*.45,-o.r*1.25,o.r*.9,o.r*.67);
  if(o.team==="tower"){X.fillStyle="#20262d";X.fillRect(o.r*.35,-4,o.r*1.15,7)}
 }
 X.restore();

 if(o===G.player&&currentSkin().id!=="default"){
  const sk=currentSkin();X.save();X.strokeStyle=sk.b;X.globalAlpha=.55;X.lineWidth=3;X.beginPath();X.arc(s.x,s.y,o.r+11+Math.sin(G.elapsed*5)*3,0,TAU);X.stroke();X.globalAlpha=1;X.restore()
 }
 bar(s.x,s.y-o.r*1.85,o.r*2.4,o.hp/o.maxHp,o.team==="tower"?"#55b8ff":"#7bd267");
 if(o.name){let nm=o.name;if(o.team==="tower"&&o!==G.player&&o.cash!==undefined)nm+=` • ${o.c.name} L${o.towerLevel||1} • $${Math.floor(o.cash)}`;X.fillStyle="#fff";X.font="700 9px system-ui";X.textAlign="center";X.fillText(nm,s.x,s.y-o.r*2.15)}
 if(o===G.player){X.strokeStyle="#fff";X.lineWidth=2;X.beginPath();X.arc(s.x,s.y,o.r+6,0,TAU);X.stroke()}
}
function roundRect(x,y,w,h,r){X.beginPath();X.roundRect?X.roundRect(x,y,w,h,r):(X.rect(x,y,w,h))}
function shade(hex,amt){let n=parseInt(hex.slice(1),16),r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return"#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}
function bar(x,y,w,v,c){X.fillStyle="#080b0e";X.fillRect(x-w/2,y,w,5);X.fillStyle=c;X.fillRect(x-w/2,y,w*clamp(v,0,1),5)}
function drawParticles(){for(const p of G.particles){if(!visible(p.x,p.y,30))continue;let s=worldScreen(p.x,p.y);X.globalAlpha=clamp(p.life/(p.max||1),0,1);X.fillStyle=p.c;if(p.leaf)X.fillRect(s.x,s.y,p.s*1.6,p.s);else{X.beginPath();X.arc(s.x,s.y,p.s,0,TAU);X.fill()}}X.globalAlpha=1}
function loop(t){let dt=Math.min(.033,(t-(loop.last||t))/1000);loop.last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);

addEventListener("keydown",e=>{AUDIO.ensure();if(!AUDIO.musicTimer)AUDIO.setMusic(G&&G.running?"battle":"lobby");if(["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))return;let k=e.key.toLowerCase();if(k==="escape"){$("settingsOverlay").classList.toggle("hidden");AUDIO.ui();return}keys[k]=true;if(k==="q")useAbility("q");if(k==="e")useAbility("e");if(k==="r")reload();if(k==="f")upgradeTower();if(k==="tab"){e.preventDefault();openRoster()}if(k==="n"&&G?.mode==="sandbox")$("sandboxOverlay").classList.toggle("hidden")});
addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);C.addEventListener("mousemove",e=>{mouse.x=e.clientX;mouse.y=e.clientY});C.addEventListener("mousedown",e=>{mouse.down=true;mouse.x=e.clientX;mouse.y=e.clientY});addEventListener("mouseup",()=>mouse.down=false);C.addEventListener("contextmenu",e=>e.preventDefault());
function openRoster(){if(!G)return;$("swapTitle").textContent=G.team==="tower"?(G.player.dead?"CHOOSE NEXT TOWER • RESPAWNING":"DEFENDER ROSTER • CHOOSE NEXT RESPAWN"):"ZOMBIE ROSTER";renderClasses("swapGrid");$("rosterOverlay").classList.remove("hidden")}
$("sandboxHudBtn").onclick=()=>$("sandboxOverlay").classList.remove("hidden");
function setupStick(el,cb,fire=false){
 if(!el)return;let id=null,knob=el.querySelector("i");
 function point(clientX,clientY){let r=el.getBoundingClientRect(),dx=clientX-(r.left+r.width/2),dy=clientY-(r.top+r.height/2),m=Math.min(44,Math.hypot(dx,dy)),a=Math.atan2(dy,dx),x=Math.cos(a)*m/44,y=Math.sin(a)*m/44;if(knob)knob.style.transform=`translate(${x*34}px,${y*34}px)`;cb(x,y,true)}
 function reset(){id=null;if(knob)knob.style.transform="";cb(0,0,false)}
 if(window.PointerEvent){
  el.addEventListener("pointerdown",e=>{id=e.pointerId;try{el.setPointerCapture(id)}catch{}point(e.clientX,e.clientY);e.preventDefault()},{passive:false});
  el.addEventListener("pointermove",e=>{if(e.pointerId===id){point(e.clientX,e.clientY);e.preventDefault()}},{passive:false});
  el.addEventListener("pointerup",e=>{if(e.pointerId===id)reset()});el.addEventListener("pointercancel",reset);
 }else{
  el.addEventListener("touchstart",e=>{const t=e.changedTouches[0];id=t.identifier;point(t.clientX,t.clientY);e.preventDefault()},{passive:false});
  el.addEventListener("touchmove",e=>{for(const t of e.changedTouches)if(t.identifier===id){point(t.clientX,t.clientY);e.preventDefault();break}},{passive:false});
  el.addEventListener("touchend",e=>{for(const t of e.changedTouches)if(t.identifier===id){reset();break}});el.addEventListener("touchcancel",reset);
 }
}
setupStick($("moveStick"),(x,y)=>mMove={x,y});setupStick($("aimStick"),(x,y,on)=>{mAim.x=x;mAim.y=y;mAim.fire=on},true);function bindMobileButton(id,fn){
 const el=$(id);if(!el)return;let last=0;
 const fire=e=>{
  const t=performance.now();if(t-last<260)return;last=t;
  try{e?.preventDefault?.()}catch{}
  AUDIO.ensure();fn()
 };
 if(window.PointerEvent)el.addEventListener("pointerup",fire,{passive:false});
 el.addEventListener("touchend",fire,{passive:false});
 el.addEventListener("click",fire,{passive:false});
}
bindMobileButton("mobileQ",()=>useAbility("q"));
bindMobileButton("mobileE",()=>useAbility("e"));
bindMobileButton("mobileR",reload);
bindMobileButton("mobileUpgrade",upgradeTower);
bindMobileButton("mobileRoster",openRoster);
function sound(freq,dur,vol=.025){AUDIO.tone(freq,dur,"square",Math.max(.02,vol*3))}
function soundShot(g){AUDIO.shot(g)}
document.addEventListener("click",e=>{if(e.target.closest("button"))AUDIO.ensure()});
})();
