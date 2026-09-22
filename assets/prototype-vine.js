// Original SVG artwork; inspired by Blume's scroll-grown vine interaction.
(() => {
  const ns = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 680px)');
  const svgNode = (name, attrs = {}, parent) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent?.append(node);
    return node;
  };
  function flower(svg, x, y, size = 1, angle = 0) {
    const group = svgNode('g', {class:'v-bloom', transform:`translate(${x} ${y}) rotate(${angle}) scale(${size})`}, svg);
    const inner = svgNode('g', {class:'v-bloom-inner'}, group);
    const head = svgNode('g', {class:'v-bloom-head'}, inner);
    for (let i = 0; i < 9; i++) svgNode('ellipse', {cx:0,cy:-16,rx:7.3,ry:14,transform:`rotate(${i * 40})`,class:i%2 ? 'v-petal-light':'v-petal'}, head);
    svgNode('circle', {r:9,fill:'#dec285'}, head);
    svgNode('circle', {r:5.8,fill:'#755335'}, head);
    for (let i=0;i<7;i++) svgNode('circle',{cx:Math.cos(i)*3.5,cy:Math.sin(i)*3.5,r:0.8,fill:'#e4c78d'},head);
    return group;
  }
  function leaf(svg, x, y, angle, scale = 1) {
    const group = svgNode('g', {class:'v-leaf',transform:`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}, svg);
    svgNode('path', {d:'M0 0 C5 -13 20 -17 30 -13 C25 -1 10 5 0 0Z',fill:angle%3>1?'#819660':'#a1b278',stroke:'#78915d','stroke-width':.65},group);
    svgNode('path', {d:'M1 0 Q15 -8 28 -12',fill:'none',stroke:'#647b4e','stroke-width':.7},group);
    return group;
  }
  const portrait = document.querySelector('#portrait-vine');
  const ring = svgNode('path',{d:'M165 387 C47 368 29 231 92 128 C135 57 240 45 328 81 C449 130 444 285 355 354 C285 411 233 354 263 325',fill:'none',stroke:'#7e9663','stroke-width':2.4,'stroke-linecap':'round'},portrait);
  const ringLength = ring.getTotalLength();
  for(let i=12;i<ringLength-20;i+=32){const p=ring.getPointAtLength(i);const q=ring.getPointAtLength(i+2);const a=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;leaf(portrait,p.x,p.y,a+(i%64<32?-58:168),.65+(Math.sin(i)*.13));}
  [[92,130,.7,-15],[321,78,.82,12],[392,245,.54,0],[160,384,.47,-12],[334,369,.68,15]].forEach(args=>flower(portrait,...args));
  const closing = document.querySelector('#closing-flower');
  svgNode('path',{d:'M49 127 C42 103 56 75 49 37',fill:'none',stroke:'#839869','stroke-width':2},closing);
  leaf(closing,49,100,-26,.8);leaf(closing,49,81,180,.7);flower(closing,49,35,.88);

  const journey = document.querySelector('#journey');
  const trail = document.querySelector('#growing-vine');
  const chapters = [...document.querySelectorAll('.v-chapter')];
  let stem, length = 0, parts = [], frame = 0;
  function rebuild() {
    const width = journey.clientWidth, height = journey.clientHeight;
    trail.replaceChildren();
    trail.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const intro = document.querySelector('.v-journey-intro');
    const start = intro.offsetTop + intro.offsetHeight + 24;
    const x = mobile.matches ? 24 : width / 2;
    const anchors = chapters.map(chapter => ({x:x, y:chapter.offsetTop + (mobile.matches?35:chapter.offsetHeight/2)}));
    let d = `M${x} ${start}`;
    let previousY = start;
    anchors.forEach((point, index) => {
      const sway = mobile.matches ? 13 : (index % 2 ? -1:1)*Math.min(150,width*.15);
      const dy = point.y - previousY;
      d += ` C${x+sway} ${previousY+dy*.35},${x-sway} ${previousY+dy*.66},${x} ${point.y}`;
      previousY = point.y;
    });
    const end = height - 4;
    d += ` C${x+(mobile.matches?9:65)} ${previousY+(end-previousY)*.4},${x} ${end-35},${x} ${end}`;
    svgNode('path',{d,fill:'none',stroke:'#dfe4d3','stroke-width':mobile.matches?1:1.3,'stroke-linecap':'round','stroke-dasharray':'2 10',opacity:'.55'},trail);
    stem = svgNode('path',{d,fill:'none',stroke:'#829564','stroke-width':mobile.matches?2.1:3.2,'stroke-linecap':'round'},trail);
    length = stem.getTotalLength();
    stem.style.strokeDasharray = `${length} ${length}`;
    parts=[];
    for(let at=35;at<length-15;at+=mobile.matches?77:55){const p=stem.getPointAtLength(at);const q=stem.getPointAtLength(at+2);const angle=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;const node=leaf(trail,p.x,p.y,angle+(Math.floor(at/55)%2?170:-70),mobile.matches?.4:.64);parts.push({at,node});}
    anchors.forEach((anchor,index)=>{
      const targetY=anchor.y-(mobile.matches?0:54);
      let at=0;
      for(let i=0;i<=length;i+=3){if(stem.getPointAtLength(i).y>=targetY){at=i;break;}}
      const p=stem.getPointAtLength(at);
      parts.push({at,node:flower(trail,p.x,p.y,mobile.matches?.43:.73,index*23)});
    });
    update();
  }
  function update(){
    frame=0;
    const targetY=innerHeight*.77-journey.getBoundingClientRect().top;
    let drawn=length;
    if(!reduced.matches){
      let low=0,high=length;
      for(let i=0;i<16;i++){const mid=(low+high)/2;if(stem.getPointAtLength(mid).y<targetY)low=mid;else high=mid;}
      drawn=(low+high)/2;
    }
    stem.style.strokeDashoffset=String(length-drawn);
    parts.forEach(({at,node})=>node.classList.toggle('is-grown',drawn>at));
    trail.dataset.progress=(drawn/length).toFixed(3);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  addEventListener('scroll',schedule,{passive:true});
  let resizeFrame=0;
  new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(rebuild);}).observe(journey);
  reduced.addEventListener('change',schedule);
  document.querySelectorAll('[data-flower]').forEach(button=>button.addEventListener('click',()=>{
    document.documentElement.dataset.bloom=button.dataset.flower;
    document.querySelectorAll('[data-flower]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  }));
  document.querySelector('#replay-vine').addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
  rebuild();
})();
