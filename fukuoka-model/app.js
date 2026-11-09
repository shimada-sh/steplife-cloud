'use strict';
/* 足の観察と連携 画面モック v1（2026-11-09）。判定基準表 案v2.3 に基づく。データはすべて架空。 */
const TODAY = '2026-11-16';
const CATS = ['A','B','C','D','E'];
const FREQN = {A:1,B:2,C:3,D:4,E:0};           // 頻度の目盛り（見た目用）
const FREQ = {A:'月1回',B:'2週に1回',C:'週1回',D:'透析日ごと',E:'当日連絡'};

const W_GROUPS = [
  ['g1','傷なし','#ca8a04',['白癬','胼胝','鶏眼','巻き爪','乾燥・浅い亀裂']],
  ['g2','傷・手前','#ea580c',['皮膚欠損','深い亀裂','胼胝下出血','黒点','血腫','水疱']],
  ['g3','壊死','#7f1d1d',['乾性壊死','湿性壊死']],
  ['g4','深部','#6b21a8',['発赤 2 cm以上','腱・骨まで','ソーセージ趾','趾の腫れ 2週以上','骨・関節が見える']]
];
const W_GROUP_OF = {}; W_GROUPS.forEach(([g,,,items])=>items.forEach(t=>W_GROUP_OF[t]=g));
const INF = ['発赤','熱感','腫脹','圧痛','膿'];
const INF_X = ['脆弱な肉芽','ポケット','悪臭','治りが止まった'];
const RED = ['なし','< 0.5 cm','0.5〜2 cm','≧ 2 cm'];
const DOP = [['0','三相'],['1','二相'],['2','単相 鋭'],['3','単相 鈍'],['4','さざ波・無音'],['x','判読不能'],['n','未測定']];
const T_CALL = [['T1','急に広がる発赤・激痛・ガス'],['T2','急な蒼白・冷感・脈消失'],['T3','悪寒・意識・血圧低下']];
const T_E = [['T4','傷のない片側の発赤'],['T5','痛む網状皮斑'],['T6','ソーセージ趾・骨'],['T7','湿性壊疽の拡大'],['T8','止まりにくい出血'],
             ['T9','低温熱傷'],['T10','趾の急な暗紫色'],['T11','装具の後の発赤']];
const STEPS = ['写真','皮膚・傷','感染','血流','緊急'];
const REF_KIND = ['当日連絡','14日以内 精査','14日以内 診察','W3以上に悪化','気になる所見','主治医の判断'];
const OUTCOME = ['受診予定','外来で経過観察','入院','血行再建','切断','受診せず','その他'];

/* ---------- 架空のデータ ---------- */
function seed(){
  const h=(date,cat,by,vw)=>({date,cat,by,vw});
  return [
    {id:'FK-01-003',fac:'A',cat:'C',B:'B1',last:'2026-11-09',next:'2026-11-16',hub:'済',
      hist:[h('2026-10-05','B','D-A01',''),h('2026-10-26','C','D-A01','右 V1W2')],pend:null,obs:null,refs:[]},
    {id:'FK-01-007',fac:'A',cat:'A',B:'B0',last:'2026-10-19',next:'2026-11-16',hub:null,hist:[h('2026-10-05','A','D-A01','')],pend:null,obs:null,refs:[]},
    {id:'FK-01-012',fac:'A',cat:'B',B:'B3',last:'2026-11-02',next:'2026-11-16',hub:null,hist:[h('2026-10-05','B','D-A02','B3')],pend:null,obs:null,refs:[]},
    {id:'FK-02-001',fac:'B',cat:'D',B:'B2',last:'2026-11-14',next:'2026-11-16',hub:'待',
      hist:[h('2026-10-07','C','D-B01',''),h('2026-11-14','D','D-B01','左 V2W2')],pend:null,obs:demoObs(),
      refs:[{kind:'14日以内 診察',date:'2026-11-14',to:'福岡大学病院 形成外科',visit:'2026-11-19',outcome:'受診予定'}]},
    {id:'FK-02-004',fac:'B',cat:'B',B:'B1',last:'2026-10-26',next:'2026-11-09',hub:null,hist:[h('2026-10-07','B','D-B01','')],pend:null,obs:null,refs:[]},
    {id:'FK-02-009',fac:'B',cat:null,B:null,last:null,next:'2026-11-16',hub:null,hist:[],pend:null,obs:null,refs:[]}
  ];
}
function limb(){return {ok:false,w:[],inf:[],infx:[],red:0,dp:null,pt:null,abi:'',ph:[]};}
function newObs(p){return {pid:p.id,date:TODAY,mv:!p.cat||p.cat>='C',t:[],memo:'',R:limb(),L:limb()};}
function demoObs(){const o={pid:'FK-02-001',date:'2026-11-14',mv:true,t:[],memo:'',R:limb(),L:limb()};
  o.R.ok=true;o.R.dp='1';o.R.pt='1';o.L.w=['皮膚欠損'];o.L.inf=['発赤'];o.L.dp='2';o.L.pt='3';o.L.ph=[0,1,2];return o;}

