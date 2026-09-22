// The drawing front is tied directly to 65% of the viewport, with no easing lag.
(() => {
  const ns='http://www.w3.org/2000/svg';
  const root=document.querySelector('#journey');
  const svg=document.querySelector('#drawing-trail');
  const chapters=[...document.querySelectorAll('.t-chapter')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=n=>Math.max(0,Math.min(1,n));
  let samples=[],total=0,inkClip,tip,branches=[],frame=0,resizeFrame=0;
  const node=(tag,attrs={},parent=svg)=>{
    const element=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([name,value])=>element.setAttribute(name,value));
    parent.append(element);return element;
  };
  function atY(y) {
    let low=0,high=samples.length-1;
    while(high-low>1){const mid=(low+high)>>1;if(samples[mid].y<y)low=mid;else high=mid;}
    const a=samples[low],b=samples[high];
    const t=clamp((y-a.y)/(b.y-a.y || 1));
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,d:a.d+(b.d-a.d)*t};
  }
  function rebuild() {
    svg.replaceChildren();branches=[];
    const width=root.clientWidth,height=root.clientHeight;
    const mobile=innerWidth<=Number(root.dataset.breakpoint||680);
    const rootBox=root.getBoundingClientRect();
    const intro=document.querySelector('.t-intro');
    const center=mobile?26:width/2;
    const start=intro.offsetTop+intro.offsetHeight+24;
    const positions=[{x:center,y:start}];
    const measured=chapters.map(chapter=>({
      chapter,top:chapter.offsetTop,height:chapter.offsetHeight,
      heading:chapter.querySelector('.t-copy h2').getBoundingClientRect(),
      copy:chapter.querySelector('.t-copy').getBoundingClientRect(),
    }));
    measured.forEach((item,index)=>{
      const side=index%2?-1:1;
      positions.push({x:center+side*(mobile?5:24),y:item.top+28});
      positions.push({x:center-side*(mobile?6:34),y:item.top+item.height*.55});
      positions.push({x:center+side*(mobile?4:24),y:item.top+item.height-28});
      if(index<measured.length-1)positions.push({x:center-side*(mobile?7:width*.14),y:item.top+item.height+77});
    });
    positions.push({x:center,y:height-2});
    // Every control point advances in Y, so viewport position maps unambiguously to ink.
    let d=`M${positions[0].x} ${positions[0].y}`;
    positions.slice(1).forEach((point,index)=>{
      const previous=positions[index],delta=point.y-previous.y;
      d+=` C${previous.x} ${previous.y+delta*.5},${point.x} ${point.y-delta*.5},${point.x} ${point.y}`;
    });
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    const geometry=node('path',{d,fill:'none',stroke:'none'});
    const length=geometry.getTotalLength();
    samples=[];
    for(let i=0;i<=Math.ceil(length/3);i++){
      const at=Math.min(i*3,length),p=geometry.getPointAtLength(at);
      const x=p.x;
      const previous=samples.at(-1);
      samples.push({x,y:p.y,d:previous?previous.d+Math.hypot(x-previous.x,p.y-previous.y):0});
    }
    total=samples.at(-1).d;
    geometry.remove();
    const defs=node('defs');
    const clip=node('clipPath',{id:'revealed-trail'},defs);
    inkClip=node('rect',{x:0,y:0,width,height:0},clip);
    const layer=node('g',{'clip-path':'url(#revealed-trail)'});
    node('path',{d:`M${samples.map(p=>`${p.x},${p.y}`).join(' L')}`,class:'t-ink',fill:'none','stroke-width':2.1,'stroke-linecap':'round','stroke-linejoin':'round'},layer);
    // Branches and milestone marks are inside the same reveal boundary as the main line.
    measured.forEach((item,index)=>{
      const y=item.heading.top-rootBox.top+item.heading.height/2;
      const base=atY(y);
      const toRight=mobile || item.chapter.classList.contains('t-reverse');
      const endX=mobile?49:(toRight?item.copy.left-rootBox.left-12:item.copy.right-rootBox.left+12);
      const endY=y+5;
      const branch=node('path',{d:`M${base.x} ${base.y} C${base.x} ${base.y+15},${endX} ${endY+14},${endX} ${endY}`,class:'t-ink',fill:'none','stroke-width':1.2,'stroke-linecap':'round'},layer);
      const branchLength=branch.getTotalLength();
      branch.style.strokeDasharray=`${branchLength} ${branchLength}`;
      branch.style.strokeDashoffset=String(branchLength);
      const marks=node('g',{opacity:0},layer);
      node('circle',{cx:base.x,cy:base.y,r:mobile?3:4,class:'t-node'},marks);
      node('circle',{cx:endX,cy:endY,r:2,class:'t-ink-fill'},marks);
      const text=node('text',{x:base.x+(toRight?-12:12),y:base.y-15,'text-anchor':toRight?'end':'start'},marks);
      text.textContent=mobile?String(index+1).padStart(2,'0'):`0${index+1}`;
      branches.push({y,branch,length:branchLength,marks,chapter:item.chapter});
    });
    tip=node('g',{id:'trail-tip',opacity:0});
    node('circle',{r:8,class:'t-tip-halo'},tip);
    node('circle',{r:3.7,class:'t-ink-fill'},tip);
    render();
  }
  function render() {
    frame=0;
    const rect=root.getBoundingClientRect();
    const frontier=innerHeight*.65-rect.top;
    const point=atY(frontier);
    // A hard SVG clip guarantees that absolutely no future rail, mark or branch leaks out.
    inkClip.setAttribute('height',reduced.matches?root.clientHeight:Math.max(0,frontier));
    tip.setAttribute('transform',`translate(${point.x} ${point.y})`);
    tip.setAttribute('opacity',!reduced.matches&&frontier>=samples[0].y&&frontier<=samples.at(-1).y?1:0);
    branches.forEach(({y,branch,length,marks,chapter})=>{
      const progress=reduced.matches?1:clamp((frontier-y)/35);
      branch.style.strokeDashoffset=String(length*(1-progress));
      marks.setAttribute('opacity',String(progress));
      chapter.classList.toggle('is-reached',progress>0);
    });
    svg.dataset.progress=(point.d/total).toFixed(4);
    svg.dataset.tipViewportY=(point.y+rect.top).toFixed(2);
    svg.dataset.frontier=frontier.toFixed(2);
    svg.dataset.revealed=String(branches.filter(({y})=>frontier>y).length);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render);};
  addEventListener('scroll',schedule,{passive:true});
  new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(rebuild);}).observe(root);
  reduced.addEventListener('change',schedule);
  document.querySelector('#replay-trail').addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
  rebuild();
  document.fonts.ready.then(rebuild);
})();
