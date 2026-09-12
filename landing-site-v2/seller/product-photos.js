(function(){
  window.renderProductPhotos=function(images){
    const grid=document.getElementById('previewGrid');
    grid.replaceChildren();
    const lang=localStorage.getItem('pasarmalam-lang')||'ms';
    const label=({en:'Remove photo',ms:'Buang foto',zh:'\u5220\u9664\u7167\u7247'})[lang]||'Remove photo';
    images.forEach((url,index)=>{
      const tile=document.createElement('div');
      tile.className='preview';
      const image=document.createElement('img');
      image.src=url;image.alt='';image.loading='lazy';
      const remove=document.createElement('button');
      remove.type='button';remove.className='photo-remove';remove.textContent='\u00d7';
      remove.title=label;remove.setAttribute('aria-label',label+' '+(index+1));
      remove.onclick=()=>{
        images.splice(index,1);
        ['productImage','cameraImage'].forEach(id=>{const input=document.getElementById(id);if(input)input.value=''});
        renderProductPhotos(images);
        const next=grid.querySelectorAll('button');
        document.getElementById('out').tabIndex=-1;
        (next[Math.min(index,next.length-1)]||document.getElementById('out')).focus();
      };
      tile.append(image,remove);grid.append(tile);
    });
  };
})();
