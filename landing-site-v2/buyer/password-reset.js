(function(){
  const el=id=>document.getElementById(id);
  const params=new URLSearchParams(location.hash.slice(1));
  const token=params.get('token'),email=params.get('email');
  if(location.hash)history.replaceState(null,'',location.pathname);
  if(token&&email){el('requestForm').hidden=true;el('confirmForm').hidden=false;el('newLink').hidden=false}
  async function submit(form,path,data){
    const button=form.querySelector('button');if(button.disabled)return;
    button.disabled=true;el('resetStatus').textContent='Please wait...';
    try{
      const response=await fetch('https://pasarmalam-backend.onrender.com'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||!result.ok)throw new Error(result.error||'Unable to reset password. Please try again.');
      el('resetStatus').textContent=result.message;el('resetStatus').className='success';
      if(data.token){form.hidden=true;el('signInLink').hidden=false;localStorage.removeItem('pm_token');localStorage.removeItem('pm_user')}
    }catch(error){el('resetStatus').className='error';el('resetStatus').textContent=error instanceof TypeError?'Connection failed. Please try again.':error.message}
    finally{button.disabled=false}
  }
  el('requestForm').addEventListener('submit',event=>{event.preventDefault();submit(event.currentTarget,'/api/auth/password-reset',{email:el('email').value.trim().toLowerCase()})});
  el('confirmForm').addEventListener('submit',event=>{event.preventDefault();if(el('newPassword').value!==el('confirmPassword').value){el('resetStatus').textContent='Passwords do not match.';return}submit(event.currentTarget,'/api/auth/password-reset/confirm',{email,token,new_password:el('newPassword').value})});
})();
