(function(){
  const API="https://pasarmalam-backend.onrender.com";
  const css=".pm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#f6c85f;color:#182236;padding:0 6px;font-size:12px;font-weight:900;margin-left:5px}.pm-badge.hide{display:none}";
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
  function token(){return localStorage.getItem("pm_token")||""}
  function add(target,count){
    document.querySelectorAll(target).forEach(el=>{
      let b=el.querySelector(".pm-badge");if(!b){b=document.createElement("span");b.className="pm-badge";el.appendChild(b)}
      b.textContent=count>99?"99+":count;b.classList.toggle("hide",!count);
    });
  }
  async function load(){
    try{
      if(!token())return;
      const r=await fetch(API+"/api/notifications",{headers:{Authorization:"Bearer "+token()}});
      const d=await r.json();const rows=(d.notifications||[]).filter(n=>!Number(n.read_at||0));
      const count=fn=>rows.filter(fn).length;
      add('a[href="notifications.html"],button[onclick*="notifications.html"]',rows.length);
      add('button[onclick*="orders.html"],a[href="orders.html"]',count(n=>["order","payment"].includes(n.type)||String(n.target_url||"").includes("orders")));
      add('button[onclick*="returns.html"],a[href="returns.html"]',count(n=>n.type==="return"||String(n.target_url||"").includes("returns")));
      add('button[onclick*="chat.html"],a[href="chat.html"]',count(n=>n.type==="message"||String(n.target_url||"").includes("chat")));
      add('button[onclick*="support.html"],a[href="support.html"]',count(n=>n.type==="support"||String(n.target_url||"").includes("support")));
    }catch(e){}
  }
  setTimeout(load,300);
})();