const S = {pts:seed(), draft:null, step:0, foot:'R', filter:null, doc:null, hubv:null, ref:null};
const P = id => S.pts.find(p=>p.id===id);
const FAC = {A:'A透析クリニック',B:'B透析クリニック'};
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const md = d => d ? `${+d.slice(5,7)}/${+d.slice(8,10)}` : '―';
const cat = (c,big) => `<span class="cat ${c||'none'} ${big?'big':''}">${c||'?'}</span>`;
const days = (a,b) => Math.round((new Date(b)-new Date(a))/864e5);

/* ---------- アイコン ---------- */
const ICON = {
  cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#fff" stroke-width="3"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  alert:'<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2 1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z"/></svg>',
  phone:'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  table:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
function wave(v){
  const base='stroke="currentColor" stroke-width="2.4" fill="none" stroke-linejoin="round" stroke-linecap="round"';
  const p={
    '0':'M2 22H14L19 4L24 30L29 16L33 22H68',
    '1':'M2 22H14L19 4L24 30L28 22H68',
    '2':'M2 22H16L21 4L26 22H68',
    '3':'M2 22H10Q22 2 34 22H68',
    '4':'M2 22Q7 19 12 22T22 22T32 22T42 22T52 22T62 22L68 22'
  }[v];
  if(p) return `<svg viewBox="0 0 70 32"><line x1="2" y1="22" x2="68" y2="22" stroke="#d5dbe2" stroke-width="1"/><path d="${p}" ${base}/></svg>`;
  if(v==='x') return `<svg viewBox="0 0 70 32"><text x="35" y="25" text-anchor="middle" font-size="22" font-weight="700" fill="currentColor">?</text></svg>`;
  return `<svg viewBox="0 0 70 32"><line x1="6" y1="20" x2="64" y2="20" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 5"/></svg>`;
}
function footSvg(side){
  const g=`<path d="M22 30c8 0 12 9 11 22-1 14 2 30-4 42-5 10-17 9-20-1-3-9 0-20-1-32C7 45 10 30 22 30z" fill="currentColor" opacity=".85"/>
    <circle cx="13" cy="20" r="6" fill="currentColor"/><circle cx="23" cy="14" r="4" fill="currentColor"/><circle cx="30" cy="15" r="3.4" fill="currentColor"/><circle cx="35.5" cy="19" r="3" fill="currentColor"/><circle cx="39" cy="25" r="2.6" fill="currentColor"/>`;
  return `<svg viewBox="0 0 46 100"><g ${side==='L'?'transform="translate(46 0) scale(-1 1)"':''}>${g}</g></svg>`;
}
const freqBar = c => c&&c!=='E' ? `<span class="freq" title="${FREQ[c]}">${[1,2,3,4].map(i=>`<i class="${i<=FREQN[c]?'f':''}"></i>`).join('')}</span>` : '';

/* ---------- ナビ ---------- */
function nav(cur){
  const nd=S.pts.filter(p=>p.pend).length, nh=S.pts.filter(p=>p.hub==='待').length;
  const items=[['list','一覧','#1f6f8b',0],['input','入力','#1f6f8b',0],['doctor','判定','#7c3aed',nd],['hub','福大の確認','#c2410c',nh],['referral','相談・紹介','#0f766e',0]];
  document.getElementById('nav').innerHTML = items.map(([k,t,c,n])=>
    `<a href="#${k}" class="${cur===k?'on':''}"><span class="dot" style="background:${c}"></span>${t}${n?`<span class="badge">${n}</span>`:''}</a>`).join('')
    + `<a href="guide.html" title="説明">？</a>`;
}

/* ---------- 一覧 ---------- */
function vList(){
  const st = p => p.next<TODAY?'late':p.next===TODAY?'today':'';
  const cnt = {today:S.pts.filter(p=>p.next===TODAY).length, late:S.pts.filter(p=>p.next<TODAY).length,
    wait:S.pts.filter(p=>p.pend).length, hub:S.pts.filter(p=>p.hub==='待').length};
  const f=S.filter;
  const list=S.pts.filter(p=>!f||(f==='today'&&p.next===TODAY)||(f==='late'&&p.next<TODAY)||(f==='wait'&&p.pend)||(f==='hub'&&p.hub==='待'))
    .sort((a,b)=>(a.next||'').localeCompare(b.next||''));
  const tile=(k,n,t,cls)=>`<div class="tile ${cls} ${f===k?'on':''}" data-a="filter" data-v="${k}"><b>${n}</b><span>${t}</span></div>`;
  return `<div class="tiles">${tile('today',cnt.today,'今日の観察','today')}${tile('late',cnt.late,'予定日を過ぎた','late')}${tile('wait',cnt.wait,'医師の判定待ち','wait')}${tile('hub',cnt.hub,'福大の確認待ち','wait')}</div>
  <div class="pgrid">${list.map(p=>`<a class="pcard ${p.cat||''}" href="#patient/${p.id}">
      <div class="top"><span class="id">${p.id}</span>${cat(p.cat)}</div>
      <div class="sub">${FAC[p.fac]}</div>
      <div class="when">${freqBar(p.cat)}<span>次回 <b>${md(p.next)}</b></span></div>
      <div class="pills">${st(p)==='late'?'<span class="pill late">過ぎた</span>':''}${st(p)==='today'?'<span class="pill today">今日</span>':''}
        ${p.pend?'<span class="pill wait">判定待ち</span>':''}${p.hub==='待'?'<span class="pill wait">福大の確認待ち</span>':''}${!p.cat&&!p.pend?'<span class="pill wait">初回</span>':''}</div>
    </a>`).join('')}</div>`;
}

/* ---------- 患者 ---------- */
function chart(p){
  if(!p.hist.length) return '<p class="sub">まだ判定がありません</p>';
  const W=600,H=170,L=34,R=34,T=12,B=28, n=p.hist.length;
  const x=i=> n===1?(L+W-R)/2 : L+i*(W-L-R)/(n-1), y=c=> T+CATS.indexOf(c)*(H-T-B)/4;
  const grid=CATS.map(c=>`<line x1="${L}" x2="${W-R}" y1="${y(c)}" y2="${y(c)}" stroke="#eef1f4"/><text x="${L-10}" y="${y(c)+5}" text-anchor="end" font-size="13" font-weight="700" fill="var(--c${c})">${c}</text>`).join('');
  const pts=p.hist.map((h,i)=>`${x(i)},${y(h.cat)}`).join(' ');
  const dots=p.hist.map((h,i)=>`<circle cx="${x(i)}" cy="${y(h.cat)}" r="8" fill="var(--c${h.cat})"/><text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="12" fill="#64707d">${md(h.date)}</text>`).join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}">${grid}<polyline points="${pts}" fill="none" stroke="#9aa5b1" stroke-width="2.5"/>${dots}</svg></div>`;
}
function refTl(r){
  const s=[['相談',!!r.date],['受診',!!r.visit&&r.visit<=TODAY],['転帰',r.outcome&&r.outcome!=='受診予定']];
  return `<div class="tl">${s.map(([t,f],i)=>`${i?`<div class="ln ${f?'f':''}"></div>`:''}<div class="st ${f?'f':''}"><b>${i+1}</b>${t}</div>`).join('')}</div>
    <div class="sub">${md(r.date)} ${esc(r.kind)} → ${esc(r.to)}　受診 ${md(r.visit)}　${esc(r.outcome)}</div>`;
}
function vPatient(id){
  const p=P(id); if(!p) return vList();
  return `<h2>${p.id} ${cat(p.cat,true)} <span class="sub">${FAC[p.fac]}　${p.B||''}</span></h2>
  <div class="bar" style="margin:0 0 14px;justify-content:flex-start"><a class="btn" href="#input/${p.id}">${ICON.cam.replace('<svg','<svg width="20" height="20"')} 観察を入力</a><a class="btn ghost" href="#referral/${p.id}">相談・紹介</a></div>
  <div class="card"><div class="lbl" style="margin-top:0">区分の推移</div>${chart(p)}</div>
  <div class="card"><div class="lbl" style="margin-top:0">相談・紹介</div>${p.refs.length?p.refs.map(refTl).join('<hr style="border:none;border-top:1px solid var(--line)">'):'<p class="sub">なし</p>'}</div>`;
}

