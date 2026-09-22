// Change typography in place so the user compares precisely the same content.
(() => {
  const choices = {
    wenkai: {label:'标题：霞鹜文楷 · 正文：IBM Plex Sans SC',fonts:['Study WenKai','Study Plex','Study Plex Latin','Study Mono'],title:'霞鹜文楷'},
    plex: {label:'标题与正文：IBM Plex Sans SC',fonts:['Study Plex','Study Mono'],title:'IBM Plex'},
    zhuque: {label:'标题：朱雀仿宋 · 正文：IBM Plex Sans SC',fonts:['Study Zhuque','Study Plex','Study Plex Latin','Study Mono'],title:'朱雀仿宋'},
    anthropic: {label:'中文：文楷 / Plex · 西文：Anthropic Sans · 代码：Anthropic Mono Web',fonts:['Study WenKai','Study Plex','Study Anthropic Sans','Study Anthropic Mono'],title:'Anthropic Sans + Mono'},
    current: {label:'标题：Noto Serif SC · 正文：Noto Sans SC / Inter',fonts:['Roam Serif','Roam Sans','Roam Inter'],title:'当前宋体'},
  };
  const buttons=[...document.querySelectorAll('[data-choice]')],keys=buttons.map(button=>button.dataset.choice);
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
  const codeStatus=document.querySelector('#code-font-status');
  Promise.all(['Study Anthropic Sans','Study Anthropic Mono'].map(name=>document.fonts.load(`400 16px "${name}"`,'ilMW01'))).then(faces=>{
    if(faces.some(face=>face.length===0))throw new Error('Local Anthropic fonts unavailable');
    document.querySelector('.f-code-study').dataset.fontState='ready';
    codeStatus.textContent='本机 Anthropic 字体已就绪';
  }).catch(()=>{
    document.querySelector('.f-code-study').dataset.fontState='error';
    codeStatus.textContent='本机未加载 Anthropic 字体，请先安装';
  });
})();
