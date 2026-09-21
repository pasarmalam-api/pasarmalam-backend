(function(){
 const params=new URLSearchParams(location.search),main=document.querySelector('main');
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const categories=['All','Phones','Phone Accessories','Electronics','Car Parts','Hardware','Stationery','Toys','Shoes','Clothes','Meals','Street Food','Food','Drinks','Groceries'];
 const normal=c=>c==='Chargers'?'Phone Accessories':c;
 const form=document.createElement('form');form.className='filter-toolbar';
 form.innerHTML='<label>Search<input name="q" type="search" placeholder="Product or shop" aria-label="Search products"></label><label>Categories<select name="category"></select></label><label>Sort by<select name="sort"><option value="relevance">Relevance</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="latest">Latest</option></select></label><label>Min RM<input name="min" type="number" min="0" step="0.01"></label><label>Max RM<input name="max" type="number" min="0" step="0.01"></label><button class="soft" type="submit">Search</button><button class="soft" type="reset">Reset</button>';
 form.elements.category.innerHTML=categories.map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('');
 for(const key of ['q','category','sort','min','max'])if(params.has(key))form.elements[key].value=key==='category'?normal(params.get(key)):params.get(key);
 const status=document.createElement('p');status.setAttribute('role','status');main.prepend(form);form.after(status);
 let products=[];
 function draw(){
  const f=form.elements,q=f.q.value.trim().toLowerCase(),category=f.category.value||'All',min=f.min.value===''?0:Number(f.min.value),max=f.max.value===''?Infinity:Number(f.max.value);
  if(max<min){status.textContent='Maximum price must be greater than minimum price.';return}
  let rows=products.filter(p=>Number(p.stock)>0&&(category==='All'||normal(p.category)===category)&&Number(p.price)>=min&&Number(p.price)<=max&&(!q||[p.name,p.shop,normal(p.category),p.description].join(' ').toLowerCase().includes(q)));
  if(f.sort.value==='low')rows.sort((a,b)=>a.price-b.price);else if(f.sort.value==='high')rows.sort((a,b)=>b.price-a.price);else if(f.sort.value==='latest')rows.sort((a,b)=>b.id-a.id);else rows=PMCatalogue.mixShops(rows);
  status.textContent=rows.length+' products';
  document.getElementById('title').textContent=category;
  document.getElementById('list').innerHTML=rows.length?rows.map(p=>{const image=(p.images||[])[0]||p.image_url;return `<article class="card"><a class="result-link" href="product.html?id=${encodeURIComponent(p.id)}"><div class="photo">${image?`<img src="${escape(image)}" alt="${escape(p.name)}" loading="lazy">`:'P'}</div><div class="body"><b>${escape(p.name)}</b><p class="muted">${escape(p.shop)} | ${escape(normal(p.category))}</p>${PMShop.badge(p)}<p class="price">RM${Number(p.price).toFixed(2)}</p></div></a></article>`}).join(''):'<div class="empty-state">No matching products. Try another search or reset your filters.</div>';
  const next=new URLSearchParams();for(const key of ['q','category','sort','min','max'])if(f[key].value)next.set(key,f[key].value);history.replaceState(null,'','?'+next);
 }
 form.onsubmit=e=>{e.preventDefault();draw()};form.onchange=draw;form.onreset=()=>{setTimeout(draw,0)};
 status.textContent='Loading products...';
 fetch('https://pasarmalam-backend.onrender.com/api/products').then(async r=>{if(!r.ok)throw Error('Unable to load products. Please refresh to try again.');return r.json()}).then(d=>{products=d.products||[];draw()}).catch(e=>{status.textContent=e.message});
})();