/* ---------- 入力 ---------- */
function feetSwitch(o){
  const has = s => { const x=o[s]; return x.ok||x.w.length||x.inf.length||x.dp||x.pt||x.ph.length; };
  return `<div class="feet">${[['R','右'],['L','左']].map(([s,t])=>`<button class="foot ${S.foot===s?'on':''}" data-a="foot" data-v="${s}">${has(s)?'<span class="mark"></span>':''}${footSvg(s)}${t}</button>`).join('')}</div>`;
}
function stepBody(o){
  const x=o[S.foot];
  if(S.step===0) return `<div class="photos">${['足背','足底','傷の拡大','＋'].map((t,i)=>
      `<div class="ph ${x.ph.includes(i)?'on':''}" data-a="ph" data-v="${i}">${ICON.cam}${t}</div>`).join('')}</div>`;
  if(S.step===1) return `<div class="chips" style="margin-bottom:6px"><button class="chip okc ${x.ok?'on':''}" data-a="ok">✓ 異常なし</button></div>`+
    W_GROUPS.map(([g,lab,col,items])=>`<div class="grp"><div class="lab"><i style="background:${col}"></i>${lab}</div><div class="chips">${items.map(t=>
      `<button class="chip ${g} ${x.w.includes(t)?'on':''}" data-a="w" data-v="${t}">${t}</button>`).join('')}</div></div>`).join('');
  if(S.step===2) return `<div class="meter" style="margin-bottom:12px">${INF.map((t,i)=>`<i class="${i<x.inf.length?'f':''}"></i>`).join('')}<b>${x.inf.length}/5</b></div>
    <div class="chips">${INF.map(t=>`<button class="chip red ${x.inf.includes(t)?'on':''}" data-a="inf" data-v="${t}">${t}</button>`).join('')}</div>
    <div class="lbl">発赤の範囲（傷のふちから）</div><div class="seg">${RED.map((t,i)=>`<button class="${x.red===i?'on':''}" data-a="red" data-v="${i}">${t}</button>`).join('')}</div>
    <div class="lbl">そのほか</div><div class="chips">${INF_X.map(t=>`<button class="chip ${x.infx.includes(t)?'on':''}" data-a="infx" data-v="${t}">${t}</button>`).join('')}</div>`;
  if(S.step===3){
    const row=(k,t)=>`<div class="art">${t}<span class="sub">触知</span><span class="seg sm">${['＋','－','？'].map(m=>`<button class="${x[k+'Pal']===m?'on':''}" data-a="pal" data-k="${k}Pal" data-v="${m}">${m}</button>`).join('')}</span></div><div class="dop">${DOP.map(([v,l])=>`<button class="wv ${x[k]===v?'on':''}" data-a="dop" data-k="${k}" data-v="${v}">${wave(v)}<b>${v==='x'||v==='n'?'':v}</b>${l}</button>`).join('')}</div>`;
    return `<div style="display:flex;flex-wrap:wrap;gap:10px 24px;align-items:center"><div class="switch ${o.mv?'on':''}" data-a="mv"><i></i>今日は測る</div><span class="${o.mv?'':'off'}">透析開始から <input type="number" data-f="vmin" value="${esc(o.vmin||'')}" style="width:76px"> 分</span></div>
    <div class="${o.mv?'':'off'}">${row('dp','足背動脈')}${row('pt','後脛骨動脈')}
    <div class="row2" style="margin-top:12px"><div><div class="lbl">波形の画像</div><div class="ph ${x.ph.includes(9)?'on':''}" data-a="ph" data-v="9" style="max-width:160px">${ICON.cam}</div></div>
    <div><div class="lbl">ABI</div><input type="number" step="0.01" data-f="abi" value="${esc(x.abi)}" style="width:110px" placeholder="0.00"></div></div></div>`;
  }
  return `<div class="sos"><h3>${ICON.alert}すぐ救急要請 <span class="call" style="margin-left:auto">${ICON.phone} 119</span></h3><div class="chips">${T_CALL.map(([k,t])=>
      `<button class="chip red ${o.t.includes(k)?'on':''}" data-a="t" data-v="${k}"><b>${k}</b> ${t}</button>`).join('')}</div>
</div>
    <div class="lbl">当日中に連絡</div><div class="chips">${T_E.map(([k,t])=>
      `<button class="chip ora ${o.t.includes(k)?'on':''}" data-a="t" data-v="${k}"><b>${k}</b> ${t}</button>`).join('')}</div>
    <div class="lbl">メモ</div><textarea data-f="memo" placeholder="気になること">${esc(o.memo)}</textarea>`;
}
function vInput(id){
  const p=P(id)||P(S.draft&&S.draft.pid)||S.pts[0];
  if(!S.draft||S.draft.pid!==p.id){S.draft=newObs(p);S.step=0;S.foot='R';}
  const o=S.draft, last=S.step===STEPS.length-1, perFoot=S.step<4;
  return `<h2><select data-a="pick">${S.pts.map(x=>`<option ${x.id===p.id?'selected':''}>${x.id}</option>`).join('')}</select>${cat(p.cat)}<span class="sub">${md(o.date)}</span></h2>
  <div class="stepper">${STEPS.map((t,i)=>`<button class="${i===S.step?'on':i<S.step?'done':''}" data-a="step" data-v="${i}"><i></i>${t}</button>`).join('')}</div>
  <div class="card">${perFoot?feetSwitch(o):''}${stepBody(o)}</div>
  <div class="bar"><button class="btn ghost" data-a="prev" ${S.step?'':'disabled'}>戻る</button>
    ${last?`<button class="btn" data-a="save">記録する</button>`:`<button class="btn" data-a="next">次へ ${ICON.arrow}</button>`}</div>`;
}
function obsView(o){
  const f=s=>{const x=o[s];
    return `<div class="sumfoot"><h4><span style="width:20px;display:inline-block">${footSvg(s).replace('<svg','<svg width="18" height="36"')}</span>${s==='R'?'右':'左'}</h4>
      <div class="mini">${x.ok?'<span>異常なし</span>':x.w.map(t=>`<span class="${W_GROUP_OF[t]}">${t}</span>`).join('')||'<span>―</span>'}</div>
      <div class="kv"><span>感染</span><div class="meter">${INF.map((t,i)=>`<i class="${i<x.inf.length?'f':''}" style="width:12px;height:12px"></i>`).join('')}</div>
        <span>足背</span><span class="wsm">${o.mv&&x.dp?wave(x.dp)+(DOP.find(d=>d[0]===x.dp)[1]):'―'}</span>
        <span>後脛骨</span><span class="wsm">${o.mv&&x.pt?wave(x.pt)+(DOP.find(d=>d[0]===x.pt)[1]):'―'}</span>
        <span>写真</span><span>${x.ph.length} 枚</span></div></div>`;};
  return `<div class="sum">${f('R')}${f('L')}</div>${o.t.length?`<p><span class="pill late">${o.t.join(' ')}</span></p>`:''}${o.memo?`<p class="sub">${esc(o.memo)}</p>`:''}`;
}
function vDone(id){
  const p=P(id); if(!p||!p.pend) return vList();
  return `<div class="card done"><div class="ck">${ICON.check}</div><h2 style="justify-content:center">記録しました</h2>
    <div class="flow"><span class="past">入力</span>${ICON.arrow}<span class="now">医師の判定</span>${ICON.arrow}<span>区分・次回の予定</span></div>
    <div class="bar" style="justify-content:center"><a class="btn ghost" href="#list">一覧へ</a><a class="btn" href="#doctor/${p.id}">判定へ（見本の流れ）</a></div></div>
    <div class="card">${obsView(p.pend)}</div>`;
}

