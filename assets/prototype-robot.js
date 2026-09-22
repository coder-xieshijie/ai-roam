// Scroll position drives a chapter-to-chapter guide. No independent animation loop.
(() => {
  const route = document.querySelector('#journey');
  const svg = document.querySelector('#robot-track');
  const guide = document.querySelector('#robot-guide');
  const chapters = [...document.querySelectorAll('.r-chapter')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  let path, points = [], stops = [], totalLength = 0, frame = 0;
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => n * n * (3 - 2 * n);

  function makePath(d, attrs) {
    const node = document.createElementNS(ns, 'path');
    Object.entries({d, fill:'none', ...attrs}).forEach(([name,value]) => node.setAttribute(name, value));
    svg.append(node);
    return node;
  }

  function lengthAtY(y) {
    let low = 0, high = totalLength;
    for (let i=0;i<18;i++) {
      const middle = (low+high)/2;
      if (path.getPointAtLength(middle).y < y) low=middle;
      else high=middle;
    }
    return (low+high)/2;
  }

  function rebuild() {
    const box = route.getBoundingClientRect();
    points = chapters.map(chapter => {
      const marker = chapter.querySelector('.r-stop').getBoundingClientRect();
      return {x:marker.left-box.left+marker.width/2, y:marker.top-box.top+marker.height/2};
    });
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${route.clientWidth} ${route.clientHeight}`);
    let d = `M${points[0].x} ${points[0].y}`;
    points.slice(1).forEach((point, index) => {
      const previous = points[index];
      const middle = (point.y+previous.y)/2;
      const bend = innerWidth<=680 ? 6 : 18;
      d += ` C${point.x+bend} ${middle-70},${point.x-bend} ${middle+70},${point.x} ${point.y}`;
    });
    makePath(d, {stroke:'#d1cec4','stroke-width':1.5,'stroke-dasharray':'4 7'});
    path = makePath(d, {stroke:'#cd5c40','stroke-width':1.8,'stroke-linecap':'round'});
    totalLength = path.getTotalLength();
    path.style.strokeDasharray = `${totalLength} ${totalLength}`;
    stops = points.map(point => lengthAtY(point.y));
    render();
  }

  function render() {
    frame = 0;
    const focus = innerHeight * .32 - route.getBoundingClientRect().top;
    let distance = 0, active = 0;
    for (let i=0;i<points.length-1;i++) {
      const previous = points[i], next = points[i+1];
      const gap = next.y-previous.y;
      // Stay at the chapter while it is being read; travel in the transition band.
      const progress = clamp((focus-previous.y-gap*.63)/(gap*.24));
      if (focus>=previous.y) {
        distance = stops[i]+(stops[i+1]-stops[i])*smooth(progress);
        active = progress>=.5 ? i+1 : i;
      }
    }
    if (focus>=points.at(-1).y) { distance=totalLength; active=points.length-1; }
    const point = path.getPointAtLength(distance);
    const size = innerWidth<=680 ? 34 : 48;
    guide.style.transform = `translate(${point.x-size/2}px,${point.y-size/2}px)`;
    guide.querySelector('.r-guide-label').textContent = `${String(active+1).padStart(2,'0')} / 04`;
    guide.dataset.stop = chapters[active].id;
    path.style.strokeDashoffset = String(reduced.matches ? 0 : totalLength-distance);
    svg.dataset.progress = (distance/totalLength).toFixed(3);
    chapters.forEach((chapter, index) => {
      chapter.classList.toggle('is-current', index===active);
      chapter.classList.toggle('is-passed', reduced.matches || index<active);
    });
  }

  const schedule = () => { if(!frame) frame=requestAnimationFrame(render); };
  addEventListener('scroll', schedule, {passive:true});
  let resizeFrame=0;
  new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(rebuild);
  }).observe(route);
  reduced.addEventListener('change', schedule);
  document.querySelector('#replay-robot').addEventListener('click', () => {
    window.scrollTo({top:0, behavior:reduced.matches?'instant':'smooth'});
  });
  rebuild();
})();
