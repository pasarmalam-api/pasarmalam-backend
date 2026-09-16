(() => {
  const panel = document.querySelector('main .panel');
  const style=document.createElement('style');
  style.textContent='#aiConsent{width:auto;min-height:0;margin-right:6px}#aiDrafts label{display:block;margin:12px 0}#aiDrafts input,#aiDrafts textarea{display:block;width:100%;margin-top:6px}#aiPreviews{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,140px));gap:12px;margin:16px 0}#aiPreviews .preview{position:relative;aspect-ratio:1;border:1px solid var(--line);border-radius:6px;overflow:hidden}#aiPreviews img{display:block;width:100%;height:100%;object-fit:contain}#aiPreviews .photo-remove{position:absolute;right:2px;top:2px;width:32px;height:32px;border:1px solid var(--line);background:white;border-radius:4px}#aiDrafts button{white-space:normal}';
  document.head.append(style);
  panel.innerHTML = `<h3>Product photos</h3>
    <label for="aiPhotos">Photos (up to 6)</label><input id="aiPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple>
    <div id="aiPreviews" class="preview-grid"></div>
    <label for="aiNotes">Product details, condition and available varieties</label>
    <textarea id="aiNotes" maxlength="3000"></textarea>
    <label><input id="aiConsent" type="checkbox"> Send these product photos and details to OpenAI for analysis</label>
    <p><button id="aiGenerate" class="primary" type="button">Create listing drafts</button></p>
    <p id="aiStatus" role="status" aria-live="polite"></p><div id="aiDrafts"></div>`;
  const $ = id => document.getElementById(id);
  let images = [], busy = false, currentDrafts = [];
  const owner = () => localStorage.getItem('pm_token') || '';
  const message = value => { $('aiStatus').textContent = value; };
  function remember() {
    sessionStorage.setItem('pm_ai_workspace',JSON.stringify({owner:owner(),created:Date.now(),images,products:currentDrafts,notes:$('aiNotes').value}));
  }
  function lock(value) {
    busy = value;
    panel.querySelectorAll('button,input,textarea').forEach(el => { el.disabled = value; });
  }
  async function api(body) {
    const token = owner();
    if (!token) throw new Error('Please sign in as a seller.');
    const res = await fetch('https://pasarmalam-backend.onrender.com/api/seller/ai/listing', {
      method: 'POST', headers: {'Content-Type':'application/json', Authorization:'Bearer '+token},
      body: JSON.stringify(body), signal: AbortSignal.timeout(90000)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'AI request failed.');
    return data;
  }
  async function compress(file) {
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12000000)
      throw new Error('Choose JPEG, PNG or WebP photos under 12 MB each.');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = Math.min(1, 1000 / Math.max(image.width,image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.width*scale)); canvas.height = Math.max(1,Math.round(image.height*scale));
      const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      let output = canvas.toDataURL('image/jpeg',0.75);
      if(output.length>240000) output=canvas.toDataURL('image/jpeg',0.45);
      if(output.length>240000) throw new Error('Photo is too detailed. Please select a smaller photo.');
      return output;
    } finally { URL.revokeObjectURL(url); }
  }
  function previews() {
    $('aiPreviews').replaceChildren();
    images.forEach((src,i) => {
      const tile=document.createElement('div');tile.className='preview';
      const img=document.createElement('img');img.src=src;img.alt='Product photo '+(i+1);img.style.objectFit='contain';
      const remove=document.createElement('button');remove.className='photo-remove';remove.type='button';
      remove.textContent='\u00d7';remove.title='Remove photo';remove.setAttribute('aria-label','Remove photo '+(i+1));
      remove.onclick=()=>{images.splice(i,1);currentDrafts=[];$('aiDrafts').replaceChildren();sessionStorage.removeItem('pm_ai_workspace');previews();};
      tile.append(img,remove);$('aiPreviews').append(tile);
    });
  }
  $('aiPhotos').onchange=async()=>{
    if(busy)return;
    const files=[...$('aiPhotos').files];
    if(images.length+files.length>6){message('Maximum 6 photos. Remove a photo first.');$('aiPhotos').value='';return;}
    lock(true);message('Preparing photos...');
    try { const additions=[];for(const file of files) additions.push(await compress(file));
      images.push(...additions);currentDrafts=[];$('aiDrafts').replaceChildren();sessionStorage.removeItem('pm_ai_workspace');previews();message('');
    } catch(e){message(e.message);} finally{$('aiPhotos').value='';lock(false);}
  };
  function field(parent,label,value,multiline=false){
    const wrap=document.createElement('label');wrap.textContent=label;
    const input=document.createElement(multiline?'textarea':'input');input.value=value;wrap.append(input);parent.append(wrap);return input;
  }
  async function upload(src) {
    const blob=await (await fetch(src)).blob();const form=new FormData();
    form.append('file',blob,'product.jpg');form.append('upload_preset','pasarmalam_products');form.append('folder','pasarmalam/products');
    const res=await fetch('https://api.cloudinary.com/v1_1/dn68sok6b/image/upload',{method:'POST',body:form});
    const data=await res.json();if(!res.ok || !data.secure_url)throw new Error('Photo upload failed. Your draft is still here.');return data.secure_url;
  }
  function drafts(products) {
    currentDrafts=products;
    $('aiDrafts').replaceChildren();
    products.forEach((draft,i)=>{
      const section=document.createElement('section');section.style.cssText='border-top:1px solid var(--line);padding:20px 0;min-width:0';
      const heading=document.createElement('h3');heading.textContent='Draft '+(i+1);section.append(heading);
      const name=field(section,'Product name',draft.name);
      const description=field(section,'Description',draft.description,true);
      const variants=field(section,'Varieties (comma separated)',draft.variants.join(', '));
      for(const input of [name,description,variants]) input.oninput=()=>{
        draft.name=name.value;draft.description=description.value;draft.variants=variants.value.split(',').map(v=>v.trim()).filter(Boolean);
      };
      const questions=document.createElement('p');questions.textContent='Confirm before publishing: '+draft.questions;section.append(questions);
      const photoNote=document.createElement('p');photoNote.textContent='Selected photos: '+draft.photo_indices.map(n=>n+1).join(', ');section.append(photoNote);
      const compare=document.createElement('button');compare.type='button';compare.className='soft';compare.textContent='Compare market prices';
      const review=document.createElement('button');review.type='button';review.className='primary';review.textContent='Review listing';review.style.margin='8px';
      const result=document.createElement('div');result.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';result.setAttribute('aria-live','polite');
      compare.onclick=async()=>{
        lock(true);result.textContent='Searching comparable Malaysian listings...';
        try {const data=await api({action:'research',query:[name.value,description.value,variants.value].join('\n').slice(0,4000)});
          result.textContent=data.answer+'\n\nChecked: '+new Date(data.checked_at).toLocaleString()+'\n';
          data.sources.forEach(source=>{const link=document.createElement('a');link.href=source.url;link.textContent=source.title;link.target='_blank';link.rel='noopener noreferrer';result.append(link,document.createElement('br'));});
        } catch(e){result.textContent=e.message;}finally{lock(false);}
      };
      review.onclick=async()=>{
        if(!name.value.trim()){message('Enter a product name.');name.focus();return;}
        lock(true);message('Uploading selected listing photos...');
        try {remember();const urls=[];for(const index of draft.photo_indices)urls.push(await upload(images[index]));
          sessionStorage.setItem('pm_ai_listing',JSON.stringify({owner:owner(),created:Date.now(),name:name.value,description:description.value,variants:variants.value,images:urls}));
          location.href='add-product.html?ai=draft';
        }catch(e){message(e.message);lock(false);}
      };
      section.append(compare,review,result);$('aiDrafts').append(section);
    });
  }
  $('aiGenerate').onclick=async()=>{
    if(busy)return;
    if(!images.length){message('Select at least one product photo.');return;}
    if(!$('aiConsent').checked){message('Please confirm permission to send the selected photos for AI analysis.');return;}
    lock(true);message('Analyzing products...');currentDrafts=[];$('aiDrafts').replaceChildren();sessionStorage.removeItem('pm_ai_workspace');
    try {const data=await api({action:'draft',images,notes:$('aiNotes').value});drafts(data.products);message('Drafts ready. Nothing has been published.');}
    catch(e){message(e.message);}finally{lock(false);}
  };
  try {
    const saved=JSON.parse(sessionStorage.getItem('pm_ai_workspace')||'null');
    if(saved && saved.owner===owner() && Date.now()-saved.created<3600000){
      images=saved.images;$('aiNotes').value=saved.notes;previews();drafts(saved.products);
    } else sessionStorage.removeItem('pm_ai_workspace');
  } catch {sessionStorage.removeItem('pm_ai_workspace');}
})();
