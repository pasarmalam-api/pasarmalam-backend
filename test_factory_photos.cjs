const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Node {
  constructor(){this.children=[];this.className='';this.classList={add:()=>{}};}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node)}}
  appendChild(node){this.append(node)}
  replaceChildren(...nodes){this.children=[];this.append(...nodes)}
  remove(){this.parent.children=this.parent.children.filter(node=>node!==this)}
  querySelectorAll(selector){return this.children.filter(node=>selector==='.factory-photo-label'?node.className==='factory-photo-label':node.tag==='button')}
  setAttribute(){}
  focus(){}
}
const grid=new Node(),mode={value:'factory',addEventListener:(_,fn)=>mode.change=fn};
const document={createElement:tag=>Object.assign(new Node(),{tag}),getElementById:id=>id==='previewGrid'?grid:id==='sellingMode'?mode:new Node()};
const context=vm.createContext({document,window:{},localStorage:{getItem:()=> 'en'}});
vm.runInContext(fs.readFileSync('landing-site-v2/selling-types.js','utf8'),context);
context.PMSelling=context.window.PMSelling;
vm.runInContext(fs.readFileSync('landing-site-v2/seller/product-photos.js','utf8'),context);
context.renderProductPhotos=context.window.renderProductPhotos;
const images=['first.jpg','second.jpg'];
context.renderProductPhotos(images);
assert.equal(grid.children.length,2);
for(const tile of grid.children)assert.equal(tile.querySelectorAll('.factory-photo-label').length,1);
assert.deepEqual(images,['first.jpg','second.jpg']);
for(const type of ['bulk','retail']){mode.value=type;mode.change();for(const tile of grid.children)assert.equal(tile.querySelectorAll('.factory-photo-label').length,0)}
mode.value='factory';mode.change();
const tile=grid.children[0];context.PMSelling.labelPhoto(tile,{selling_mode:'factory'});
assert.equal(tile.querySelectorAll('.factory-photo-label').length,1);
assert.deepEqual(images,['first.jpg','second.jpg']);
console.log('Factory photo labels: automatic preview, mode switching, no duplicate badges and unchanged image URLs passed');