/* ---------- 判定（施設の医師） ---------- */
function vDoctor(id){
  const q=S.pts.filter(p=>p.pend);
  if(!id||!P(id)||!P(id).pend){
    return `<h2>判定待ち</h2>${q.length?`<div class="pgrid">${q.map(p=>`<a class="pcard ${p.cat||''}" href="#doctor/${p.id}"><div class="top"><span class="id">${p.id}</span>${cat(p.cat)}</div><div class="sub">${FAC[p.fac]}　${md(p.pend.date)}</div></a>`).join('')}</div>`:'<div class="card sub">なし</div>'}`;
  }
  const p=P(id);
  if(!S.doc||S.doc.id!==id) S.doc={id,V:{},W:{},B:p.B,inf:null,cat:null,next:'',by:'D-'+p.fac+'01',dev:''};
  const d=S.doc, pick=(k,s,arr)=>`<div class="pick">${arr.map(v=>`<button class="${(s?d[k][s]:d[k])===v?'on':''}" data-a="dpick" data-k="${k}" data-s="${s||''}" data-v="${v}">${v}</button>`).join('')}</div>`;
  const toHub = Object.values(d.W).some(w=>w&&!['W0','W1'].includes(w)) || d.inf==='あり' || (p.cat&&d.cat&&d.cat<p.cat&&p.hub==='済');
  return `<h2>${p.id} ${cat(p.cat)} <button class="iconbtn" data-a="modal">${ICON.table} 判定基準表</button></h2>
  <div class="card">${obsView(p.pend)}</div>
  <div class="card">
    <table class="dtab">${[['R','右'],['L','左']].map(([s,t])=>`<tr><td>${t}</td><td>${pick('V',s,['V0','V1','V2','Vx'])}</td></tr><tr><td></td><td>${pick('W',s,['W0','W1','W2','W3d','W3w','W4'])}</td></tr>`).join('<tr><td colspan=2 style="height:8px"></td></tr>')}</table>
    <div class="row2"><div><div class="lbl">背景リスク</div>${pick('B','',['B0','B1','B2','B3'])}</div><div><div class="lbl">感染</div>${pick('inf','',['なし','あり'])}</div></div>
    <div class="lbl">区分</div><div class="catpick">${CATS.map(c=>`<button class="${c} ${d.cat===c?'on':''}" data-a="dcat" data-v="${c}">${c}</button>`).join('')}</div>
    <div class="row2"><div><div class="lbl">次回</div><input type="date" data-f="next" value="${d.next}"></div><div><div class="lbl">医師</div><input type="text" data-f="by" value="${esc(d.by)}" style="width:130px"></div></div>
    <details style="margin-top:12px"><summary>手順から外れる</summary><textarea data-f="dev" placeholder="理由">${esc(d.dev)}</textarea></details>
    <div class="bar"><span>${toHub?`<span class="tohub">${ICON.arrow} 福大の確認へ</span>`:''}</span><button class="btn" data-a="dsave" ${d.cat?'':'disabled'}>保存</button></div>
  </div>`;
}
function matrixModal(){
  const M=[['V0','A','A','C','C','E','E'],['V1','A','B','C','C','E','E'],['V2','B','B','D','D','E','E'],['Vx','A','B','C','C','E','E']];
  return `<div class="box"><div style="display:flex;justify-content:space-between;align-items:center"><b>判定基準表（抜粋）</b><button class="iconbtn" data-a="close">閉じる</button></div>
    <table class="mx"><tr><th></th>${['W0','W1','W2','W3d','W3w','W4'].map(w=>`<th>${w}</th>`).join('')}</tr>${M.map(r=>`<tr><th>${r[0]}</th>${r.slice(1).map(c=>`<td>${cat(c)}</td>`).join('')}</tr>`).join('')}</table>
    <table class="mx" style="margin-top:10px">${CATS.map(c=>`<tr><td style="width:40px">${cat(c)}</td><td style="text-align:left">${FREQ[c]}</td></tr>`).join('')}</table>
    <p class="sub"><a href="guide.html#rules">規則の全文</a></p></div>`;
}

