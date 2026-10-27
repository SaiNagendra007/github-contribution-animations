const COLORS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
const GLYPHS = [".", ":", "+", "#", "@"];
const $ = (id) => document.getElementById(id);
let DATA;
const animations = new Map();

const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeBack = (p) => { const c = 1.70158; const x = clamp(p) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
const mix = (a,b,t) => { const A=a.match(/\w\w/g).map(x=>parseInt(x,16)),B=b.match(/\w\w/g).map(x=>parseInt(x,16)); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*clamp(t))).join(",")})`; };
const formatDate = (s) => new Date(`${s}T12:00:00Z`).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
const safeCount = (i) => DATA.days[i]?.count ?? 0;
const safeLevel = (i) => DATA.days[i]?.level ?? 0;

function prepareCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width*dpr));
    canvas.height = Math.max(1, Math.round(rect.height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return {ctx,w:rect.width,h:rect.height};
  };
  return {ctx, resize};
}
function gridGeometry(w,h,count=DATA.days.length) {
  const cols=Math.ceil(count/7), gap=3, cell=Math.min(13,(w-32-gap*(cols-1))/cols,(h-28-gap*6)/7);
  const size=Math.max(2,cell), step=size+gap;
  const totalW=cols*step-gap, totalH=7*step-gap;
  return {cols,cell:size,gap,step,x:Math.max(24,(w-totalW)/2),y:Math.max(18,(h-totalH)/2)};
}
function drawGrid({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);
  const g=gridGeometry(w,h);
  ctx.font="10px 'DM Mono',monospace";ctx.fillStyle="#91a0af";
  ["Mon","Wed","Fri"].forEach((label,i)=>ctx.fillText(label,1,g.y+(i*2+1)*g.step+2));
  const duration=staticMode?Infinity:t;
  for(let i=0;i<DATA.days.length;i++){
    const col=Math.floor(i/7),row=i%7,delay=(col+row*1.6)*17;
    const p=staticMode?1:clamp((duration-delay)/520);
    if(p<=0)continue;
    const size=g.cell*(.2+.8*easeBack(p));
    const x=g.x+col*g.step+(g.cell-size)/2,y=g.y+row*g.step+(g.cell-size)/2;
    ctx.fillStyle=p<1?mix("#40c463",COLORS[safeLevel(i)],p):COLORS[safeLevel(i)];
    ctx.beginPath();ctx.roundRect(x,y,size,size,Math.min(2,size/4));ctx.fill();
  }
  const p=staticMode?1:clamp((t-180)/1600);
  const shown=Math.round(DATA.totalContributions*easeOut(p));
  ctx.fillStyle="#e6edf3";ctx.font="600 12px Inter, sans-serif";
  ctx.fillText(`${shown.toLocaleString()} contributions`,g.x,12);
}
function drawSkyline({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);
  const n=DATA.days.length,cols=Math.ceil(n/7),cell=Math.min(7,(w-45)/cols*.7),dx=cell+2,dy=cell+2;
  const ox=Math.max(24,(w-cols*dx)/2),oy=h-22;
  const max=Math.max(1,...DATA.counts),duration=staticMode?Infinity:t;
  // Draw back rows first so near rows sit on top.
  for(let row=6;row>=0;row--)for(let col=0;col<cols;col++){
    const i=col*7+row;if(i>=n)continue;
    const delay=(col+row*2)*12,p=staticMode?1:clamp((duration-delay)/430);if(!p)continue;
    const value=safeCount(i),height=(3+Math.sqrt(value)/Math.sqrt(max)*65)*easeOut(p);
    const x=ox+col*dx-row*2.2,y=oy-row*2.2-height;
    const front=COLORS[safeLevel(i)],top=mix(front,"#ffffff",.28),side=mix(front,"#000000",.28);
    ctx.fillStyle=side;ctx.beginPath();ctx.moveTo(x+cell,y+3);ctx.lineTo(x+cell+5,y);ctx.lineTo(x+cell+5,y+height);ctx.lineTo(x+cell,y+height+3);ctx.closePath();ctx.fill();
    ctx.fillStyle=front;ctx.fillRect(x,y+3,cell,height);
    ctx.fillStyle=top;ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+5,y);ctx.lineTo(x+cell+5,y);ctx.lineTo(x+cell,y+3);ctx.closePath();ctx.fill();
  }
  const best=DATA.counts.indexOf(max),col=Math.floor(best/7),row=best%7;
  if((staticMode||t>1900)&&best>=0){const x=ox+col*dx-row*2.2+cell/2,y=oy-row*2.2-(3+Math.sqrt(max)/Math.sqrt(max)*65)-4;ctx.strokeStyle="#9be9a8";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+22,y-18);ctx.lineTo(x+60,y-18);ctx.stroke();ctx.fillStyle="#9be9a8";ctx.font="10px 'DM Mono',monospace";ctx.fillText(`${max} · ${formatDate(DATA.days[best].date)}`,x+25,y-23);}
}
function weeklyTotals(){const weeks=[];for(let i=0;i<DATA.days.length;i+=7)weeks.push(DATA.days.slice(i,i+7).reduce((s,d)=>s+d.count,0));return weeks;}
function drawPulse({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);const weeks=weeklyTotals(),pad=18,base=h-20,top=18,step=(w-2*pad)/Math.max(1,weeks.length-1),max=Math.max(1,...weeks);
  const pts=weeks.map((v,i)=>({x:pad+i*step,y:base-(v/max)*(base-top)}));
  const progress=staticMode?1:clamp(t/1250),visible=Math.max(1,Math.ceil(pts.length*progress));
  ctx.strokeStyle="#365542";ctx.lineWidth=1.5;ctx.beginPath();pts.slice(0,visible).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  const dot=pts[Math.min(pts.length-1,visible-1)];if(dot){ctx.fillStyle="#9be9a8";ctx.beginPath();ctx.arc(dot.x,dot.y,3,0,Math.PI*2);ctx.fill();}
  const pour=staticMode?1:clamp((t-1300)/1000);
  const g=gridGeometry(w,base-top,DATA.days.length),limit=Math.floor(DATA.days.length*pour);
  DATA.days.forEach((d,i)=>{const col=Math.floor(i/7),row=i%7,x=pad+col*(w-2*pad)/Math.max(1,Math.ceil(DATA.days.length/7)-1),y=top+row*7; if(i<limit){ctx.fillStyle=COLORS[d.level];ctx.fillRect(Math.min(w-5,x),base-5-row*7,4,4);}});
}
function drawRing({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);const cx=w/2,cy=h/2,r=Math.min(w,h)*.42,innerGap=3,thick=Math.max(2,Math.min(7,r*.065)),duration=staticMode?Infinity:t;
  const weeks=Math.ceil(DATA.days.length/7),progress=staticMode?1:clamp(duration/1900);
  for(let i=0;i<DATA.days.length;i++){
    const week=Math.floor(i/7),day=i%7;if(week/weeks>progress)continue;
    const a0=-Math.PI/2+(week/weeks)*Math.PI*2+.009,a1=-Math.PI/2+((week+1)/weeks)*Math.PI*2-.009;
    const radius=r-day*(thick+innerGap);
    ctx.beginPath();ctx.arc(cx,cy,radius,a0,a1);ctx.arc(cx,cy,radius-thick,a1,a0,true);ctx.closePath();ctx.fillStyle=COLORS[safeLevel(i)];ctx.fill();
  }
  ctx.textAlign="center";ctx.fillStyle="#e6edf3";ctx.font="600 19px Inter,sans-serif";ctx.fillText(DATA.totalContributions.toLocaleString(),cx,cy-2);
  ctx.fillStyle="#91a0af";ctx.font="10px 'DM Mono',monospace";ctx.fillText("CONTRIBUTIONS",cx,cy+15);ctx.textAlign="left";
}
function currentStreak() {
  let end=DATA.days.length-1;
  if(end>=0&&DATA.days[end].count===0)end--;
  let start=end;while(start>0&&DATA.days[start-1].count>0)start--;
  return end>=0&&DATA.days[end]?.count>0?{start,end,length:end-start+1}: {start:-1,end:-1,length:0};
}
function drawStreak({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);const g=gridGeometry(w,h),streak=currentStreak();
  DATA.days.forEach((d,i)=>{const col=Math.floor(i/7),row=i%7;ctx.fillStyle=COLORS[d.level];ctx.globalAlpha=.22;ctx.fillRect(g.x+col*g.step,g.y+row*g.step,g.cell,g.cell);ctx.globalAlpha=1;});
  if(streak.length){const p=staticMode?1:clamp(t/(streak.length*65)),current=Math.min(streak.end,streak.start+Math.floor(p*streak.length));
    for(let i=streak.start;i<=current;i++){const col=Math.floor(i/7),row=i%7;ctx.fillStyle=COLORS[Math.max(2,safeLevel(i))];ctx.shadowColor="#9be9a8";ctx.shadowBlur=i===current?12:0;ctx.fillRect(g.x+col*g.step,g.y+row*g.step,g.cell,g.cell);ctx.shadowBlur=0;}
    const col=Math.floor(current/7),row=current%7;ctx.strokeStyle="#ffffff";ctx.lineWidth=1.5;ctx.strokeRect(g.x+col*g.step-2,g.y+row*g.step-2,g.cell+4,g.cell+4);
    ctx.fillStyle="#9be9a8";ctx.font="600 13px Inter,sans-serif";ctx.fillText(`${Math.max(1,current-streak.start+1)} day${current===streak.start?"":"s"}`,g.x,g.y+7*g.step+15);
  }else{ctx.fillStyle="#91a0af";ctx.font="12px Inter,sans-serif";ctx.fillText("No active streak in the returned calendar.",g.x,g.y+30);}
}
function drawTerminal({ctx,w,h,t,staticMode=false}) {
  ctx.clearRect(0,0,w,h);ctx.fillStyle="#07110b";ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#9be9a8";ctx.font="11px 'DM Mono',monospace";const command="$ gh contribution-calendar --year 1";ctx.fillText(command.slice(0,staticMode?command.length:Math.floor(clamp(t/500)*command.length)),12,19);
  const cols=Math.max(1,Math.floor((w-24)/10)),rows=Math.max(1,Math.floor((h-50)/15)),n=Math.min(DATA.days.length,cols*rows),progress=staticMode?1:clamp((t-550)/1900);
  for(let i=0;i<n;i++){const level=safeLevel(i),settled=i<n*progress;const glyph=settled?GLYPHS[level]:GLYPHS[Math.floor(Math.abs(Math.sin(i*12.989+t*.02))*5)];ctx.fillStyle=settled?COLORS[level]:"#50765a";ctx.fillText(glyph,12+(i%cols)*10,43+Math.floor(i/cols)*15);}
  if(staticMode||t>2500){ctx.fillStyle="#91a0af";ctx.fillText(`TOTAL ${DATA.totalContributions.toLocaleString()}  ·  ${DATA.username}`,12,h-10);}
}
const DRAWERS={grid:drawGrid,skyline:drawSkyline,pulse:drawPulse,ring:drawRing,streak:drawStreak,terminal:drawTerminal};

function setupAnimation(id) {
  const canvas=$(id),{ctx,resize}=prepareCanvas(canvas);
  const state={id,canvas,ctx,resize,start:0,raf:0,visible:false,played:false,box:null};
  const draw=(t,staticMode=false)=>{const dims=resize();DRAWERS[id]({...dims,t,staticMode});};
  const stop=()=>{if(state.raf)cancelAnimationFrame(state.raf);state.raf=0;};
  const frame=(now)=>{if(!state.visible)return;const elapsed=now-state.start;draw(elapsed);if(elapsed<3200)state.raf=requestAnimationFrame(frame);else{state.raf=0;state.played=true;}};
  const play=()=>{stop();state.start=performance.now();state.played=false;if(matchMedia("(prefers-reduced-motion: reduce)").matches){draw(Infinity,true);state.played=true;return;}state.raf=requestAnimationFrame(frame);};
  const observer=new IntersectionObserver((entries)=>{for(const entry of entries){state.visible=entry.isIntersecting;if(state.visible&&!state.played&&!state.raf)play();else if(!state.visible)stop();}},{threshold:.4});
  observer.observe(canvas);
  state.play=play;state.draw=draw;state.resizeDraw=()=>draw(state.played?Infinity:performance.now()-state.start,state.played);
  animations.set(id,state);
  return state;
}

function setupGridTooltip() {
  const canvas=$("grid"),tip=$("tooltip");
  const locate=(event)=>{
    const state=animations.get("grid");if(!DATA?.days?.length)return;
    const rect=canvas.getBoundingClientRect(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    const g=gridGeometry(rect.width,rect.height),col=Math.floor((x-g.x)/g.step),row=Math.floor((y-g.y)/g.step),i=col*7+row;
    if(x<g.x||y<g.y||col<0||row<0||row>6||col>=g.cols||i>=DATA.days.length||x>g.x+col*g.step+g.cell||y>g.y+row*g.step+g.cell){tip.hidden=true;return;}
    const d=DATA.days[i];tip.textContent=`${d.count} contributions · ${formatDate(d.date)}`;tip.hidden=false;
    tip.style.left=`${Math.min(Math.max(0,x+10),Math.max(0,rect.width-tip.offsetWidth))}px`;
    tip.style.top=`${Math.max(0,y-30)}px`;
  };
  canvas.addEventListener("pointermove",locate);canvas.addEventListener("pointerleave",()=>tip.hidden=true);
}
function updateSummary() {
  $("total").textContent=DATA.totalContributions.toLocaleString();
  $("range").textContent=`${formatDate(DATA.start)} – ${formatDate(DATA.end)}`;
  $("updated").textContent=DATA.generatedAt?new Date(DATA.generatedAt).toLocaleDateString():"not generated";
  const streak=currentStreak();$("streak-caption").textContent=streak.length?`Current streak in returned data: ${streak.length} day${streak.length===1?"":"s"} (${formatDate(DATA.days[streak.start].date)} – ${formatDate(DATA.days[streak.end].date)}).`:"No current streak found in the returned calendar.";
}
async function init(){
  try{
    const response=await fetch("./data/github.json",{cache:"no-store"});
    if(!response.ok)throw new Error(`Could not load data/github.json (${response.status}).`);
    DATA=await response.json();
    if(!DATA.days?.length)throw new Error("Contribution data is still a placeholder. Follow the README to run the fetch script.");
    updateSummary();Object.keys(DRAWERS).forEach(setupAnimation);setupGridTooltip();
    document.querySelectorAll("[data-replay]").forEach(button=>button.addEventListener("click",()=>animations.get(button.dataset.replay)?.play()));
    window.addEventListener("resize",()=>animations.forEach(state=>{if(state.visible)state.resizeDraw();}));
    $("status").textContent=`Loaded ${DATA.days.length} daily records for ${DATA.username}.`;
  }catch(error){$("status").textContent=error.message;$("status").classList.add("error");}
}
init();
