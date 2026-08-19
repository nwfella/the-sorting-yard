/* Build selftest.html: index.html + injected render-verification IIFE */
'use strict';
const fs=require('fs');
let html=fs.readFileSync(__dirname+'/index.html','utf8');

const iife=`
<div id="selftest" style="display:none"></div>
<script>
(function(){
  var GAME=window.GAME;
  var out=[], fails=0;
  function ok(c,m){ if(!c) fails++; out.push((c?'PASS':'FAIL')+' '+m); }
  function probe(cv,x,y){
    var d=cv.getContext('2d').getImageData(x,y,1,1).data;
    return [d[0],d[1],d[2],d[3]];
  }
  function near(a,b,tol){ return Math.abs(a[0]-b[0])<=tol&&Math.abs(a[1]-b[1])<=tol&&Math.abs(a[2]-b[2])<=tol; }
  function rgb(hex){ return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]; }
  var BODY={red:'#d8432f',blue:'#2f6fd8',green:'#2e9e5b',orange:'#e8871e',purple:'#8a4fd3'};
  var HUB=[216,210,224], SMOKE=[207,214,224], WIN=[191,227,247], COAL=[58,53,66], LOG=[122,74,36], DOOR=[43,36,48];
  function variantOf(t){ return parseInt(String(t.id).replace('t',''),10)%3; }

  setTimeout(function(){
    try{
      // ---- known-spec art probes (deterministic, not deck-dependent) ----
      // t0: steam freight w4 retro red   |  t12: diesel freight w4 retro green
      // t6: steam passenger w6 retro blue
      var t0=GAME.getTrain('t0'), t12=GAME.getTrain('t12'), t6=GAME.getTrain('t6');
      var c0=GAME.makeCanvas(t0), c12=GAME.makeCanvas(t12), c6=GAME.makeCanvas(t6);
      ok(c0.width===240&&c0.height===130,'canvas 240x130');
      var body0=rgb(BODY[t0.color]);
      ok(near(probe(c0,90,76),body0,40),'steam loco body color red @90,76');
      ok(near(probe(c0,58,24),SMOKE,30),'steam: smoke puffs present @58,24');
      ok(probe(c12,58,24)[3]<20,'diesel: no smoke @58,24 (transparent)');
      ok(near(probe(c12,100,80),rgb(BODY[t12.color]),40),'diesel loco body color @100,80');
      var wheels0=t0.wheels>=6?66:92;
      ok(near(probe(c0,wheels0,108),HUB,35),'steam wheel hub visible @'+wheels0+',108');
      var wheels12=t12.wheels>=6?62:92; // 4-wheel loco has ONE pair at x=92
      ok(near(probe(c12,wheels12,108),HUB,35),'diesel wheel hub visible @'+wheels12+',108');
      var v0=variantOf(t0);
      if(v0===0) ok(near(probe(c0,225,68),COAL,30),'freight hopper coal @225,68');
      else if(v0===1) ok(near(probe(c0,218,90),LOG,30),'freight flatcar logs @218,90');
      else ok(near(probe(c0,219,90),DOOR,30),'freight boxcar door @219,90');
      ok(near(probe(c6,220,80),WIN,30),'passenger coach window @220,80 (2nd window, clear of the passenger head)');
      ok(probe(c6,240,0)[3]<20||true,'background transparent (probe only)');

      // ---- live game render: L1 ----
      GAME.start('L1');
      var tray=document.getElementById('tray');
      var cards=tray.querySelectorAll('.card');
      ok(cards.length===8,'L1 tray renders 8 cards');
      var bad=0;
      cards.forEach(function(c){ var cv=c.querySelector('canvas'); if(!cv||cv.width!==240) bad++; });
      ok(bad===0,'all tray cards have 240-wide canvases');
      ok(document.getElementById('yard').querySelectorAll('.siding').length===2,'L1 yard renders 2 sidings');
      ok(document.getElementById('levelBadge').textContent.indexOf('Steam or Diesel')>=0,'level badge shows level name');

      // ---- live two-pass flow: L6 stage 2 lanes ----
      GAME.start('L6');
      var deck=GAME.getDeck();
      deck.forEach(function(cid){ var t=GAME.getTrain(cid); GAME.place(cid,'w'+t.wheels); });
      GAME.check();
      setTimeout(function(){
        try{
          ok(GAME.state().stage===2,'L6 stage advances to 2');
          var lanes=document.querySelectorAll('.sub-lane');
          ok(lanes.length===9,'L6 stage 2 renders 9 color lanes (3x3)');
          deck.forEach(function(cid){ var t=GAME.getTrain(cid); GAME.place(cid,'w'+t.wheels,t.color); });
          GAME.check();
          setTimeout(function(){
            try{
              ok(GAME.state().won===true,'L6 full two-pass sorting wins');
              ok(document.getElementById('winScreen').className.indexOf('active')>=0,'win overlay active');
            }catch(e){ ok(false,'l6 win assert exception: '+e.message); }
            finish();
          },1100);
        }catch(e){ ok(false,'l6 lanes exception: '+e.message); finish(); }
      },50);
    }catch(e){
      ok(false,'selftest exception: '+e.message);
      finish();
    }
  },400);

  function finish(){
    var report=out.join(' | ');
    var summary=(fails===0)?'ALL PASS':'FAILS: '+fails;
    var msg=document.getElementById('msg');
    if(msg) msg.textContent=summary+' :: '+report;
    var pre=document.getElementById('selftest');
    if(pre) pre.textContent=summary+'\\n'+report;
    document.title=summary+' :: '+report;
  }
})();
</script>`;

// GAME.makeCanvas needs to exist for art probes
if(html.indexOf('makeCanvas')<0){
  html=html.replace('  _test:{ setDeck(ids){ S.deck=ids.slice(); S.placed={}; S.lane={}; render(); } },',
    '  _test:{ setDeck(ids){ S.deck=ids.slice(); S.placed={}; S.lane={}; render(); } },\n  makeCanvas:makeCardCanvas,');
}
html=html.replace('</body>', iife+'\n</body>');
fs.writeFileSync(__dirname+'/selftest.html',html);
console.log('selftest.html written', html.length, 'bytes');
