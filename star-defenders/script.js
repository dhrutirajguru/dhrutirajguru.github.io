const canvas=document.getElementById('fx'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let W,H,dpr,raf=0,last=0,state='start',score=0,level=1,health=5,high=+localStorage.getItem('starDefendersHigh')||0;
let player,enemies=[],bullets=[],particles=[],powers=[],keys={},fireTimer=0,spawnTimer=.6;
let active={rapid:0,shield:0,double:0},muted=false,audioCtx=null;
const els={score:$('score'),high:$('high'),level:$('level'),health:$('health'),rapid:$('rapidTime'),shield:$('shieldTime'),double:$('doubleTime'),status:$('status')};

function resize(){dpr=Math.min(devicePixelRatio,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',resize);resize();

function init(){score=0;level=1;health=5;enemies=[];bullets=[];particles=[];powers=[];active={rapid:0,shield:0,double:0};fireTimer=0;spawnTimer=.8;player={x:W/2,y:H*.79,vx:0};updateHud()}
function start(){init();state='playing';$('startScreen').classList.add('hidden');$('overScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);sound('start')}
function loop(t){const dt=Math.min(.033,(t-last)/1000||0);last=t;if(state==='playing'){update(dt);draw(dt);raf=requestAnimationFrame(loop)}else draw(dt)}

function update(dt){
 let dir=(keys.a||keys.ArrowLeft?-1:0)+(keys.d||keys.ArrowRight?1:0);
 player.vx+=dir*1800*dt;player.vx*=Math.pow(.0008,dt);player.x+=player.vx*dt;player.x=Math.max(W*.28,Math.min(W*.72,player.x));
 if(keys[' ']||keys.Spacebar) shoot();
 fireTimer-=dt;spawnTimer-=dt;
 const interval=Math.max(.72,1.5-level*.07);
 if(spawnTimer<=0){spawnEnemy();spawnTimer=interval*(.75+Math.random()*.55)}
 bullets.forEach(b=>b.y-=b.speed*dt);bullets=bullets.filter(b=>b.y>-30);
 enemies.forEach(e=>{e.y+=e.speed*dt;e.x+=Math.sin(tick(e.phase))*e.wave*dt*10;e.phase+=dt*1.2});
 for(const e of enemies){for(const b of bullets){if(!e.dead&&!b.dead&&Math.hypot(e.x-b.x,e.y-b.y)<e.r*1.1){b.dead=true;e.hp--;burst(b.x,b.y,'#7df3ff',4);if(e.hp<=0)kill(e)}}}
 bullets=bullets.filter(b=>!b.dead);
 for(const e of enemies){if(!e.dead&&e.y>H*.73){e.dead=true;if(active.shield>0){burst(e.x,e.y,'#57efff',14);sound('shield')}else damage()}}
 enemies=enemies.filter(e=>!e.dead&&e.y<H+80);
 powers.forEach(p=>{p.y+=p.speed*dt;p.rot+=dt*2;if(Math.hypot(player.x-p.x,player.y-p.y)<55)collect(p)});powers=powers.filter(p=>!p.dead&&p.y<H*.9);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.life-=dt});particles=particles.filter(p=>p.life>0);
 for(const k in active)active[k]=Math.max(0,active[k]-dt);
 const nl=1+Math.floor(score/450);if(nl!==level){level=nl;els.status.textContent='LEVEL '+String(level).padStart(2,'0')+' — THREAT ESCALATING';sound('level')}
 updateHud();
}
function tick(x){return Math.sin(x)}
function shoot(){if(fireTimer>0)return;fireTimer=active.rapid>0?.065:.13;bullets.push({x:player.x,y:player.y-110,speed:820});sound('shoot')}
function spawnEnemy(){const r=Math.random(),type=r<.58?'scout':r<.88?'fighter':'heavy';
 const d={scout:{hp:1,r:18,speed:46+level*5,points:18,wave:20,color:'#ff684d'},fighter:{hp:2,r:25,speed:34+level*4,points:45,wave:28,color:'#f15cff'},heavy:{hp:5,r:35,speed:24+level*3,points:100,wave:13,color:'#ffb23e'}}[type];
 enemies.push({x:W*.31+Math.random()*W*.38,y:H*.17-Math.random()*90,phase:Math.random()*6.28,type,...d,maxHp:d.hp,dead:false});
}
function kill(e){e.dead=true;score+=e.points*(active.double>0?2:1);burst(e.x,e.y,e.color,e.type==='heavy'?38:20);sound('boom');if(Math.random()<.12)spawnPower(e.x,e.y)}
function damage(){health--;burst(player.x,player.y-50,'#ff5c46',24);sound('damage');els.status.textContent='HULL BREACH';if(health<=0)gameOver()}
function spawnPower(x,y){const type=['rapid','shield','double'][Math.floor(Math.random()*3)];powers.push({x,y,type,speed:72,rot:0,dead:false})}
function collect(p){p.dead=true;active[p.type]=10;burst(p.x,p.y,p.type==='rapid'?'#ffc53f':p.type==='shield'?'#54edff':'#c881ff',24);sound('power');els.status.textContent=(p.type==='rapid'?'RAPID FIRE':p.type==='shield'?'DEFLECTOR SHIELD':'DOUBLE SCORE')+' ONLINE'}
function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*220;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.65,color,size:1+Math.random()*3})}}
function draw(){ctx.clearRect(0,0,W,H);drawWorld();drawBullets();drawEnemies();drawPowers();drawParticles();drawShip()}
function drawWorld(){
 // subtle moving atmosphere and horizon particles over premium scene
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<22;i++){const y=H*.22+((i*67+performance.now()*.02)%(H*.5)),x=((i*173+performance.now()*.03)%(W*.42))+W*.29;ctx.strokeStyle='rgba(80,225,255,.08)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W/2+(x-W/2)*.35,H*.44+(y-H*.44)*.2);ctx.lineTo(x,y);ctx.stroke()}
 ctx.restore();
}
function drawBullets(){ctx.save();ctx.globalCompositeOperation='lighter';for(const b of bullets){ctx.strokeStyle='#8cf6ff';ctx.shadowBlur=16;ctx.shadowColor='#3fe7ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,b.y+18);ctx.lineTo(b.x,b.y-24);ctx.stroke()}ctx.restore()}
function drawEnemies(){for(const e of enemies){const scale=.52+Math.max(0,Math.min(1,(e.y-H*.12)/(H*.62)))*.72;ctx.save();ctx.translate(e.x,e.y);ctx.scale(scale,scale);ctx.rotate(Math.sin(e.phase)*.08);ctx.shadowBlur=18;ctx.shadowColor=e.color;
 ctx.fillStyle='#09121e';ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-28);ctx.lineTo(18,-7);ctx.lineTo(44,6);ctx.lineTo(15,12);ctx.lineTo(8,30);ctx.lineTo(0,18);ctx.lineTo(-8,30);ctx.lineTo(-15,12);ctx.lineTo(-44,6);ctx.lineTo(-18,-7);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,2,7,0,Math.PI*2);ctx.fill();ctx.restore();
 if(e.hp<e.maxHp){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(e.x-20*scale,e.y-42*scale,40*scale,3);ctx.fillStyle=e.color;ctx.fillRect(e.x-20*scale,e.y-42*scale,40*scale*(e.hp/e.maxHp),3)}
}}
function drawPowers(){for(const p of powers){const c=p.type==='rapid'?'#ffc53f':p.type==='shield'?'#54edff':'#c881ff';ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.shadowBlur=22;ctx.shadowColor=c;ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.stroke();ctx.fillStyle=c;ctx.font='700 14px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.type==='rapid'?'⚡':p.type==='shield'?'◇':'×2',0,1);ctx.restore()}}
function drawParticles(){ctx.save();ctx.globalCompositeOperation='lighter';for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.9);ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.restore();ctx.globalAlpha=1}
function drawShip(){if(!player)return;ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.vx/W*.25);
 // glow
 ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(0,20,2,0,20,100);g.addColorStop(0,'rgba(255,215,137,.9)');g.addColorStop(.22,'rgba(255,92,42,.65)');g.addColorStop(1,'rgba(255,70,20,0)');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,30,90,100,0,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
 ctx.fillStyle='#071321';ctx.strokeStyle='#65efff';ctx.lineWidth=2;ctx.shadowBlur=18;ctx.shadowColor='#36ddff';
 ctx.beginPath();ctx.moveTo(0,-82);ctx.lineTo(25,-34);ctx.lineTo(108,20);ctx.lineTo(56,27);ctx.lineTo(24,14);ctx.lineTo(15,58);ctx.lineTo(0,76);ctx.lineTo(-15,58);ctx.lineTo(-24,14);ctx.lineTo(-56,27);ctx.lineTo(-108,20);ctx.lineTo(-25,-34);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#10283c';ctx.beginPath();ctx.moveTo(0,-65);ctx.lineTo(27,-6);ctx.lineTo(12,55);ctx.lineTo(0,65);ctx.lineTo(-12,55);ctx.lineTo(-27,-6);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle='#b8f9ff';ctx.shadowColor='#6ff7ff';ctx.shadowBlur=24;[-40,40].forEach(x=>{ctx.beginPath();ctx.ellipse(x,24,8,13,0,0,Math.PI*2);ctx.fill()});
 if(active.shield>0){ctx.strokeStyle='rgba(84,237,255,.8)';ctx.fillStyle='rgba(84,237,255,.05)';ctx.beginPath();ctx.ellipse(0,0,120,82,0,0,Math.PI*2);ctx.fill();ctx.stroke()}
 ctx.restore()}
