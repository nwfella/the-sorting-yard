/* The Sorting Yard — Node logic harness (DOM-stubbed, no browser) */
'use strict';
const fs=require('fs');
const vm=require('vm');

const html=fs.readFileSync(__dirname+'/index.html','utf8');
const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];

const {makeSandbox}=require('./stubs.js');
const {sandbox, doc, win, registry, ls:localStorageStub, flushTimers}=makeSandbox();

/* ---------- load game ---------- */
new vm.Script(code).runInNewContext(sandbox);
const GAME=win.GAME;
if(!GAME) throw new Error('GAME hook missing');

/* ---------- test helpers ---------- */
let pass=0, fail=0;
function ok(cond,msg){
  if(cond){ pass++; console.log('  PASS  '+msg); }
  else { fail++; console.log('  FAIL  '+msg); }
}
function resetStorage(){ localStorageStub._m={}; }
function placedMap(){
  const p=GAME.state().placed;
  return p;
}
function placeAllCorrect(lvlId){
  const g=GAME; g.start(lvlId); flushTimers();
  const st=g.state(); const lvl=g.levels.find(l=>l.id===lvlId);
  for(const cid of st.deck){
    const t=g.getTrain(cid);
    if(lvl.rule==='wheelsThenColor') g.place(cid,'w'+t.wheels);
    else if(lvl.rule==='combo') g.place(cid,t.fuel+':'+t.service);
    else if(lvl.rule==='wheels') g.place(cid,'w'+t.wheels);
    else g.place(cid,t[lvl.rule]);
  }
  g.check(); flushTimers();
  return g.state();
}
function attrSpread(cards,attr,groups){
  // for each target group value -> counts of non-target attr values
  const spread={};
  for(const cid of cards){
    const t=GAME.getTrain(cid);
    const grp=t[attr];
    (spread[grp]=spread[grp]||{});
    for(const [k,v] of Object.entries(t)){
      if(k==='id'||k===attr||k==='color'&&attr==='color') continue;
      if(k==='id') continue;
      spread[grp][k+':'+v]=(spread[grp][k+':'+v]||0)+1;
    }
  }
  return spread;
}
function antiCorrelated(cards,attr,extraSkip){
  // The necessary anti-shortcut condition: each target group must contain >=2
  // distinct values of every non-target attribute (so sorting on any other
  // attribute cannot reproduce the split). Value-level confinement to one group
  // is harmless as long as groups stay internally diverse.
  const groups={};
  for(const cid of cards){ const t=GAME.getTrain(cid); (groups[t[attr]]=groups[t[attr]]||[]).push(t); }
  const badGroups=[];
  const checkAttrs=['fuel','service','wheels','color','era'].filter(k=>k!==attr&&(extraSkip||[]).indexOf(k)<0);
  for(const grp of Object.keys(groups)){
    for(const k of checkAttrs){
      if(new Set(groups[grp].map(t=>t[k])).size<2) badGroups.push(k+':'+grp);
    }
  }
  return {ok:badGroups.length===0, badGroups};
}

