(function(){
 const el=id=>document.getElementById(id);
 async function request(options={}){
  const token=localStorage.getItem('pm_token');if(!token)throw new Error('Please sign in to view your profile.');
  const r=await fetch('https://pasarmalam-backend.onrender.com/api/profile',{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');el('profileForm').hidden=true;el('loginLink').hidden=false}
  if(!r.ok||!d.user)throw new Error(d.error||'Unable to load profile. Please try again.');return d;
 }
 function fill(user){for(const key of ['name','email','phone','address'])el(key).value=user[key]||'';el('profileForm').hidden=false;el('logout').hidden=false;el('loginLink').hidden=true}
 el('profileForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.currentTarget.querySelector('button');if(button.disabled)return;button.disabled=true;
  try{const d=await request({method:'POST',body:JSON.stringify({name:el('name').value.trim(),phone:el('phone').value.trim(),address:el('address').value.trim()})});fill(d.user);localStorage.setItem('pm_user',JSON.stringify(d.user));if(d.token)localStorage.setItem('pm_token',d.token);el('profileStatus').textContent='Profile saved.'}
  catch(e){el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please try again.':e.message}finally{button.disabled=false}
 });
 el('logout').onclick=()=>{localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');location.href='login.html'};
 request().then(d=>{fill(d.user);el('profileStatus').textContent=''}).catch(e=>{el('profileStatus').textContent=e instanceof TypeError?'Connection failed. Please reload to try again.':e.message;el('loginLink').hidden=false});
})();
