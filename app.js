'use strict';
const $ = id => document.getElementById(id);
const labels = {fanuc:'Аварии FANUC', siemens:'Аварии SINUMERIK', gcodes:'G-команды SINUMERIK'};
const symbols = {fanuc:'F', siemens:'S', gcodes:'G'};
const fanucPrefixes = {PS:'Программа и работа',BG:'Фоновое редактирование',SR:'Связь',SV:'Сервопривод',OT:'Выход за пределы',IO:'Файлы и ввод-вывод',SW:'Запись параметров',PW:'Требуется выключение питания',SP:'Шпиндель',OH:'Перегрев',DS:'Прочие аварии',IE:'Предотвращение сбоев'};
const catalogs = {};
let limit = 30;
const pages={siemens:['SINUMERIK','Ошибки стоек Siemens. Введи номер с экрана станка.','Например, 12080'],fanuc:['FANUC','Ошибки ЧПУ FANUC. Введи префикс и номер, например PS0010 или SV0401.','Например, PS0010'],drives:['Приводы','Сначала определи тип блока по шильдику. Коды на индикаторе привода зависят от его серии.','Номер блока A06B-…'],gcodes:['G-команды','Команды программирования SINUMERIK. Введи G-код или слово.','Например, G17']};
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function normal(text) { return text.trim().toUpperCase().replaceAll('Ё','Е'); }
function codeKey(text) { return normal(text).replace(/[\s-]+/g,'').replace(/^([A-Z]*)0+(?=\d)/,'$1'); }
function populate(select, values, label) {
  select.replaceChildren(new Option(label,''));
  for (const val of [...new Set(values)].sort()) select.add(new Option(val,val));
}
function updateFilters() {
  const key = $('section').value;
  const rows = catalogs[key] || [];
  populate($('series'),rows.map(r=>r.series),'Все стойки');
  $('prefixBox').hidden = key !== 'fanuc';
  populate($('prefix'),key === 'fanuc' ? catalogs.fanuc.flatMap(r=>r.keys.map(k=>k.match(/^[A-Z]+/)?.[0])).filter(Boolean) : [],'Все');
  document.body.dataset.section=key;
  $('pageTitle').textContent=pages[key][0]; $('pageIntro').textContent=pages[key][1];
  $('query').placeholder=pages[key][2]; $('queryLabel').textContent=key==='gcodes'?'G-код или текст':key==='drives'?'Модель привода':'Номер аварии или текст';
  document.querySelectorAll('.tabs button').forEach(button=>{button.setAttribute('aria-current',button.dataset.section===key?'page':'false');});
  $('advanced').hidden=key==='drives'; $('search').hidden=key==='drives';
  limit=30; render();
}
function showCatalogs() {
  $('listTitle').textContent='Каталоги';
  $('count').textContent='';
  for (const [key,label] of Object.entries(labels)) {
    const button=element('button',undefined,'catalog');
    const name=element('span');
    const n=new Set(catalogs[key].map(r=>r.code)).size;
    name.append(element('strong',label),element('small',n.toLocaleString('ru')+' кодов','meta'));
    button.append(element('span',symbols[key],'symbol'),name,element('span','›','chevron'));
    button.onclick=()=>{ $('section').value=key; updateFilters(); };
    $('results').append(button);
  }
}
function showCard(group, requestedPrefix) {
  const row=group[0], card=element('article',undefined,'card');
  const selectedCode=requestedPrefix && row.category==='fanuc'
    ? [row.code,...(row.aliases||[])].find(code=>code.startsWith(requestedPrefix)) : null;
  const code=selectedCode || row.code;
  const kind=selectedCode ? fanucPrefixes[requestedPrefix] : labels[row.category];
  card.append(element('h3',code),element('div',kind,'meta'));
  if(row.title)card.append(element('p',row.title));
  if(row.message_en) {
    const original=element('details',undefined,'original-message');
    original.append(element('summary','Оригинал из руководства'),element('p',row.message_en));
    card.append(original);
  }
  if(!row.title && !row.message_en)card.append(element('p','Для этого кода в каталоге пока нет расшифровки. Сверь сообщение на стойке с руководством.'));
  const refs=element('div',undefined,'refs');
  for(const item of group) {
    const a=element('a',item.series+(item.page ? (item.source.includes('studylib.net') ? ' · стр. руководства ' : ' · стр. PDF ')+item.page : ' · руководство')+' ↗');
    const link=new URL(item.source);
    if(link.protocol!=='https:' && link.protocol!=='http:')continue;
    if(item.page && /\.pdf$/i.test(link.pathname))link.hash='page='+item.page;
    a.href=link.href; a.target='_blank'; a.rel='noopener noreferrer'; refs.append(a);
  }
  card.append(refs); $('results').append(card);
}
function render() {
  if(!Object.keys(labels).every(k=>catalogs[k])) return;
  const q=normal($('query').value), k=codeKey(q);
  const section=$('section').value, series=$('series').value, prefix=$('prefix').value;
  const requestedPrefix=prefix || q.match(/^[A-Z]+/)?.[0] || '';
  $('results').replaceChildren(); $('more').hidden=true;
  if(section==='drives') {
    $('listTitle').textContent='Типы блоков'; $('count').textContent='';
    for(const [code,name,detail] of [['PSM','Блок питания','Питает приводную систему. Код на его индикаторе сверяют с руководством серии.'],['SVM','Привод осей','Управляет серводвигателями осей. Уточни серию и номер A06B-…'],['SPM','Привод шпинделя','Управляет шпинделем. Таблица кодов отличается от SVM и PSM.']]) {
      const card=element('article',undefined,'card');card.append(element('h3',code),element('p',name),element('p',detail,'meta'));$('results').append(card);
    }
    $('results').append(element('p','Для точной расшифровки кода привода нужны тип блока, серия и номер A06B-… с шильдика.','meta'));return;
  }
  if(!q) { $('listTitle').textContent='Поиск'; $('count').textContent=''; $('results').append(element('p','Введи код с экрана станка. Результаты появятся здесь.','empty-state')); return; }
  const groups = new Map();
  const numeric=/^\d+$/.test(k);
  const isCode=/^[A-Z]*\d+(?:\.\d+)?$/.test(k);
  for(const [category,rows] of Object.entries(catalogs)) {
    if(section && section!==category) continue;
    for(const row of rows) {
      if(series && series!==row.series) continue;
      const keys=prefix ? row.keys.filter(s=>(s.match(/^[A-Z]+/)||[''])[0]===prefix) : row.keys;
      if(!keys.length) continue;
      const exact=keys.some(s=>s===k || (numeric && s.replace(/^[A-Z]+/,'')===k));
      if(q && !exact && (isCode || (!keys.some(s=>s.startsWith(k)) && !row.words.includes(q)))) continue;
      const groupKey=[category,row.code,row.title,row.message_en].join('|');
      if(!groups.has(groupKey)) groups.set(groupKey,[]);
      groups.get(groupKey).push(row);
    }
  }
  $('listTitle').textContent=q?'Результаты поиска':(labels[section]||'Результаты');
  $('count').textContent=groups.size.toLocaleString('ru');
  if(!groups.size) $('results').textContent='Совпадений в загруженных каталогах нет. Проверь код или выбери все стойки.';
  for(const group of [...groups.values()].slice(0,limit)) showCard(group,requestedPrefix);
  $('more').hidden=limit>=groups.size;
}
async function load() {
  try {
    await Promise.all(Object.keys(labels).map(async category=>{
      const response=await fetch(category+'.json');
      if(!response.ok)throw Error(response.status);
      catalogs[category]=(await response.json()).map(row=>({...row,category,
        keys:[row.code,...(row.aliases||[])].map(codeKey),words:normal([row.title,row.message_en].filter(Boolean).join(' '))}));
    }));
    updateFilters();
  } catch { $('results').textContent='Не удалось загрузить каталог. Открой страницу снова при доступной сети.'; }
  $('results').setAttribute('aria-busy','false');
}
$('query').oninput=()=>{limit=30;render();};
$('search').onsubmit=e=>{e.preventDefault();$('query').blur();render();};
$('section').onchange=updateFilters;
document.querySelectorAll('.tabs button').forEach(button=>button.onclick=()=>{$('section').value=button.dataset.section;$('query').value='';updateFilters();});
$('series').onchange=$('prefix').onchange=()=>{limit=30;render();};
$('more').onclick=()=>{limit+=30;render();};
let installPrompt;
window.addEventListener('beforeinstallprompt', e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});
$('install').onclick=async()=>{if(installPrompt)await installPrompt.prompt();installPrompt=null;$('install').hidden=true;};
if ('serviceWorker' in navigator) {
  $('network').textContent='Сохранение на телефон…';
  navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready)
    .then(()=>{$('network').textContent='● Доступен без интернета';})
    .catch(()=>{$('network').textContent='Офлайн-копия пока недоступна';});
}
load();
