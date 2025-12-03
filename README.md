# libbf.js

A JavaScript library for arbitrary-precision floating-point, rational, and complex arithmetic, ported from Fabrice Bellard's original [LibBF](https://bellard.org/libbf/) library using Emscripten. This library provides a robust and high-performance foundation for advanced mathematical computations in JavaScript and WebAssembly environments.

## Core Features

-   **High-Precision Real Numbers (`BigFloat`)**: Perform floating-point calculations with user-defined precision, far exceeding the limits of standard JavaScript numbers.
-   **Exact Rational Arithmetic (`BigFraction`)**: Represent and operate on numbers as fractions, avoiding precision loss for division.
-   **Complex Number Arithmetic (`Complex`)**: Full support for complex number operations, including transcendental functions.
-   **Polynomial and Power Series (`Poly`)**: Create and manipulate polynomials and truncated power series with generic coefficient types.
-   **Automatic Type Promotion (`Scalar`)**: A unified wrapper that automatically handles promotions between `BigFraction`, `BigFloat`, and `Complex` types during mixed-mode arithmetic.
-   **High Performance**: Core calculations are executed in WebAssembly, compiled from the highly optimized C code of LibBF.

## Setup & Initialization

The library relies on a WebAssembly (WASM) module for its core functionality. You must load and initialize this module before performing any calculations.

```javascript
// Import the library's init function
import { init, bf, decimal_precision } from 'bf.js';

async function main() {
    // 1. Load the Emscripten WASM module
    let createLibbf=require('dist/libbf.js');
    let libbf_module = await createLibbf({ locateFile: function(path, prefix) {
        return "dist/libbf.wasm";
    }});
    
    // 2. Initialize the high-level bf.js library with the loaded module
    await init(libbf_module);

    console.log('libbf.js is ready to use!');

    // 3. Start performing calculations
    decimal_precision(100); // Set precision to 100 decimal places

    const a = bf('123.456');
    const b = bf('789.123');
    const c = a.mul(b);

    console.log(c.toString());
    // Output: 97421.909928000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
}

main();
```

## Usage Examples

### BigFloat

The `BigFloat` class is the workhorse for high-precision real number arithmetic. Use the `bf()` factory function for convenience.

```javascript
import { bf, PI, precision, pop_precision, push_precision } from 'bf.js';

// Set precision to 200 bits
precision(200);

// Basic arithmetic
const a = bf(2).sqrt();
console.log('sqrt(2) =', a.toString());

// Use constants
const pi = PI;
console.log('PI =', pi.toString());

// Temporarily change precision
push_precision(50);
console.log('Low-precision PI =', PI.toString()); // Constants are re-evaluated at current precision
pop_precision();

console.log('Original PI =', pi.toString());
```

### BigFraction

The `BigFraction` class provides exact rational arithmetic, avoiding floating-point errors.

```javascript
import { frac } from 'bf.js';

const a = frac('1/3');
const b = frac('1/6');

// 1/3 + 1/6 = 3/6 = 1/2
const c = a.add(b);
console.log(c.toString()); // Output: "1/2"

// Create from a float
const d = frac(0.75);
console.log(d.toString()); // Output: "3/4"
```

### Complex

The `Complex` class supports standard and transcendental operations on complex numbers.

```javascript
import { complex } from 'bf.js';

// Create i
const i = complex(0, 1);

// Calculate e^(i*pi) = -1
const euler = i.mul(PI).exp();
console.log(euler.toString()); // Output: (-1)

// (-1)^(0.5) = i
const sqrt_neg_one = complex(-1).pow(0.5);
console.log(sqrt_neg_one.toString()); // Output: (i)
```

### Poly (Polynomials)

The `Poly` class allows for the manipulation of polynomials and power series.

```javascript
import { poly, X } from 'bf.js';

// Create a polynomial P(x) = 2X^2 - 3X + 1
const p = poly([1, -3, 2]); // Dense array [c0, c1, c2, ...]

// Evaluate at X=3
console.log('P(3) =', p.eval(3).toString()); // 2*9 - 3*3 + 1 = 10

// Create from a string
const q = poly('X^3 - 1');

// Differentiate
const dq = q.deriv();
console.log("d/dx (X^3 - 1) =", dq.toString()); // 3X^2

// Integrate
const iq = q.integ();
console.log("integral(X^3 - 1) dx =", iq.toString()); // 0.25X^4 - 1X
```

### Scalar (Automatic Type Promotion)

The `Scalar` class wraps other numeric types and handles conversions automatically. This is especially useful for generic algorithms.

```javascript
import { scalar } from 'bf.js';

const a = scalar('1/3');      // Starts as BigFraction
const b = scalar(0.5);        // Starts as BigFloat
const c = scalar(complex(1, 1)); // Starts as Complex

// a + b promotes 'a' to BigFloat
const r1 = a.add(b); // r1.value is a BigFloat
console.log(r1.toString());

// r1 + c promotes 'r1' to Complex
const r2 = r1.add(c); // r2.value is a Complex
console.log(r2.toString());
```

## Numerical Methods and Utilities

`libbf.js` provides several high-precision numerical methods, similar to those found in scientific computing environments like MATLAB.

### `fminbnd(f, ax, bx, info)`

Finds the local minimum of a function `f(x)` within a specified interval `[ax, bx]`. Uses Brent's method for robust and efficient minimization.