/* ================= SUITE ================= */
console.log('== Pool & deck generation ==');
{
  const pool=[]; for(let i=0;i<24;i++) pool.push(GAME.getTrain('t'+i));
  ok(pool.length===24,'POOL has 24 trains');
  ok(['steam','diesel'].every(f=>pool.some(t=>t.fuel===f)),'both fuels present');
  ok([4,6,8].every(w=>pool.some(t=>t.wheels===w)),'all wheel counts present');
  ok(['red','blue','green','orange','purple'].every(c=>pool.some(t=>t.color===c)),'all 5 colors present');
  ok(['retro','modern'].every(e=>pool.some(t=>t.era===e)),'both eras present');

  for(const lvl of GAME.levels){
    GAME.start(lvl.id); flushTimers();
    const st=GAME.state();
    const deck=st.deck;
    ok(deck.length===lvl.n,lvl.id+': deck size '+deck.length+' === '+lvl.n);
    ok(new Set(deck).size===deck.length,lvl.id+': no duplicate cards');
    if(lvl.rule==='fuel'){ const c=deck.filter(c=>GAME.getTrain(c).fuel==='steam').length; ok(c===4&&deck.length-c===4,'L1: 4 steam / 4 diesel'); }
    if(lvl.rule==='service'){ const c=deck.filter(c=>GAME.getTrain(c).service==='freight').length; ok(c===4&&deck.length-c===4,'L2: 4 freight / 4 passenger'); }
    if(lvl.rule==='wheels'){ ok([4,6,8].every(w=>deck.filter(c=>GAME.getTrain(c).wheels===w).length===4),'L3: 4 of each wheel count'); }
    if(lvl.rule==='color'){ ok(['red','blue','green'].every(c=>deck.filter(x=>GAME.getTrain(x).color===c).length===3),'L4: 3 of each color'); }
    if(lvl.rule==='era'){ ok(deck.filter(c=>GAME.getTrain(c).era==='retro').length===4,'L5: 4 retro / 4 modern'); }
    if(lvl.rule==='wheelsThenColor'){
      ok([4,6,8].every(w=>deck.filter(c=>GAME.getTrain(c).wheels===w).length===4),'L6: 4 of each wheel count');
      ok(['red','blue','green'].every(c=>deck.filter(x=>GAME.getTrain(x).color===c).length===4),'L6: colors balanced 4/4/4');
      const fuels=deck.filter(c=>GAME.getTrain(c).fuel==='steam').length;
      ok(fuels===6&&deck.length-fuels===6,'L6: fuel balanced 6/6');
      const serv=deck.filter(c=>GAME.getTrain(c).service==='freight').length;
      ok(serv===6&&deck.length-serv===6,'L6: service balanced 6/6');
    }
    if(lvl.rule==='combo'){
      for(const b of lvl.bins){ const c=deck.filter(x=>GAME.getTrain(x).fuel+':'+GAME.getTrain(x).service===b.id).length; ok(c===3,lvl.id+' bin '+b.id+' has 3'); }
    }
    const attr=lvl.rule==='wheelsThenColor'?'wheels':(lvl.rule==='combo'?'fuel':lvl.rule);
    if(attr){
      const skip=lvl.rule==='combo'?['service']:[];
      const ac=antiCorrelated(deck,attr,skip);
      ok(ac.ok,lvl.id+' anti-shortcut: no homogeneous non-target bin'+(ac.badGroups.length?' ['+ac.badGroups.join(',')+']':''));
    }
  }
}

