# libbf.js
libbf emscriptened
* Port LibBF Library from Fabrice Bellard to the browser envirenment by emscripten.
* Better performance js bigfloat libraries with precision.
* Not carefully tested.

# Envirenment
* Runs in a browser
* The WASM code loading requires an http server to work


MIT license.

Loot at https://bellard.org/libbf/ for more information.


# Add Romberg Integration Support
> Calc definite integral of 4/(1+x^2) from 0 to 1
> (Should be PI)
```
info={}
rst=bfjs.helper.romberg(
  (x)=>bfjs.bf(4).div(x.mul(x).add(1)),
  0,1,1e-40,1e-40,info);
console.log(info+'')
```



# Usage
See bf.html for usage.
```
  <script src="libbf.js"></script>
  <script src="bf.js"></script>
  <div id='output' style="word-wrap:break-word;width:100vw;"></div>
  <script>


function assert(q){
  if(!q){
    throw new Error(q);
  }
}
function asserteq(a,b){
  assert(a==b);
}


function test(ma,mb,times){
  for(var i=0;i<times;++i){
    a=Math.random();
    b=Math.random();
    asserteq(ma(a,b),mb(a,b));
  }
}

bfjs.ready=function(){
  test((a,b)=>a+b,(a,b)=>bfjs.bf(a).add(b).f64(),1000);
  test((a,b)=>a-b,(a,b)=>bfjs.bf(a).sub(b).f64(),1000);
  test((a,b)=>a*b,(a,b)=>bfjs.bf(a).mul(b).f64(),1000);
  test((a,b)=>a/b,(a,b)=>bfjs.bf(a).div(b).f64(),1000);
  test((a,b)=>a%b,(a,b)=>bfjs.bf(a).mod(b).f64(),1000);
  
  bfjs.decimal_precision(10240);
  document.getElementById('output').innerHTML='PI='+bfjs.bf().setPI().toString();
}
  </script>
  ```
