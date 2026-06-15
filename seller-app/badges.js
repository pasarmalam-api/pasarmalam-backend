(function(){
  const API="https://pasarmalam-backend.onrender.com";
  function token(){return localStorage.getItem("pm_token")||""}
  function add(href,count){
    document.querySelectorAll(`nav a[href="${href}"]`).forEach(a=>{
      let b=a.querySelector(".badge-count");if(!b){b=document.createElement("span");b.className="badge-count";a.appendChild(b)}
      b.textContent=count>99?"99+":count;b.classList.toggle("show",count>0);
    });
  }
  async function load(){
    try{
      if(!token())return;
      const r=await fetch(API+"/api/notifications",{headers:{Authorization:"Bearer "+token()}});
      const d=await r.json();const rows=(d.notifications||[]).filter(n=>!Number(n.read_at||0));
      const count=fn=>rows.filter(fn).length;
      add("notifications.html",rows.length);
      add("orders.html",count(n=>["order","payment"].includes(n.type)||String(n.target_url||"").includes("orders")));
      add("returns.html",count(n=>n.type==="return"||String(n.target_url||"").includes("returns")));
      add("messages.html",count(n=>n.type==="message"||String(n.target_url||"").includes("messages")));
      add("wallet.html",count(n=>n.type==="wallet"||String(n.target_url||"").includes("wallet")));
      add("support.html",count(n=>n.type==="support"||String(n.target_url||"").includes("support")));
    }catch(e){}
  }
  setTimeout(load,300);
})();