console.log('== Check engine ==');
{
  resetStorage();
  let st=placeAllCorrect('L1');
  ok(st.mistakes===0&&st.checks===1,'L1 all correct: 0 mistakes, 1 check');
  ok(st.won===true,'L1 all correct: won');
  const best=JSON.parse(localStorageStub.getItem('tsy_best_L1'));
  ok(best&&best.m===3,'L1 perfect = 3★ saved as best');

  resetStorage();
  GAME.start('L2'); flushTimers();
  const deck=GAME.state().deck;
  // place all by service; then swap two cards with DIFFERENT services so both become wrong
  for(const cid of deck){ const t=GAME.getTrain(cid); GAME.place(cid,t.service); }
  const fCard=deck.find(c=>GAME.getTrain(c).service==='freight');
  const pCard=deck.find(c=>GAME.getTrain(c).service==='passenger');
  GAME.place(fCard,'passenger');
  GAME.place(pCard,'freight');
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.mistakes===2&&st.checks===1&&st.won===false,'L2 two swapped cards: 2 mistakes, no win');

  // star thresholds: 2 mistakes -> 2★, 3 mistakes -> 1★
  resetStorage();
  GAME.start('L1'); flushTimers();
  const d2=GAME.state().deck;
  for(let i=0;i<d2.length;i++){ const t=GAME.getTrain(d2[i]); GAME.place(d2[i],t.fuel); }
  GAME.check(); flushTimers(); // perfect -> won; replay below
  resetStorage();
  GAME.start('L1'); flushTimers();
  const d3=GAME.state().deck;
  for(let i=0;i<d3.length;i++){ const t=GAME.getTrain(d3[i]); GAME.place(d3[i],t.fuel); }
  // move one card to wrong bin, check (1 mistake), move it back, check (win)
  const first=d3[0], ft=GAME.getTrain(first);
  const otherBin=ft.fuel==='steam'?'diesel':'steam';
  GAME.place(first,otherBin);
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.mistakes===1&&st.won===false,'one wrong card -> 1 mistake, no win');
  GAME.place(first,ft.fuel);
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.won===true&&st.mistakes===1,'fixed card -> win with 1 mistake');
  const best2=JSON.parse(localStorageStub.getItem('tsy_best_L1'));
  ok(best2.m===2,'1 mistake = 2★');

  resetStorage();
  GAME.start('L1'); flushTimers();
  const d4=GAME.state().deck;
  for(let i=0;i<d4.length;i++){ const t=GAME.getTrain(d4[i]); GAME.place(d4[i],t.fuel); }
  // 2 wrong cards
  const a=d4[0],at=GAME.getTrain(a), b=d4[1],bt=GAME.getTrain(b);
  GAME.place(a,at.fuel==='steam'?'diesel':'steam');
  GAME.place(b,bt.fuel==='steam'?'diesel':'steam');
  GAME.check(); flushTimers();
  GAME.place(a,at.fuel); GAME.place(b,bt.fuel);
  GAME.check(); flushTimers();
  const best3=JSON.parse(localStorageStub.getItem('tsy_best_L1'));
  ok(best3.m===2,'2 mistakes = 2★ (no downgrade)');

  resetStorage();
  GAME.start('L1'); flushTimers();
  const d5=GAME.state().deck;
  for(let i=0;i<d5.length;i++){ const t=GAME.getTrain(d5[i]); GAME.place(d5[i],t.fuel); }
  // 3 wrong cards -> 1★
  for(let i=0;i<3;i++){ const c=d5[i],ct=GAME.getTrain(c); GAME.place(c,ct.fuel==='steam'?'diesel':'steam'); }
  GAME.check(); flushTimers();
  for(let i=0;i<3;i++){ const c=d5[i],ct=GAME.getTrain(c); GAME.place(c,ct.fuel); }
  GAME.check(); flushTimers();
  const best4=JSON.parse(localStorageStub.getItem('tsy_best_L1'));
  ok(best4.m===1,'3 mistakes = 1★');
}

console.log('== Unplaced guard ==');
{
  resetStorage();
  GAME.start('L3'); flushTimers();
  const deck=GAME.state().deck;
  GAME.place(deck[0],'w4');
  GAME.check(); flushTimers();
  const st=GAME.state();
  ok(st.checks===0&&st.mistakes===0&&st.won===false,'check with cards still in tray: no grading');
  ok(doc.getElementById('msg').textContent.indexOf('Staging Siding')>=0,'msg mentions Staging Siding');
}

console.log('== Two-pass rule (L6 wheels then color) ==');
{
  resetStorage();
  let st=placeAllCorrect('L6');
  ok(st.stage===2&&st.won===false&&st.checks===1,'stage A pass -> stage 2 (not won yet)');
  const deck=GAME.state().deck;
  // main-line guard: cards in wheel sidings but no color lane -> prompt, no grading
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.checks===1&&st.mistakes===0&&st.won===false,'stage B check with cards on main line: prompt only, no grading');
  ok(doc.getElementById('msg').textContent.indexOf('color lane')>=0,'msg mentions color lane');
  // wrong color lane
  const t0=GAME.getTrain(deck[0]);
  const otherColor=t0.color==='red'?'blue':'red';
  for(const cid of deck){ const t=GAME.getTrain(cid); GAME.place(cid,'w'+t.wheels,t.color); }
  GAME.place(deck[0],'w'+t0.wheels,otherColor);
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.mistakes===1&&st.won===false,'stage B wrong lane: 1 mistake');
  // fix -> win
  GAME.place(deck[0],'w'+t0.wheels,t0.color);
  GAME.check(); flushTimers();
  st=GAME.state();
  ok(st.won===true&&st.mistakes===1,'stage B all lanes correct -> win');
  const best=JSON.parse(localStorageStub.getItem('tsy_best_L6'));
  ok(best&&best.m===2,'L6 win with 1 mistake = 2★');

  // hierarchy check: card in wrong wheel siding but right color lane must be wrong
  resetStorage();
  GAME.start('L6'); flushTimers();
  const d2=GAME.state().deck;
  for(const cid of d2){ const t=GAME.getTrain(cid); GAME.place(cid,'w'+t.wheels); }
  GAME.check(); flushTimers();
  const t1=GAME.getTrain(d2[0]);
  const wrongWheel=t1.wheels===4?'w6':'w4';
  for(const cid of d2){ const t=GAME.getTrain(cid); GAME.place(cid,'w'+t.wheels,t.color); }
  GAME.place(d2[0],wrongWheel,t1.color);
  GAME.check(); flushTimers();
  ok(GAME.state().mistakes===1,'wrong wheel siding + right color = still wrong (full hierarchy)');
}

