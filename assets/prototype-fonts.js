// Change typography in place so the user compares precisely the same content.
(() => {
  const choices = {
    wenkai: {label:'标题：霞鹜文楷 · 正文：IBM Plex Sans SC',fonts:['Study WenKai','Study Plex','Study Plex Latin','Study Mono'],title:'霞鹜文楷'},
    plex: {label:'标题与正文：IBM Plex Sans SC',fonts:['Study Plex','Study Mono'],title:'IBM Plex'},
    zhuque: {label:'标题：朱雀仿宋 · 正文：IBM Plex Sans SC',fonts:['Study Zhuque','Study Plex','Study Plex Latin','Study Mono'],title:'朱雀仿宋'},
    current: {label:'标题：Noto Serif SC · 正文：Noto Sans SC / Inter',fonts:['Roam Serif','Roam Sans','Roam Inter'],title:'当前宋体'},
  };
  const keys=Object.keys(choices),buttons=[...document.querySelectorAll('[data-choice]')];
  const status=document.querySelector('#font-status');
  let active='',generation=0;
  async function select(key,updateURL=true) {
    if(!choices[key])key='wenkai';
    active=key;
    const ticket=++generation,choice=choices[key];
    document.body.dataset.font=key;
    document.body.dataset.fontState='loading';
    document.title=choice.title+' · 字体对照 · AI游民';
    document.querySelector('#font-description').textContent=choice.label;
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===key)));
    status.textContent='字体加载中…';status.removeAttribute('data-failed');
    if(updateURL){const url=new URL(location.href);url.searchParams.set('font',key);history.replaceState(null,'',url);}
    try {
      const fonts=await Promise.all(choice.fonts.map(name=>document.fonts.load(`400 20px "${name}"`,name.includes('Mono')?'Agent 0123':'AI 探索')));
      if(fonts.some(f=>f.length===0))throw new Error('No matching font face');
      if(ticket!==generation)return;
      document.body.dataset.fontState='ready';status.textContent='字体已就绪';
    } catch {
      if(ticket!==generation)return;
      document.body.dataset.fontState='error';status.textContent='字体加载失败，请刷新';status.dataset.failed='true';
    }
  }
  buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.choice)));
  addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest('input,textarea,select,[contenteditable=true]'))return;
    event.preventDefault();select(keys[(keys.indexOf(active)+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length]);
  });
  select(new URL(location.href).searchParams.get('font'),false);
})();
