(function(root){
  // Take one product per shop each round, preserving each shop's product order.
  function mixShops(products){
    const shops=new Map();
    for(const product of products){
      const key=product.seller_id!=null?'seller:'+product.seller_id:'shop:'+(product.shop||product.id);
      if(!shops.has(key))shops.set(key,[]);
      shops.get(key).push(product);
    }
    const groups=[...shops.values()],mixed=[];
    for(let round=0;mixed.length<products.length;round++){
      for(const group of groups)if(round<group.length)mixed.push(group[round]);
    }
    return mixed;
  }
  root.PMCatalogue={mixShops};
  if(typeof module==='object'&&module.exports)module.exports=root.PMCatalogue;
})(typeof window==='object'?window:globalThis);
