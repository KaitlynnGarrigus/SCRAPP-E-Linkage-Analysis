const $=id=>document.getElementById(id);
(()=>{
const CFG=window.FIREBASE_CONFIG||null,local=!CFG;
const FILE={linkage:'arm.html',eyes:'eyes.html',motion:'motion.html'},LABEL={linkage:'Linkage',eyes:'Eyes',motion:'Motion project'},BASE={linkage:'Linkage ',eyes:'Eyes version ',motion:'Motion project '};
const cur=document.body.dataset.page;
const LINKS=[['index.html','Home','home'],['arm.html','Arm &amp; neck linkages','linkage'],['eyes.html','Eye reactions','eyes'],['motion.html','Motion &amp; code','motion']];
$('nav').innerHTML=`<div class="bar"><a class="brand" href="index.html"><span class="logo"></span>Robot Design Lab</a><nav>${LINKS.map(l=>`<a href="${l[0]}"${l[2]==cur?' class="on"':''}>${l[1]}</a>`).join('')}</nav><div class="acct"><button id="ab" class="ghost">Sign in</button><div id="ap" class="pop" hidden></div></div></div>`;
$('ab').onclick=()=>{$('ap').hidden=!$('ap').hidden};
document.addEventListener('click',e=>{if(!e.target.closest('.acct'))$('ap').hidden=true},true);
let user=null,fb=null,db=null,items=[],lastP='',ready=false;
const PG=()=>window.PAGE;
const e2=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const msg=t=>{const m=$('pm');if(m)m.textContent=t};
const SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-';
const load=u=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=u;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
const LK=()=>'designs:'+user.id,dcol=()=>db.collection('users').doc(user.id).collection('designs');
async function dbList(){if(local)return JSON.parse(localStorage.getItem(LK())||'[]');return(await dcol().orderBy('updated','desc').get()).docs.map(d=>({id:d.id,...d.data()}))}
async function dbPut(it){if(local){const a=(await dbList()).filter(x=>x.id!=it.id);a.unshift(it);localStorage.setItem(LK(),JSON.stringify(a))}else await dcol().doc(it.id).set(it)}
async function dbDel(id){if(local)localStorage.setItem(LK(),JSON.stringify((await dbList()).filter(x=>x.id!=id)));else await dcol().doc(id).delete()}
function sug(){const ty=PG().type;let n=1;while(items.some(i=>i.type==ty&&i.name==BASE[ty]+n))n++;return BASE[ty]+n}
function ui(){const a=$('ap');$('ab').textContent=user?user.name:'Sign in';
 if(!user){a.innerHTML=(local?'<label>Profile name<input id="pn"></label><button id="si">Continue</button><p class="n">Local mode: designs save on this device only, with no password.</p>':'<label>Email<input id="em" type="email"></label><label>Password<input id="pw" type="password"></label><div class="row"><button id="si">Sign in</button><button id="su" class="ghost">Create account</button><button id="gg" class="ghost">Google</button></div>')+'<div id="pm" class="n"></div>';
  $('si').onclick=signIn;if($('su')){$('su').onclick=signUp;$('gg').onclick=google}return}
 a.innerHTML=`<div class="row between"><b>${e2(user.name)}</b><button id="so" class="ghost sm">Sign out</button></div>`+(PG()?`<h4>Save this design</h4><label>Name<input id="nm"></label><button id="sn">Save design</button>`:'')+'<div id="pm" class="n" style="margin-top:8px"></div><h4>Saved designs</h4><div id="dl"></div>';
 $('so').onclick=signOut;if(PG()){$('nm').value=sug();$('sn').onclick=save}}
function signIn(){if(local){const n=$('pn').value.trim();if(!n)return;localStorage.setItem('lastUser',n);setUser({id:n.toLowerCase(),name:n})}else fb.signInWithEmailAndPassword($('em').value,$('pw').value).catch(e=>msg(e.message))}
const signUp=()=>fb.createUserWithEmailAndPassword($('em').value,$('pw').value).catch(e=>msg(e.message));
const google=()=>fb.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e=>msg(e.message));
function signOut(){if(local){localStorage.removeItem('lastUser');setUser(null)}else fb.signOut()}
function renderList(){const h=items.length?'<table><tr><th>Name</th><th>Type</th><th>Saved</th><th></th></tr>'+items.map(i=>`<tr><td>${e2(i.name)}</td><td>${LABEL[i.type]||i.type}</td><td>${new Date(i.updated).toLocaleDateString()}</td><td><button class="sm" data-a="o" data-id="${i.id}">Open</button> <button class="sm ghost" data-a="d" data-id="${i.id}">Delete</button></td></tr>`).join('')+'</table>':'<p class="n">No saved designs yet.</p>';
 ['dl','dl2'].forEach(k=>{if($(k))$(k).innerHTML=user?h:'<p class="n">Sign in (top right) to see your saved designs.</p>'})}
function openItem(it){if(PG()&&PG().type==it.type){PG().apply(JSON.parse(it.data));lastP=JSON.stringify(PG().capture());msg(`Opened “${it.name}”`);$('ap').hidden=true}else location.href=FILE[it.type]+'?open='+it.id}
async function refresh(first){const all=await dbList();items=all.filter(i=>i.type!='progress');
 if(first&&PG()){const o=new URLSearchParams(location.search).get('open'),it=o&&items.find(i=>i.id==o),p=all.find(i=>i.id=='_progress_'+PG().type);
  try{if(it){openItem(it);history.replaceState(null,'',location.pathname)}else if(p){PG().apply(JSON.parse(p.data));lastP=p.data;msg('Restored your saved progress')}}catch(e){}}
 renderList();if($('nm'))$('nm').value=sug()}
async function setUser(u){user=u;ready=false;lastP='';items=[];ui();renderList();if(!u)return;
 try{await refresh(true)}catch(e){msg('Could not load profile: '+e.message)}ready=true}
async function save(){const ty=PG().type,name=$('nm').value.trim()||sug(),ex=items.find(i=>i.type==ty&&i.name==name);
 try{await dbPut({id:ex?ex.id:Date.now().toString(36),name,type:ty,data:JSON.stringify(PG().capture()),updated:Date.now()});await refresh();msg(`Saved “${name}”${ex?' (replaced the earlier version)':''}`)}catch(e){msg('Save failed: '+e.message)}}
document.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b||!b.closest('#dl,#dl2'))return;const it=items.find(i=>i.id==b.dataset.id);if(!it)return;
 if(b.dataset.a=='o')openItem(it);if(b.dataset.a=='d'&&confirm(`Delete “${it.name}”?`)){await dbDel(it.id);await refresh()}});
setInterval(async()=>{if(!user||!ready||!PG())return;try{const s=JSON.stringify(PG().capture());if(s==lastP)return;lastP=s;await dbPut({id:'_progress_'+PG().type,name:'progress',type:'progress',data:s,updated:Date.now()})}catch(e){}},5000);
ui();renderList();
addEventListener('load',async()=>{
 if(!local){try{for(const m of['app','auth','firestore'])await load(SDK+m+'-compat.js');firebase.initializeApp(CFG);fb=firebase.auth();db=firebase.firestore();fb.onAuthStateChanged(u=>setUser(u?{id:u.uid,name:u.displayName||u.email}:null))}catch(e){msg('Could not load Firebase: '+e.message)}}
 else{const n=localStorage.getItem('lastUser');if(n)setUser({id:n.toLowerCase(),name:n})}});
})();