/* ---------- 福大の確認 ---------- */
function vHub(id){
  const q=S.pts.filter(p=>p.hub==='待');
  if(!id||!P(id)||P(id).hub!=='待'){
    return `<h2>福大の確認待ち</h2>${q.length?`<div class="pgrid">${q.map(p=>{const h=p.hist[p.hist.length-1];return `<a class="pcard ${p.cat||''}" href="#hub/${p.id}"><div class="top"><span class="id">${p.id}</span>${cat(p.cat)}</div><div class="sub">${FAC[p.fac]}　${md(h.date)}　${esc(h.vw)}</div></a>`;}).join('')}</div>`:'<div class="card sub">なし</div>'}`;
  }
  const p=P(id), h=p.hist[p.hist.length-1];
  if(!S.hubv||S.hubv.id!==id) S.hubv={id,r:null,cat:null,c:''};
  const v=S.hubv;
  return `<h2>${p.id} <span class="sub">${FAC[p.fac]}</span></h2>
  <div class="card"><div class="photos big">${['足背','足底','傷の拡大','波形'].map(t=>`<div class="ph on">${ICON.cam}${t}</div>`).join('')}</div></div>
  ${p.obs?`<div class="card">${obsView(p.obs)}</div>`:''}
  <div class="card"><div class="lbl" style="margin-top:0">施設の判定</div><div style="display:flex;align-items:center;gap:10px">${cat(p.cat,true)}<span class="sub">${esc(h.vw)}　${md(h.date)}　${esc(h.by)}</span></div>
    <div class="lbl">確認</div>
    <div class="bigchoice"><button class="y ${v.r==='y'?'on':''}" data-a="hr" data-v="y"><span style="font-size:30px">✓</span>一致</button><button class="n ${v.r==='n'?'on':''}" data-a="hr" data-v="n"><span style="font-size:30px">≠</span>異なる</button></div>
    ${v.r==='n'?`<div class="lbl">協議して確定した区分</div><div class="catpick">${CATS.map(c=>`<button class="${c} ${v.cat===c?'on':''}" data-a="hcat" data-v="${c}">${c}</button>`).join('')}</div>`:''}
    <div class="lbl">施設へのコメント</div><textarea data-f="hc">${esc(v.c)}</textarea>
    <div class="bar" style="justify-content:flex-end"><button class="btn" data-a="hsave" ${v.r&&(v.r==='y'||v.cat)?'':'disabled'}>保存</button></div></div>`;
}