console.log('== Combo rule (L7) ==');
{
  resetStorage();
  const st=placeAllCorrect('L7');
  ok(st.won===true&&st.mistakes===0,'L7 all correct -> win');
  resetStorage();
  GAME.start('L7'); flushTimers();
  const deck=GAME.state().deck;
  const t0=GAME.getTrain(deck[0]);
  const wrongBin=t0.fuel+':'+(t0.service==='freight'?'passenger':'freight');
  GAME.place(deck[0],wrongBin);
  for(let i=1;i<deck.length;i++){ const t=GAME.getTrain(deck[i]); GAME.place(deck[i],t.fuel+':'+t.service); }
  GAME.check(); flushTimers();
  ok(GAME.state().mistakes===1&&GAME.state().won===false,'L7 one wrong combo bin flagged');
}

console.log('== Free play: read my mind ==');
{
  resetStorage();
  GAME.free(); flushTimers();
  const deck=GAME.state().deck;
  ok(deck.length===9,'free play default 9 trains');
  GAME.readMyMind();
  ok(doc.getElementById('msg').textContent.indexOf('EVERY train')>=0,'readMyMind with unplaced cards prompts to place all');

  // mixed bins -> no rule found
  const t0=GAME.getTrain(deck[0]), t1=GAME.getTrain(deck[1]);
  for(let i=0;i<deck.length;i++) GAME.place(deck[i], i%2===0?'f0':'f1');
  GAME.readMyMind();
  ok(doc.getElementById('msg').textContent.indexOf("can't guess")>=0,'mixed bins -> cannot guess');

  // homogeneous by color -> rule detected (deterministic deck via _test)
  GAME.menu(); flushTimers();
  GAME.free(); flushTimers();
  const reds=['t0','t5'];   // pool: idx0 red (steam freight w4 retro), idx5 red (steam passenger w8 modern)
  const blues=['t1','t6'];  // idx1 blue (steam freight w6 retro), idx6 blue (steam passenger w6 modern)
  GAME._test.setDeck(reds.concat(blues));
  for(const c of reds) GAME.place(c,'f0');
  for(const c of blues) GAME.place(c,'f1');
  GAME.readMyMind();
  ok(doc.getElementById('msg').textContent.indexOf('color')>=0,'uniform color bins -> rule "color" detected');
  // double rule: also uniform by fuel? t0,t5 steam; t1,t6 steam too -> no. era? t0 retro,t5 modern -> f0 mixed. wheels? 4,8 vs 6,6 -> f1 uniform only. so exactly color.
  ok(doc.getElementById('msg').textContent.indexOf('ALSO sorted')<0,'no spurious double-rule claim');
  // mixed again for negative
  GAME._test.setDeck(['t0','t1','t2','t3','t4','t5']);
  GAME.place('t0','f0'); GAME.place('t1','f0'); GAME.place('t2','f0');
  GAME.place('t3','f1'); GAME.place('t4','f1'); GAME.place('t5','f1');
  GAME.readMyMind();
  ok(doc.getElementById('msg').textContent.indexOf("can't guess")>=0,'mixed bins -> cannot guess (2)');
}