function updateHud(){els.score.textContent=String(score).padStart(6,'0');els.high.textContent=String(high).padStart(6,'0');els.level.textContent=String(level).padStart(2,'0');els.health.innerHTML='';for(let i=0;i<5;i++){const h=document.createElement('i');h.className='heart '+(i<health?'on':'');els.health.appendChild(h)}
 for(const [k,el] of [['rapid',els.rapid],['shield',els.shield],['double',els.double]])el.textContent=active[k]>0?active[k].toFixed(1)+'s':'OFFLINE'}
function gameOver(){state='over';if(score>high){high=score;localStorage.setItem('starDefendersHigh',high)}$('finalScore').textContent=score;$('overScreen').classList.remove('hidden');sound('gameover');draw()}
function pause(){if(state!=='playing')return;state='paused';$('pauseScreen').classList.remove('hidden');cancelAnimationFrame(raf)}
function resume(){if(state!=='paused')return;state='playing';$('pauseScreen').classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop)}
function tone(freq,dur=.08,type='sine',vol=.04){if(muted)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur)}catch(e){}}
function sound(k){if(k==='shoot')tone(620,.045,'square',.025);else if(k==='boom'){tone(120,.18,'sawtooth',.05);setTimeout(()=>tone(65,.15,'triangle',.03),40)}else if(k==='power'){tone(440,.12,'sine',.05);setTimeout(()=>tone(660,.16,'sine',.04),70)}else if(k==='damage')tone(90,.25,'sawtooth',.06);else if(k==='gameover'){tone(160,.35,'sawtooth',.05);setTimeout(()=>tone(90,.5,'sine',.05),160)}else if(k==='level'){tone(440,.08,'sine',.04);setTimeout(()=>tone(660,.1,'sine',.04),90)}else if(k==='start')tone(320,.1,'sine',.04)}
addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowLeft','ArrowRight',' ','Spacebar'].includes(e.key))e.preventDefault()});addEventListener('keyup',e=>keys[e.key]=false);
$('start').onclick=start;$('restart').onclick=start;$('restartPause').onclick=start;$('pause').onclick=pause;$('resume').onclick=resume;
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'×':'♫'};
$('closeBrief').onclick=()=>$('brief').classList.add('closed');$('info').onclick=()=>$('brief').classList.toggle('closed');
function hold(id,key){const el=$(id);['pointerdown','pointerup','pointerleave','pointercancel'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();keys[key]=ev==='pointerdown'}))}
hold('left','ArrowLeft');hold('right','ArrowRight');hold('fire',' ');
updateHud();draw();