/* ---------- 相談・紹介 ---------- */
function vReferral(id){
  const p=P(id)||S.pts[0];
  if(!S.ref||S.ref.pid!==p.id) S.ref={pid:p.id,kind:null,date:TODAY,to:'福岡大学病院 形成外科',visit:'',outcome:'受診予定'};
  const r=S.ref, all=S.pts.flatMap(x=>x.refs.map(y=>({...y,id:x.id})));
  return `<h2><select data-a="rpick">${S.pts.map(x=>`<option ${x.id===p.id?'selected':''}>${x.id}</option>`).join('')}</select>${cat(p.cat)}</h2>
  <div class="card">
    <div class="lbl" style="margin-top:0">当てはまった目安</div><div class="chips">${REF_KIND.map(k=>`<button class="chip ${r.kind===k?'on':''}" data-a="rk" data-v="${k}">${k}</button>`).join('')}</div>
    <div class="row2"><div><div class="lbl">相談した日</div><input type="date" data-f="rdate" value="${r.date}"></div><div><div class="lbl">受診日</div><input type="date" data-f="rvisit" value="${r.visit}"></div></div>
    <div class="lbl">相談先・紹介先</div><input type="text" data-f="rto" value="${esc(r.to)}" style="width:100%">
    <div class="lbl">転帰</div><div class="chips">${OUTCOME.map(k=>`<button class="chip ${r.outcome===k?'on':''}" data-a="ro" data-v="${k}">${k}</button>`).join('')}</div>
    <div class="bar" style="justify-content:flex-end"><button class="btn" data-a="rsave" ${r.kind?'':'disabled'}>記録する</button></div>
  </div>
  ${all.map(y=>`<div class="card"><b>${y.id}</b>${refTl(y)}</div>`).join('')}`;
}

