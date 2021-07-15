# libbf.js
libbf emscripten

Port LibBF Library from Fabrice Bellard to the browser envirenment by emscripten.

Better performance than other js libraries.

Not carefully tested.

See bf.html for usage.

MIT license.

Loot at https://bellard.org/libbf/ for more information.


# Add Romberg Integration Support
> Calc definite and improper integral of 4/(1+x^2) from 0 to 1
> (Should be PI)
```
info={}
rst=bfjs.helper.romberg(
  (x)=>bfjs.bf(4).div(x.mul(x).add(1)),
  0,1,1e-40,info);
console.log(rst.toString(10,40)+', steps=',info.steps)
```
