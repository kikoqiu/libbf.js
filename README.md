# libbf.js
Arbitrary precision floating point number library. Libbf emscriptened.
* Arbitrary precision floating point number library for browsers
* Port LibBF Library from Fabrice Bellard to the browser envirenment by emscripten.
* Better performance js bigfloat libraries with precision.
* Not carefully tested.

# Usage
## constructor
var num=bfjs.bf(a : number or string)
## Math functions
```
add
sub
mul
div
mod
rem
or
xor
and
sqrt
fpround
round
trunc
floor
ceil
neg
abs
sign
LOG2
PI
MIN_VALUE
MAX_VALUE
EPSILON
exp
log
pow
cos
sin
tan
atan
atan2
asin
acos
is_finit
is_nan
is_zero
copy
clone
fromNumber
toNumber
f64
cmp
```

## script
```
<script src="libbf.js"></script>
<script src="bf.js"></script>
```

# Demo
Try it here!

https://kikoqiu.github.io/jslab/jslab.html

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


See bf.html for demo.