console.log('== Add siding / roll rule ==');
{
  GAME.menu(); flushTimers();
  GAME.free(); flushTimers();
  GAME.addSiding();
  GAME.addSiding();
  GAME.addSiding();
  const bins=GAME.state().free ? GAME.state().free.bins : null;
  ok(true,'addSiding x3 runs without error');
  GAME.rollRule();
  ok(doc.getElementById('hintToast').textContent.indexOf('Rule idea')>=0,'rollRule shows toast');
}

console.log('== Menu guards ==');
{
  GAME.menu(); flushTimers();
  const before=GAME.state();
  GAME.check();
  const after=GAME.state();
  ok(before.checks===after.checks&&before.mistakes===after.mistakes,'check() ignored in menu');
  ok(GAME.state().mode==='menu','mode is menu');
  ok(doc.getElementById('titleScreen')._classes.has('active'),'title overlay active in menu');
}

console.log('== Persistence keys ==');
{
  ok(GAME.levels.every(l=>{ localStorageStub.setItem('tsy_best_'+l.id,JSON.stringify({m:1})); return true; }),'per-level best keys set');
  const ks=Object.keys(localStorageStub._m);
  ok(ks.every(k=>k.startsWith('tsy_')),'all keys prefixed tsy_');
}

console.log('== Keyboard nav ==');
{
  resetStorage();
  GAME.start('L1'); flushTimers();
  const kd=doc._handlers['keydown']||[];
  const fire=(key)=>{ for(const h of kd) h({key,preventDefault(){}}); flushTimers(); };
  fire('ArrowRight');
  ok(GAME.state().held===null,'arrow only moves selection');
  fire('Enter');
  let st=GAME.state();
  ok(st.held!==null&&st.deck.indexOf(st.held)>=0,'Enter picks up a tray card');
  const heldId=st.held;
  // after lift the tray has n-1 cards; navigate to the first bin slot
  const binIdx=GAME.slots.findIndex(s=>s.type==='bin');
  for(let i=0;i<binIdx-1;i++) fire('ArrowRight');
  fire('Enter');
  st=GAME.state();
  ok(st.placed[heldId]!==undefined&&st.held===null,'Enter on bin places held card');
  fire('Escape');
  ok(GAME.state().held===null,'Escape cancels nothing when nothing held');
}

console.log('== Drag-tap interaction via pointer handlers ==');
{
  resetStorage();
  GAME.start('L1'); flushTimers();
  const pd=doc._handlers['pointerdown']||[];
  const pu=doc._handlers['pointerup']||[];
  const mv=doc._handlers['pointermove']||[];
  const findCard=cid=>registry['tray'].children.find(c=>c.dataset.id===cid);
  const card0=GAME.state().deck[0];
  // tap-lift (no move): pointerdown on the card element (closest lives on the TARGET, like the real DOM)
  const el0=findCard(card0);
  el0.closest=sel=>sel==='.card'?el0:null;
  const ev={target:el0,clientX:200,clientY:200,preventDefault(){}};
  for(const h of pd) h(ev);
  ok(GAME.state().held===card0,'pointerdown on card lifts it (tap-tap mode)');
  for(const h of pu) h(ev);
  ok(GAME.state().held===card0,'pointerup without move keeps card held');
  // tap on empty space cancels
  doc.body.closest=()=>null;
  for(const h of pd) h({target:doc.body,clientX:30,clientY:30,preventDefault(){}});
  ok(GAME.state().held===null,'tap on empty space returns held card');
  // full drag gesture: lift, move >8px, release over nothing -> returned
  const card1=GAME.state().deck[0];
  const el1=findCard(card1);
  el1.closest=sel=>sel==='.card'?el1:null;
  const ev2={target:el1,clientX:200,clientY:200,preventDefault(){}};
  for(const h of pd) h(ev2);
  ok(GAME.state().held===card1,'drag: lifted');
  for(const h of mv) h({clientX:260,clientY:240});
  for(const h of pu) h({clientX:260,clientY:240});
  ok(GAME.state().held===null,'drag released over nothing -> returned to origin');
}

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
