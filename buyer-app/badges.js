(function(){
  const API="https://pasarmalam-backend.onrender.com";
  const SELLER_URL="https://violet-crissie-18.tiiny.site/register.html?from=buyer";
  const css=".pm-badge{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#f6c85f;color:#182236;padding:0 6px;font-size:12px;font-weight:900;margin-left:5px}.pm-badge.hide{display:none}.pm-seller-switch{position:fixed;right:22px;bottom:22px;z-index:30;border:0;border-radius:999px;background:linear-gradient(135deg,#0f9f8f,#6d5dfc);color:#fff;box-shadow:0 10px 26px #0003;min-height:44px;padding:0 15px;font-weight:900;font-size:13px}.pm-policy-link{position:fixed;left:22px;bottom:22px;z-index:30;border:1px solid #dbe4ea;border-radius:999px;background:#fff;color:#0f9f8f;box-shadow:0 10px 26px #0002;min-height:38px;padding:0 13px;font-weight:900;font-size:12px;display:inline-flex;align-items:center;text-decoration:none}.pm-seller-switch:hover,.pm-policy-link:hover{filter:brightness(.98)}@media(max-width:760px){.pm-mobile-links{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 8px 0}.pm-mobile-links .pm-seller-switch,.pm-mobile-links .pm-policy-link{position:static;left:auto;right:auto;bottom:auto;z-index:1;box-shadow:none;width:100%;justify-content:center;min-height:42px;border-radius:8px}.pm-mobile-links .pm-policy-link{border:1px solid #dbe4ea}.pm-mobile-links .pm-seller-switch{border:0}}";
  const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
  function token(){return localStorage.getItem("pm_token")||""}
  function addSellerSwitch(){
    if(document.querySelector(".pm-seller-switch"))return;
    const holder=mobileHolder();
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="pm-seller-switch";
    btn.textContent="Switch to Seller";
    btn.onclick=()=>{location.href=SELLER_URL};
    holder.appendChild(btn);
  }
  function addPolicyLink(){
    if(document.querySelector(".pm-policy-link"))return;
    const holder=mobileHolder();
    const link=document.createElement("a");
    link.className="pm-policy-link";
    link.href="policies.html";
    link.textContent="Policies";
    holder.appendChild(link);
  }
  function mobileHolder(){
    if(window.matchMedia("(max-width:760px)").matches){
      let holder=document.querySelector(".pm-mobile-links");
      if(!holder){
        holder=document.createElement("div");
        holder.className="pm-mobile-links";
        const nav=document.querySelector(".bottom-nav");
        if(nav&&nav.parentNode)nav.parentNode.insertBefore(holder,nav);
        else document.body.appendChild(holder);
      }
      return holder;
    }
    return document.body;
  }
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
  addSellerSwitch();
  addPolicyLink();
  setTimeout(load,300);
})();