/* ---------- 描画と操作 ---------- */
function route(){
  const [v,arg]=(location.hash.slice(1)||'list').split('/');
  const V={list:vList,patient:vPatient,input:vInput,done:vDone,doctor:vDoctor,hub:vHub,referral:vReferral};
  nav(v==='patient'||v==='done'?'list':v);
  document.getElementById('app').innerHTML=(V[v]||vList)(arg);
}
const rerender=()=>{const y=scrollY;route();scrollTo(0,y);};
const toggle=(arr,v)=>{const i=arr.indexOf(v); i<0?arr.push(v):arr.splice(i,1);};

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]'); if(!el) return;
  const a=el.dataset.a, v=el.dataset.v, o=S.draft, x=o&&o[S.foot];
  switch(a){
    case 'filter': S.filter=S.filter===v?null:v; break;
    case 'step': S.step=+v; break;
    case 'next': S.step=Math.min(S.step+1,STEPS.length-1); scrollTo(0,0); break;
    case 'prev': S.step=Math.max(S.step-1,0); break;
    case 'foot': S.foot=v; break;
    case 'ph': toggle(x.ph,+v); break;
    case 'ok': x.ok=!x.ok; if(x.ok) x.w=[]; break;
    case 'w': toggle(x.w,v); if(x.w.length) x.ok=false; break;
    case 'inf': toggle(x.inf,v); break;
    case 'infx': toggle(x.infx,v); break;
    case 'red': x.red=+v; break;
    case 'dop': x[el.dataset.k]=x[el.dataset.k]===v?null:v; break;
    case 'mv': o.mv=!o.mv; break;
    case 'pal': x[el.dataset.k]=x[el.dataset.k]===v?null:v; break;
    case 't': toggle(o.t,v); break;
    case 'save': { const p=P(o.pid); p.pend=o; p.last=o.date; S.draft=null; location.hash='#done/'+p.id; return; }
    case 'dpick': { const d=S.doc,k=el.dataset.k,s=el.dataset.s; if(s) d[k][s]=d[k][s]===v?null:v; else d[k]=d[k]===v?null:v; break; }
    case 'dcat': S.doc.cat=v; break;
    case 'dsave': { const d=S.doc,p=P(d.id);
      const toHub=Object.values(d.W).some(w=>w&&!['W0','W1'].includes(w))||d.inf==='あり'||(p.cat&&d.cat<p.cat&&p.hub==='済');
      p.hist.push({date:p.pend.date,cat:d.cat,by:d.by,vw:`右 ${d.V.R||''}${d.W.R||''}／左 ${d.V.L||''}${d.W.L||''}`});
      p.cat=d.cat; p.B=d.B||p.B; p.next=d.next||p.next; p.obs=p.pend; p.pend=null; if(toHub) p.hub='待'; S.doc=null;
      location.hash=toHub?'#hub':'#patient/'+p.id; return; }
    case 'modal': { const m=document.getElementById('modal'); m.innerHTML=matrixModal(); m.hidden=false; return; }
    case 'close': document.getElementById('modal').hidden=true; return;
    case 'hr': S.hubv.r=v; break;
    case 'hcat': S.hubv.cat=v; break;
    case 'hsave': { const h=S.hubv,p=P(h.id);
      if(h.r==='n'){p.cat=h.cat;p.hist.push({date:TODAY,cat:h.cat,by:'福大',vw:'協議して確定'});}
      p.hub='済'; S.hubv=null; location.hash='#patient/'+p.id; return; }
    case 'rk': S.ref.kind=v; break;
    case 'ro': S.ref.outcome=v; break;
    case 'rsave': { const r=S.ref; P(r.pid).refs.push({kind:r.kind,date:r.date,to:r.to,visit:r.visit,outcome:r.outcome}); S.ref=null; break; }
    default: return;
  }
  rerender();
});
document.addEventListener('change',e=>{
  const a=e.target.dataset.a;
  if(a==='pick'){ location.hash='#input/'+e.target.value; }
  if(a==='rpick'){ location.hash='#referral/'+e.target.value; }
});
document.addEventListener('input',e=>{
  const f=e.target.dataset.f; if(!f) return; const val=e.target.value;
  if(f==='abi') S.draft[S.foot].abi=val;
  if(f==='memo') S.draft.memo=val;
  if(f==='vmin') S.draft.vmin=val;
  if(['next','by','dev'].includes(f)) S.doc[f]=val;
  if(f==='hc') S.hubv.c=val;
  if(f==='rdate') S.ref.date=val; if(f==='rvisit') S.ref.visit=val; if(f==='rto') S.ref.to=val;
});
document.getElementById('modal').addEventListener('click',e=>{ if(e.target.id==='modal') e.target.hidden=true; });
window.addEventListener('hashchange',()=>{route();scrollTo(0,0);});
route();
