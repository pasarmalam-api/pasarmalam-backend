(function(){
  "use strict";
  if(window.PMNotify)return;
  const DEFAULT_API="https://pasarmalam-backend.onrender.com";
  const LANG_KEY="pasarmalam-lang";
  const copy={
    ms:{
      enable:"Hidupkan Notifikasi",
      readyTitle:"Notifikasi aktif",
      readyBody:"Anda akan nampak alert untuk pesanan, chat, pulangan dan promosi.",
      newTitle:"Notifikasi baharu",
      landingTitle:"PasarMalam live sekarang",
      landingBody:"Pembeli dan penjual boleh terima alert segera untuk pesanan, chat dan promosi.",
      close:"Tutup"
    },
    en:{
      enable:"Enable Notifications",
      readyTitle:"Notifications enabled",
      readyBody:"You will see alerts for orders, chats, returns and promos.",
      newTitle:"New notification",
      landingTitle:"PasarMalam is live",
      landingBody:"Buyers and sellers can get fast alerts for orders, chats and promos.",
      close:"Close"
    },
    zh:{
      enable:"\u5f00\u542f\u901a\u77e5",
      readyTitle:"\u901a\u77e5\u5df2\u5f00\u542f",
      readyBody:"\u60a8\u5c06\u6536\u5230\u8ba2\u5355\u3001\u804a\u5929\u3001\u9000\u8d27\u548c\u4fc3\u9500\u63d0\u9192\u3002",
      newTitle:"\u65b0\u901a\u77e5",
      landingTitle:"PasarMalam \u73b0\u5728\u4e0a\u7ebf",
      landingBody:"\u4e70\u5bb6\u548c\u5356\u5bb6\u53ef\u5feb\u901f\u6536\u5230\u8ba2\u5355\u3001\u804a\u5929\u548c\u4fc3\u9500\u63d0\u9192\u3002",
      close:"\u5173\u95ed"
    }
  };
  let audioReady=false;
  let audioCtx=null;
  let cssReady=false;
  const stateByRole={};
  function safeGet(key,fallback){
    try{return localStorage.getItem(key)||fallback}catch(e){return fallback}
  }
  function safeSet(key,value){
    try{sessionStorage.setItem(key,String(value))}catch(e){}
  }
  function safeSession(key,fallback){
    try{return Number(sessionStorage.getItem(key)||fallback)}catch(e){return Number(fallback)}
  }
  function lang(){
    const saved=safeGet(LANG_KEY,"ms");
    return copy[saved]?saved:"ms";
  }
  function text(key){return (copy[lang()]||copy.ms)[key]||copy.ms[key]||key}
  function injectCss(){
    if(cssReady)return;
    cssReady=true;
    const style=document.createElement("style");
    style.id="pm-notify-style";
    style.textContent=[
      ".pm-live-alert{position:fixed;left:14px;right:14px;bottom:76px;z-index:90;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;max-width:520px;margin:auto;padding:12px 12px;border-radius:14px;background:linear-gradient(135deg,#e21b70,#ff6b35 55%,#0f9f8f);color:#fff;box-shadow:0 16px 38px rgba(16,24,40,.28);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;transform:translateY(150%);opacity:0;pointer-events:none;transition:transform .22s ease,opacity .22s ease}",
      ".pm-live-alert.show{transform:translateY(0);opacity:1;pointer-events:auto}",
      ".pm-live-alert.landing{position:static;max-width:none;margin:10px 0 14px;transform:none;opacity:1;pointer-events:auto;border-radius:8px}",
      ".pm-live-bell{width:38px;height:38px;border-radius:999px;background:#fff;color:#e21b70;display:grid;place-items:center;font-size:20px;font-weight:900;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}",
      ".pm-live-copy{min-width:0}.pm-live-title{font-size:14px;font-weight:950;line-height:1.15;margin:0 0 2px}.pm-live-body{font-size:12px;font-weight:750;line-height:1.25;margin:0;opacity:.95}",
      ".pm-live-action{border:0;border-radius:999px;background:#fff;color:#172033;min-height:34px;padding:0 12px;font-size:12px;font-weight:950;white-space:nowrap}",
      ".pm-live-alert.pulse{animation:pmPulse .55s ease 1}",
      ".pm-notify-enable{position:fixed;right:14px;bottom:76px;z-index:86;border:0;border-radius:999px;background:#e21b70;color:#fff;min-height:38px;padding:0 13px;font-size:12px;font-weight:950;box-shadow:0 10px 28px rgba(226,27,112,.28)}",
      ".pm-notify-enable.hide{display:none}",
      "@keyframes pmPulse{0%{transform:scale(.98)}45%{transform:scale(1.03)}100%{transform:scale(1)}}",
      "@media(max-width:420px){.pm-live-alert{left:10px;right:10px;bottom:72px;grid-template-columns:auto 1fr}.pm-live-action{grid-column:1/-1;width:100%}.pm-live-title{font-size:13px}.pm-live-body{font-size:11.5px}.pm-notify-enable{right:10px;bottom:72px;min-height:34px;font-size:11px}}"
    ].join("");
    document.head.appendChild(style);
  }
  function unlockSound(){
    audioReady=true;
    try{
      if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.resume)audioCtx.resume();
    }catch(e){}
  }
  ["pointerdown","touchstart","keydown"].forEach(name=>document.addEventListener(name,unlockSound,{once:true,passive:true}));
  function vibrate(pattern){
    try{if(navigator.vibrate)navigator.vibrate(pattern||[180,70,180])}catch(e){}
  }
  function beep(){
    if(!audioReady)return;
    try{
      if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      const osc=audioCtx.createOscillator();
      const gain=audioCtx.createGain();
      osc.type="square";
      osc.frequency.setValueAtTime(880,audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320,audioCtx.currentTime+.08);
      gain.gain.setValueAtTime(.0001,audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.18,audioCtx.currentTime+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime+.2);
    }catch(e){}
  }
  async function requestPermission(){
    unlockSound();
    if("Notification" in window&&Notification.permission==="default"){
      try{await Notification.requestPermission()}catch(e){}
    }
  }
  function nativeNotify(title,body){
    try{
      if("Notification" in window&&Notification.permission==="granted"){
        new Notification(title,{body:body,icon:"/logo-purple-bg.png",badge:"/logo-purple-bg.png"});
      }
    }catch(e){}
  }
  function ensureAlert(role,landing){
    injectCss();
    let el=document.querySelector(".pm-live-alert");
    if(el)return el;
    el=document.createElement("div");
    el.className="pm-live-alert "+(landing?"landing":role||"");
    el.innerHTML='<div class="pm-live-bell">!</div><div class="pm-live-copy"><p class="pm-live-title"></p><p class="pm-live-body"></p></div><button class="pm-live-action" type="button"></button>';
    const btn=el.querySelector(".pm-live-action");
    btn.addEventListener("click",async()=>{await requestPermission();vibrate([90]);beep();show(text("readyTitle"),text("readyBody"),role,true)});
    if(landing){
      const main=document.querySelector("main");
      if(main)main.insertBefore(el,main.firstElementChild);
      else document.body.prepend(el);
    }else{
      document.body.appendChild(el);
    }
    return el;
  }
  function ensureEnable(role){
    if(document.querySelector(".pm-notify-enable"))return;
    if("Notification" in window&&Notification.permission==="granted")return;
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="pm-notify-enable";
    btn.textContent=text("enable");
    btn.addEventListener("click",async()=>{
      await requestPermission();
      btn.classList.add("hide");
      vibrate([110,60,110]);
      beep();
      show(text("readyTitle"),text("readyBody"),role,true);
    });
    document.body.appendChild(btn);
  }
  function show(title,body,role,stay){
    const el=ensureAlert(role,false);
    el.querySelector(".pm-live-title").textContent=title||text("newTitle");
    el.querySelector(".pm-live-body").textContent=body||"";
    el.querySelector(".pm-live-action").textContent=text("enable");
    el.classList.add("show","pulse");
    setTimeout(()=>el.classList.remove("pulse"),650);
    if(!stay)setTimeout(()=>el.classList.remove("show"),7000);
  }
  function normalizeRows(data){
    const rows=Array.isArray(data&&data.notifications)?data.notifications:[];
    const unread=rows.filter(n=>!Number(n.read_at||0));
    const count=Number(data&&data.unread);
    return {rows:unread,count:Number.isFinite(count)?count:unread.length};
  }
  async function poll(opts){
    const role=opts.role||"buyer";
    const token=typeof opts.token==="function"?opts.token():"";
    if(!token)return;
    try{
      const res=await fetch((opts.api||DEFAULT_API)+"/api/notifications",{headers:{Authorization:"Bearer "+token}});
      const data=await res.json();
      const info=normalizeRows(data);
      const key="pm-notify-count-"+role;
      const previous=safeSession(key,info.count);
      safeSet(key,info.count);
      if(info.count>previous){
        const item=info.rows[0]||{};
        const title=item.title||text("newTitle");
        const body=item.body||item.message||text("readyBody");
        show(title,body,role,false);
        vibrate([180,70,180]);
        beep();
        nativeNotify(title,body);
      }
    }catch(e){}
  }
  window.PMNotify={
    start:function(opts){
      opts=opts||{};
      const role=opts.role||"buyer";
      if(opts.landing||role==="landing"){
        const el=ensureAlert("landing",true);
        el.querySelector(".pm-live-title").textContent=text("landingTitle");
        el.querySelector(".pm-live-body").textContent=text("landingBody");
        el.querySelector(".pm-live-action").textContent=text("enable");
        return;
      }
      if(stateByRole[role])return;
      stateByRole[role]=true;
      injectCss();
      ensureEnable(role);
      poll(opts);
      setInterval(()=>poll(opts),30000);
    }
  };
})();