```javascript
import { bf } from 'bf.js';
import { fminbnd } from 'bf.js';

async function runFminbnd() {
    // Assume bf.js is initialized and precision is set
    // decimal_precision(50); 

    const f = (x) => x.mul(x).sub(bf(4).mul(x)).add(bf(5)); // f(x) = x^2 - 4x + 5 (minimum at x=2)
    const ax = bf(0);
    const bx = bf(3);

    const info = {};
    const result = fminbnd(f, ax, bx, info);

    if (result) {
        console.log('fminbnd result:', result.toString()); // Expected: 2.000...
        console.log('f(result):', f(result).toString()); // Expected: 1.000...
        console.log(info.toString());
    } else {
        console.log('fminbnd did not converge.');
        console.log(info.toString());
    }
}
// runFminbnd();
```

### `fzero(f, a, b, info)`

Finds a root (where `f(x) = 0`) of a function `f(x)` within an interval `[a, b]`. The function values at `a` and `b` must have opposite signs. Uses the Brent-Dekker method.

```javascript
import { bf } from 'bf.js';
import { fzero } from 'bf.js';

async function runFzero() {
    // Assume bf.js is initialized and precision is set
    // decimal_precision(50); 

    const f = (x) => x.mul(x).sub(bf(2)); // f(x) = x^2 - 2 (roots at +/- sqrt(2))
    const a = bf(1);
    const b = bf(2); // f(1) is negative, f(2) is positive

    const info = {};
    const result = fzero(f, a, b, info);

    if (result) {
        console.log('fzero result:', result.toString()); // Expected: 1.4142... (sqrt(2))
        console.log('f(result):', f(result).toString()); // Expected: ~0
        console.log(info.toString());
    } else {
        console.log('fzero did not converge.');
        console.log(info.toString());
    }
}
// runFzero();
```

### `ode45(odefun, tspan, y0, info)`

Solves ordinary differential equations (ODEs) of the form `y' = f(t, y)` using the Dormand-Prince explicit Runge-Kutta (4,5) method with adaptive step size.

```javascript
import { bf } from 'bf.js';
import { ode45 } from 'bf.js';

async function runOde45() {
    // Assume bf.js is initialized

    // y' = -2y, y(0) = 1. Solution: y(t) = e^(-2t)
    const odefun = (t, y) => [y[0].mul(bf(-2))]; 
    const tspan = [bf(0), bf(1)]; // Integrate from t=0 to t=1
    const y0 = [bf(1)]; // Initial condition y(0)=1

    const info = {};
    const solution = ode45(odefun, tspan, y0, info);

    if (solution) {
        console.log('ODE45 solution at t=1:', solution.y[solution.y.length - 1][0].toString());
        // Expected: e^(-2) = 0.13533528...
        console.log(info.toString());
    } else {
        console.log('ODE45 solver failed.');
        console.log(info.toString());
    }
}
// runOde45();
```

### `polyfit(x, y, order, info)`

Performs polynomial curve fitting to data `(x, y)` using the least squares method. Returns the coefficients of the fitted polynomial.

```javascript
import { bf } from 'bf.js';
import { polyfit, polyval } from 'bf.js'; // polyval is a helper to evaluate the fitted polynomial

async function runPolyfit() {
    // Assume bf.js is initialized

    // Data points: y = 2x + 1
    const x_data = [bf(0), bf(1), bf(2), bf(3)];
    const y_data = [bf(1), bf(3), bf(5), bf(7)];

    const order = 1; // Fit a linear polynomial (degree 1)
    const info = {};
    const coeffs = polyfit(x_data, y_data, order, info);

    if (coeffs) {
        // Coefficients are in descending order: [c_n, ..., c_0]
        // For 2x+1, expected: [2, 1]
        console.log('Polyfit coefficients:', coeffs.map(c => c.toString()));
        console.log('Evaluated at x=2.5:', polyval(coeffs, bf(2.5)).toString()); // Expected: 6.0
        console.log(info.toString());
    } else {
        console.log('Polyfit failed.');
        console.log(info.toString());
    }
}
// runPolyfit();
```

### `romberg(f, a, b, info)` (also aliased as `integral`)

Computes the definite integral of a function `f(x)` from `a` to `b` using Romberg's method, which applies Richardson extrapolation to the trapezoidal rule for high precision.

```javascript
import { bf, PI } from 'bf.js';
import { romberg } from 'bf.js';

async function runRomberg() {
    // Assume bf.js is initialized

    // Integrate f(x) = 4 / (1 + x^2) from 0 to 1. Expected: PI
    const f = (x) => bf(4).div(bf(1).add(x.mul(x)));
    const a = bf(0);
    const b = bf(1);

    const info = {};
    const result = romberg(f, a, b, info);

    if (result) {
        console.log('Romberg integral:', result.toString());
        console.log('Difference from PI:', result.sub(PI).abs().toString());
        console.log(info.toString());
    } else {
        console.log('Romberg integration failed.');
        console.log(info.toString());
    }
}
// runRomberg();
```

### `roots(coeffs, info)`

Calculates the roots of a polynomial given its coefficients. Uses the Durand-Kerner method for high-precision root finding.

```javascript
import { bf } from 'bf.js';
import { roots } from 'bf.js';

async function runRoots() {
    // Assume bf.js is initialized

    // Polynomial: x^2 - 5x + 6 = 0. Roots: x=2, x=3
    const coeffs = [bf(1), bf(-5), bf(6)]; 

    const info = {};
    const result_roots = roots(coeffs, info);

    if (result_roots) {
        console.log('Polynomial roots:');
        result_roots.forEach((r, i) => console.log(`  Root ${i + 1}: ${r.toString()}`));
        console.log(info.toString());
    } else {
        console.log('Roots solver failed.');
        console.log(info.toString());
    }
}
// runRoots();
```

## Info

This library is a port of Fabrice Bellard's **LibBF**, a highly optimized C library for arbitrary-precision floating-point computation.

## License

MIT License.