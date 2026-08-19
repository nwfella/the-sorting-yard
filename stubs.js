/* Shared DOM/browser stubs for The Sorting Yard Node harnesses */
'use strict';
function makeCtxStub(){
  return new Proxy({}, { get(t,p){
    if(p==='canvas') return null;
    return ()=>{};
  }, set(){ return true; } });
}
function makeEl(tag){
  const el={
    tagName:(tag||'div').toUpperCase(),
    children:[], _classes:new Set(), _handlers:{},
    style:{}, dataset:{}, attrs:{},
    classList:{
      add:(...c)=>c.forEach(x=>el._classes.add(x)),
      remove:(...c)=>c.forEach(x=>el._classes.delete(x)),
      toggle:(c,f)=>{ if(f===undefined){ el._classes.has(c)?el._classes.delete(c):el._classes.add(c); } else { f?el._classes.add(c):el._classes.delete(c); } },
      contains:c=>el._classes.has(c)
    },
    appendChild(c){ if(c.parent) c.parent.removeChild(c); c.parent=el; el.children.push(c); return c; },
    removeChild(c){ const i=el.children.indexOf(c); if(i>=0) el.children.splice(i,1); if(c.parent===el) c.parent=null; return c; },
    insertBefore(c,ref){ if(c.parent) c.parent.removeChild(c); c.parent=el; const i=ref?el.children.indexOf(ref):-1; if(i>=0) el.children.splice(i,0,c); else el.children.push(c); return c; },
    replaceWith(n){ if(el.parent){ el.parent.insertBefore(n,el); el.parent.removeChild(el); } },
    addEventListener(ev,fn){ (el._handlers[ev]=el._handlers[ev]||[]).push(fn); },
    removeEventListener(){},
    setAttribute(k,v){ el.attrs[k]=String(v); },
    getAttribute(k){ return el.attrs[k]; },
    querySelector(sel){
      const dfs=(node)=>{
        if(sel[0]==='.'&&node._classes.has(sel.slice(1))) return node;
        if(sel[0]==='#'&&node._id===sel.slice(1)) return node;
        if(sel[0]!=='.'&&sel[0]!=='#'&&node.tagName===sel.toUpperCase()) return node;
        for(const c of node.children){ const r=dfs(c); if(r) return r; }
        return null;
      };
      return dfs(el);
    },
    querySelectorAll(sel){
      if(sel[0]==='.') return el.children.filter(c=>c._classes.has(sel.slice(1)));
      if(sel==='[data-zone="bin"]') return el.children.filter(c=>c.dataset.zone==='bin');
      if(sel==='[data-zone="lane"]') return el.children.filter(c=>c.dataset.zone==='lane');
      return [];
    },
    closest(){ return null; },
    getBoundingClientRect(){ return {width:100,height:80,left:0,top:0,right:100,bottom:80}; },
    scrollIntoView(){},
    focus(){}, select(){},
    click(){ const h=el._handlers['click']; if(h) h.forEach(f=>f({target:el,currentTarget:el,stopPropagation(){},preventDefault(){}})); },
    fire(ev,obj){ const h=el._handlers[ev]; if(h) h.forEach(f=>f(Object.assign({target:el,currentTarget:el,preventDefault(){},stopPropagation(){},clientX:100,clientY:100},obj||{}))); },
    get textContent(){ return el._text||''; }, set textContent(v){ el._text=String(v); },
    get innerHTML(){ return el._html||''; },
    set innerHTML(v){
      el._html=String(v); el.children=[];
      const re=/<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
      let m;
      while((m=re.exec(el._html))!==null){
        const c=makeEl(m[1]);
        const attrStr=m[2]||'';
        const cls=attrStr.match(/class="([^"]*)"/);
        if(cls) cls[1].split(/\s+/).forEach(x=>x&&c._classes.add(x));
        const did=attrStr.match(/data-([a-z-]+)="([^"]*)"/g);
        if(did) for(const d of did){ const dm=d.match(/data-([a-z-]+)="([^"]*)"/); c.dataset[dm[1]]=dm[2]; }
        const idm=attrStr.match(/id="([^"]*)"/);
        if(idm) c._id=idm[1];
        const txt=m[3].replace(/<[^>]*>/g,'');
        if(txt) c._text=txt;
        c.parent=el;
        el.children.push(c);
      }
    },
    get parent(){ return el._parent; }, set parent(p){ el._parent=p; },
    get id(){ return el._id||''; }, set id(v){ el._id=v; },
    get className(){ return [...el._classes].join(' '); },
    set className(v){ el._classes=new Set(String(v).split(/\s+/).filter(Boolean)); }
  };
  if(tag==='canvas'){
    el.getContext=()=>el._ctx||(el._ctx=makeCtxStub());
    el.width=0; el.height=0;
  }
  return el;
}
function makeSandbox(){
  const registry={};
  const getEl=id=>{ if(!registry[id]) registry[id]=makeEl(id==='confetti'?'canvas':'div'); return registry[id]; };
  const doc={
    _handlers:{}, _registry:registry,
    getElementById:id=>getEl(id),
    createElement:tag=>makeEl(tag),
    querySelector:()=>null,
    querySelectorAll:()=>[],
    addEventListener(ev,fn){ (doc._handlers[ev]=doc._handlers[ev]||[]).push(fn); },
    body:makeEl('body'),
    elementFromPoint:()=>null
  };
  const win={ addEventListener(){}, removeEventListener(){}, GAME:null };
  const ls={
    _m:{},
    getItem(k){ return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null; },
    setItem(k,v){ this._m[k]=String(v); },
    removeItem(k){ delete this._m[k]; }
  };
  let timers=[];
  const sandbox={
    window:win, document:doc, localStorage:ls,
    innerWidth:800, innerHeight:900, devicePixelRatio:1,
    setTimeout:(fn,ms)=>{ timers.push({fn,ms}); return timers.length; },
    clearTimeout:()=>{}, setInterval:()=>0, clearInterval:()=>{},
    requestAnimationFrame:()=>0, cancelAnimationFrame:()=>{},
    Math, JSON, Object, Array, String, Number, Boolean, Set, Map, RegExp, Date,
    parseInt, parseFloat, isNaN, isFinite, Error, TypeError, console, Promise
  };
  sandbox.globalThis=sandbox;
  return { sandbox, doc, win, ls, registry, flushTimers:()=>{ const t=timers; timers=[]; for(const x of t) x.fn(); } };
}
module.exports={ makeSandbox, makeEl };
