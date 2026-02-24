const { Constants } = require("../dist/bf.cjs");
const {init,expectBFCloseTo,evalPoly}=require("./testhelper.js");
const { bf, quad,complex } =bfjs=  require('../dist/bf.cjs');



describe('quad', () => {
  beforeAll(async () => {
    await init();
  });
  // 1. Constant function: y = 5
  test('1. Integrates constant function', () => {
    const f = (x) => bf(5);
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 2. Linear: y = x, integral = 0.5 * x^2
  test('2. Integrates x from 0 to 1', () => {
    const f = (x) => x;
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 0.5, 28);
  });

  // 3. Parabola: y = 3x^2, integral = x^3
  test('3. Integrates 3x^2 from 0 to 2 (result 8)', () => {
    const f = (x) => x.pow(2).mul(3);
    const res = quad(f, 0, 2);
    expectBFCloseTo(res, 8, 25);
  });

  // 4. Exponential: e^x, integral = e^x
  test('4. Integrates e^x from 0 to 1 (result e - 1)', () => {
    const f = (x) => x.exp();
    const res = quad(f, 0, 1);
    const expected = bf(1).exp().sub(1);
    expectBFCloseTo(res, expected, 25);
  });

  // 5. Trigonometric: sin(x) from 0 to PI (result 2)
  test('5. Integrates sin(x) from 0 to PI', () => {
    const f = (x) => x.sin();
    const res = quad(f, 0, bf(-1).acos()); // PI
    expectBFCloseTo(res, 2, 25);
  });

  // 6. Rational: 4/(1+x^2) from 0 to 1 (result PI)
  test('6. Integrates 4/(1+x^2) to compute PI', () => {
    const f = (x) => bf(4).div(x.pow(2).add(1));
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, bf(-1).acos(), 25);
  });

  // 7. Symmetric interval odd function: x^3 from -1 to 1 (result 0)
  test('7. Integrates odd function over symmetric interval', () => {
    const f = (x) => x.pow(3);
    const res = quad(f, -1, 1);
    expectBFCloseTo(res, 0, 25);
  });

  // 8. Negative range
  test('8. Integrates on negative interval [-5, -2]', () => {
    const f = (x) => x.mul(2); // 2x -> x^2
    const res = quad(f, -5, -2);
    // (-2)^2 - (-5)^2 = 4 - 25 = -21
    expectBFCloseTo(res, -21, 25);
  });

  // 9. 1/sqrt(x) - Approach singularity (0.01 to 1)
  test('9. Integrates near singularity 1/sqrt(x)', () => {
    const f = (x) => bf(1).div(x.sqrt());
    // int 0.01 to 1 of x^-0.5 = [2x^0.5] = 2(1) - 2(0.1) = 1.8
    const res = quad(f, "0.01", "1");
    expectBFCloseTo(res, "1.8", 25);
  });

  // 10. High precision configuration
  test('10. Respects max_acc and high precision', () => {
    const info = { max_acc: 20, _e:1e-40,_re:1e-40};
    const f = (x) => x.cos();
    // Int cos = sin. sin(PI/2) = 1.
    const res = quad(f, 0, bf(-1).acos().div(2), info);
    expectBFCloseTo(res, 1, 35);
    expect(info.steps).toBeGreaterThan(2);
  });
});



// Helper to create BigFloat from string/number
const B = (v) => bf(v);

describe('quad1', () => {
  
  beforeAll(async () => {
    await init();
  });

  // --- Basic Polynomials ---

  // 1. Constant function: f(x) = 5
  // Int(5, 0..10) = 50
  test('1. Integrates constant function f(x) = 5', () => {
    const f = (x) => B(5);
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 2. Linear function: f(x) = x
  // Int(x, 0..10) = 0.5 * 10^2 = 50
  test('2. Integrates linear function f(x) = x', () => {
    const f = (x) => x;
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 3. Quadratic function: f(x) = x^2
  // Int(x^2, 0..1) = 1/3
  test('3. Integrates quadratic function f(x) = x^2', () => {
    const f = (x) => x.pow(2);
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, B(1).div(B(3)), 28);
  });

  // 4. Cubic function: f(x) = x^3
  // Int(x^3, 0..1) = 0.25
  test('4. Integrates cubic function f(x) = x^3', () => {
    const f = (x) => x.pow(3);
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 0.25, 28);
  });

  // --- Transcendental Functions ---

  // 5. Exponential function: f(x) = e^x
  // Int(e^x, 0..1) = e^1 - e^0 = e - 1
  test('5. Integrates exponential function f(x) = e^x', () => {
    const f = (x) => x.exp();
    const res = quad(f, 0, 1);
    const expected = B(1).exp().sub(B(1));
    expectBFCloseTo(res, expected, 25);
  });

  // 6. Natural Logarithm via Inverse: f(x) = 1/x
  // Int(1/x, 1..e) = ln(e) - ln(1) = 1
  test('6. Integrates 1/x to calculate ln(e)', () => {
    const f = (x) => B(1).div(x);
    const e = B(1).exp();
    const res = quad(f, 1, e);
    expectBFCloseTo(res, 1, 25);
  });

  // 7. Sine function: f(x) = sin(x)
  // Int(sin(x), 0..PI) = -cos(PI) - (-cos(0)) = 1 + 1 = 2
  test('7. Integrates sin(x) over [0, PI]', () => {
    const f = (x) => x.sin();
    const pi = Constants.PI; // Generate PI
    const res = quad(f, 0, pi);
    expectBFCloseTo(res, 2, 25);
  });

  // 8. Cosine function: f(x) = cos(x)
  // Int(cos(x), 0..PI/2) = sin(PI/2) - sin(0) = 1
  test('8. Integrates cos(x) over [0, PI/2]', () => {
    const f = (x) => x.cos();
    const halfPi = B(0).acos(); // PI/2
    const res = quad(f, 0, halfPi);
    expectBFCloseTo(res, 1, 25);
  });

  // --- Advanced Math / Constants ---

  // 9. Calculating Pi: f(x) = 4 / (1 + x^2)
  // Int(4/(1+x^2), 0..1) = 4 * atan(1) = 4 * (PI/4) = PI
  test('9. Calculates PI using f(x) = 4/(1+x^2)', () => {
    const f = (x) => B(4).div(B(1).add(x.pow(2)));
    const res = quad(f, 0, 1);
    const pi = B(-1).acos();
    expectBFCloseTo(res, pi, 25);
  });

  // 10. Integration by parts check: f(x) = x * e^x
  // Int(x*e^x) = (x-1)e^x. Eval at 0..1 => 0 - (-1) = 1
  test('10. Integrates f(x) = x * e^x', () => {
    const f = (x) => x.mul(x.exp());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  // --- Interval & Symmetry Tests ---

  // 11. Zero width interval
  // Int(f, a..a) = 0
  test('11. Returns zero for zero-width interval [2, 2]', () => {
    const f = (x) => x.pow(2);
    const res = quad(f, 2, 2);
    expectBFCloseTo(res, 0, 30);
  });

  // 12. Reversed limits
  // Int(x^2, 1..0) = - Int(x^2, 0..1) = -1/3
  test('12. Handles reversed limits (b < a)', () => {
    const f = (x) => x.pow(2);
    const res = quad(f, 1, 0);
    const expected = B(-1).div(B(3));
    expectBFCloseTo(res, expected, 28);
  });

  // 13. Odd function symmetry
  // Int(sin(x), -1..1) = 0 (approx, due to precision noise, but should be extremely close)
  test('13. Symmetric interval for odd function (sin) should be ~0', () => {
    const f = (x) => x.sin();
    // Using a range like [-1, 1]
    const res = quad(f, -1, 1);
    // Absolute error check roughly close to 0
    expectBFCloseTo(res, 0, 28);
  });

  // 14. Even function symmetry
  // Int(x^2, -1..1) = 2/3
  test('14. Symmetric interval for even function (x^2)', () => {
    const f = (x) => x.pow(2);
    const res = quad(f, -1, 1);
    const expected = B(2).div(B(3));
    expectBFCloseTo(res, expected, 28);
  });

  // --- Higher Precision / Complexity ---

  // 15. Higher power polynomial
  // Int(x^10, 0..1) = 1/11
  test('15. Integrates high order polynomial f(x) = x^10', () => {
    const f = (x) => x.pow(10);
    const res = quad(f, 0, 1);
    const expected = B(1).div(B(11));
    expectBFCloseTo(res, expected, 25);
  });

  // 16. Sqrt function
  // Int(sqrt(x), 0..4) = [2/3 x^(3/2)] = 2/3 * 8 = 16/3
  test('16. Integrates square root f(x) = sqrt(x)', () => {
    const f = (x) => x.sqrt();
    let info={_e:1e-8};
    const res = quad(f, 0, 4,info);
    const expected = B(16).div(B(3));
    expectBFCloseTo(res, expected, 7);
  });

  // 17. Rational function
  // Int(x / (x+1), 0..2) = Int(1 - 1/(x+1)) = [x - ln(x+1)] = (2 - ln3) - (0)
  test('17. Integrates rational function f(x) = x / (x+1)', () => {
    const f = (x) => x.div(x.add(1));
    const res = quad(f, 0, 2);
    const ln3 = B(3).log();
    const expected = B(2).sub(ln3);
    expectBFCloseTo(res, expected, 25);
  });

  // --- Configuration & Edge Cases ---

  // 18. Custom Tolerance (Relaxed)
  // Should still converge but potentially faster or with less strict precision
  test('18. Respects custom tolerance parameters', () => {
    const f = (x) => x.exp();
    // Set a very loose tolerance
    const info = { _e: 1e-5 }; 
    const res = quad(f, 0, 1, info);
    // Result should still be decent, but we check if info object is populated
    expectBFCloseTo(res, B(1).exp().sub(1), 5);
    // Ensure it didn't take too many steps for this loose tolerance
    if(info.steps) {
        // quad converges fast, but 1e-5 should be fewer steps than default 1e-30
        // This is just a sanity check that it runs.
        expect(info.steps).toBeGreaterThan(0);
    }
  });


  // 20. Info Object Population
  // Verify that the info object contains execution statistics
  test('20. Populates the info object with stats', () => {
    const f = (x) => x.pow(2);
    const info = {};
    quad(f, 0, 1, info);
    
    expect(info).toHaveProperty('result');
    expect(info).toHaveProperty('steps');
    expect(info).toHaveProperty('exectime');
    expect(info).toHaveProperty('error');
    // Check toString method exists
    expect(typeof info.toString).toBe('function');
    // Ensure result is correct
    expectBFCloseTo(info.result, B(1).div(3), 20);
  });

});




// High-precision constants for 28-decimal digit assertions
const PI28 = "3.1415926535897932384626433832";
const PI_2 = "1.5707963267948966192313216916";
const PI_4 = "0.7853981633974483096156608458";
const SQRT_PI = "1.7724538509055160272981674833";
const SQRT_PI_2 = "0.8862269254527580136490837416";
const E_MINUS_1 = "1.7182818284590452353602874713";
const LN2 = "0.6931471805599453094172321214";
const PI_SQRT2_4 = "1.1107207345395915617539702475";
const E_STR = "2.7182818284590452353602874713";
const COSH_1_MINUS_1 = "0.5430806348152437784779056207";



describe('quad1', () => {
  beforeAll(async () => {
    await init();
  });

  // ==========================================
  // GROUP 1: Basic Polynomials (Finite Bounds)
  // ==========================================
  test('1. Integrates constant function', () => {
    const f = (x) => bf(5);
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  test('2. Integrates linear function: y = x', () => {
    const f = (x) => x;
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 0.5, 28);
  });

  test('3. Integrates quadratic function: y = x^2', () => {
    const f = (x) => x.mul(x);
    const res = quad(f, 0, 3);
    expectBFCloseTo(res, 9, 28);
  });

  test('4. Integrates cubic function: y = x^3', () => {
    const f = (x) => x.mul(x).mul(x);
    const res = quad(f, 0, 2);
    expectBFCloseTo(res, 4, 28);
  });

  test('5. Integrates quartic function: y = x^4', () => {
    const f = (x) => x.mul(x).mul(x).mul(x);
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, "0.2", 28);
  });

  // ==========================================
  // GROUP 2: Transcendental (Finite Bounds)
  // ==========================================
  test('6. Integrates sin(x) from 0 to PI', () => {
    const f = (x) => x.sin();
    const res = quad(f, 0, PI28);
    expectBFCloseTo(res, 2, 28);
  });

  test('7. Integrates cos(x) from 0 to PI/2', () => {
    const f = (x) => x.cos();
    const res = quad(f, 0, PI_2);
    expectBFCloseTo(res, 1, 28);
  });

  test('8. Integrates e^x from 0 to 1', () => {
    const f = (x) => x.exp();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, E_MINUS_1, 28);
  });

  test('9. Integrates 1/x from 1 to E', () => {
    const f = (x) => bf(1).div(x);
    const res = quad(f, 1, E_STR);
    expectBFCloseTo(res, 1, 28);
  });

  test('10. Integrates sinh(x) from 0 to 1', () => {
    const f = (x) => x.sinh();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, COSH_1_MINUS_1, 28);
  });

  // ==========================================
  // GROUP 3: Rational & Fractional (Finite Bounds)
  // ==========================================
  test('11. Integrates 1/(1+x^2) from 0 to 1 (arctan)', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, PI_4, 28);
  });

  test('12. Integrates 1/(1+x) from 0 to 1 (ln 2)', () => {
    const f = (x) => bf(1).div(bf(1).add(x));
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, LN2, 28);
  });

  test('13. Integrates x*ln(x) from 0 to 1', () => {
    const f = (x) => x.mul(x.log());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, -0.25, 28);
  });

  test('14. Integrates sqrt(x) from 0 to 1', () => {
    const f = (x) => x.sqrt();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, bf(2).div(3), 28);
  });

  test('15. Integrates x^2(1-x^2) from -1 to 1', () => {
    const f = (x) => x.mul(x).mul(bf(1).sub(x.mul(x)));
    const res = quad(f, -1, 1);
    expectBFCloseTo(res, bf(4).div(15), 28); // 2 * (1/3 - 1/5) = 4/15 = 0.2666...
  });

  // ==========================================
  // GROUP 4: Endpoint Singularities
  // ==========================================
  test('16. Integrates 1/sqrt(x) from 0 to 1 (Singularity at x=0)', () => {
    const f = (x) => bf(1).div(x.sqrt());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 2, 25);
  });

  test('17. Integrates 1/sqrt(1-x^2) from -1 to 1 (Double Singularity)', () => {
    const f = (x) => bf(1).div(bf(1).sub(x.mul(x)).sqrt());
    const res = quad(f, -1, 1, { max_step: 20 });
    expectBFCloseTo(res, PI28, 20);
  });

  test('18. Integrates sqrt(1-x^2) from -1 to 1 (Semi-circle Area)', () => {
    const f = (x) => bf(1).sub(x.mul(x)).sqrt();
    const res = quad(f, -1, 1);
    expectBFCloseTo(res, PI_2, 25);
  });

  test('19. Integrates ln(x) from 0 to 1 (Singularity at x=0)', () => {
    const f = (x) => x.log();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, -1, 28);
  });

  test('20. Integrates ln(x)/sqrt(x) from 0 to 1', () => {
    const f = (x) => x.log().div(x.sqrt());
    const res = quad(f, 0, 1, { max_step: 18 });
    expectBFCloseTo(res, -4, 25);
  });

  // ==========================================
  // GROUP 5: Half-Infinite Bounds
  // ==========================================
  test('21. Integrates e^-x from 0 to +Infinity', () => {
    const f = (x) => x.neg().exp();
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, 1, 25);
  });

  test('22. Integrates x*e^-x from 0 to +Infinity (Gamma(2))', () => {
    const f = (x) => x.mul(x.neg().exp());
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, 1, 25);
  });

  test('23. Integrates 1/(1+x^2) from 0 to +Infinity', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, PI_2, 25);
  });

  test('24. Integrates e^x from -Infinity to 0', () => {
    const f = (x) => x.exp();
    const res = quad(f, '-Infinity', 0);
    expectBFCloseTo(res, 1, 25);
  });

  test('25. Integrates 1/(1+x^2) from -Infinity to 0', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, '-Infinity', 0);
    expectBFCloseTo(res, PI_2, 25);
  });

  // ==========================================
  // GROUP 6: Fully Infinite Bounds
  // ==========================================
  test('26. Integrates e^(-x^2) from -Infinity to +Infinity', () => {
    const f = (x) => x.mul(x).neg().exp();
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, SQRT_PI, 25);
  });

  test('27. Integrates 1/(1+x^2) from -Infinity to +Infinity', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, PI28, 25);
  });

  test('28. Integrates x*e^(-x^2) from -Infinity to +Infinity (Odd Function)', () => {
    const f = (x) => x.mul(x.mul(x).neg().exp());
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, 0, 25);
  });

  test('29. ', () => {
    const f = (x) => bfjs.exp(x.pow(2).neg());
    const res = quad(f, '-Infinity', 'Infinity').pow(2);
    expectBFCloseTo(res, bfjs.PI, 70);
  });
});




describe('quad3', () => {
  let PI_val;

  beforeAll(async () => {
    await init();
    // Safely retrieve BigFloat PI value
    PI_val = typeof bfjs.PI === 'function' ? bfjs.PI() : bfjs.PI;
  });

  // --------------------------------------------------------------------------
  // 1-10: Basic Polynomials and standard functions, finite bounds
  // --------------------------------------------------------------------------
  test('1. Integrates constant function', () => {
    const f = (x) => bf(5);
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  test('2. Integrates x from 0 to 1', () => {
    const f = (x) => x;
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 0.5, 28);
  });

  test('3. Integrates x^2 from 0 to 1', () => {
    const f = (x) => x.mul(x);
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, "0.333333333333333333333333333333", 28);
  });

  test('4. Integrates x^3 from 0 to 2', () => {
    const f = (x) => x.mul(x).mul(x);
    const res = quad(f, 0, 2);
    expectBFCloseTo(res, 4, 28);
  });

  test('5. Integrates 1/x from 1 to 2 -> ln(2)', () => {
    const f = (x) => bf(1).div(x);
    const res = quad(f, 1, 2);
    expectBFCloseTo(res, bf(2).log(), 28);
  });

  test('6. Integrates e^x from 0 to 1 -> e - 1', () => {
    const f = (x) => x.exp();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, bf(1).exp().sub(1), 28);
  });

  test('7. Integrates sin(x) from 0 to PI -> 2', () => {
    const f = (x) => x.sin();
    const res = quad(f, 0, PI_val);
    expectBFCloseTo(res, 2, 28);
  });

  test('8. Integrates cos(x) from 0 to PI/2 -> 1', () => {
    const f = (x) => x.cos();
    const res = quad(f, 0, PI_val.div(2));
    expectBFCloseTo(res, 1, 28);
  });

  test('9. Integrates 1/(1+x^2) from 0 to 1 -> PI/4', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, PI_val.div(4), 28);
  });

  test('10. Integrates sqrt(x) from 0 to 1 -> 2/3', () => {
    const f = (x) => x.sqrt();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, "0.666666666666666666666666666667", 28);
  });

  // --------------------------------------------------------------------------
  // 11-20: Trigonometric and Exponential functions
  // --------------------------------------------------------------------------
  test('11. Integrates sin(x)^2 from 0 to PI -> PI/2', () => {
    const f = (x) => x.sin().mul(x.sin());
    const res = quad(f, 0, PI_val);
    expectBFCloseTo(res, PI_val.div(2), 28);
  });

  test('12. Integrates x * sin(x) from 0 to PI -> PI', () => {
    const f = (x) => x.mul(x.sin());
    const res = quad(f, 0, PI_val);
    expectBFCloseTo(res, PI_val, 28);
  });

  test('13. Integrates e^(-x) from 0 to 10', () => {
    const f = (x) => x.neg().exp();
    const res = quad(f, 0, 10);
    expectBFCloseTo(res, bf(1).sub(bf(-10).exp()), 28);
  });

  test('14. Integrates ln(x) from 1 to e -> 1', () => {
    const f = (x) => x.log();
    const res = quad(f, 1, bf(1).exp());
    expectBFCloseTo(res, 1, 28);
  });

  test('15. Integrates 1/(x^2 + 1) from -1 to 1 -> PI/2', () => {
    const f = (x) => bf(1).div(x.mul(x).add(1));
    const res = quad(f, -1, 1);
    expectBFCloseTo(res, PI_val.div(2), 28);
  });

  test('16. Integrates cosh(x) from 0 to 1 -> sinh(1)', () => {
    const f = (x) => x.cosh();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, bf(1).sinh(), 28);
  });

  test('17. Integrates sinh(x) from 0 to 1 -> cosh(1) - 1', () => {
    const f = (x) => x.sinh();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, bf(1).cosh().sub(1), 28);
  });

  test('18. Integrates x * e^x from 0 to 1 -> 1', () => {
    const f = (x) => x.mul(x.exp());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 1, 28);
  });

  test('19. Integrates tan(x) from 0 to PI/4 -> 0.5 * ln(2)', () => {
    const f = (x) => x.tan();
    const res = quad(f, 0, PI_val.div(4));
    expectBFCloseTo(res, bf(2).log().mul(0.5), 28);
  });

  test('20. Integrates 1/cos(x)^2 from 0 to PI/4 -> 1', () => {
    const f = (x) => bf(1).div(x.cos().mul(x.cos()));
    const res = quad(f, 0, PI_val.div(4));
    expectBFCloseTo(res, 1, 28);
  });

  // --------------------------------------------------------------------------
  // 21-30: Infinite bounds (Half and Fully Infinite)
  // --------------------------------------------------------------------------
  test('21. Integrates e^(-x) from 0 to Infinity -> 1', () => {
    const f = (x) => x.neg().exp();
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, 1, 28);
  });

  test('22. Integrates e^(-x) from 1 to Infinity -> 1/e', () => {
    const f = (x) => x.neg().exp();
    const res = quad(f, 1, 'Infinity');
    expectBFCloseTo(res, bf(-1).exp(), 28);
  });

  test('23. Integrates 1/x^2 from 1 to Infinity -> 1', () => {
    const f = (x) => bf(1).div(x.mul(x));
    const res = quad(f, 1, 'Infinity');
    expectBFCloseTo(res, 1, 28);
  });

  test('24. Integrates 1/(1+x^2) from 0 to Infinity -> PI/2', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, PI_val.div(2), 28);
  });

  test('25. Integrates 1/(1+x^2) from -Infinity to Infinity -> PI', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, PI_val, 28);
  });

  test('26. Integrates e^(-x^2) from -Infinity to Infinity -> sqrt(PI)', () => {
    const f = (x) => x.mul(x).neg().exp();
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, PI_val.sqrt(), 28);
  });

  test('27. Integrates x * e^(-x^2) from 0 to Infinity -> 0.5', () => {
    const f = (x) => x.mul(x.mul(x).neg().exp());
    const res = quad(f, 0, 'Infinity');
    expectBFCloseTo(res, 0.5, 28);
  });

  test('28. Integrates e^x from -Infinity to 0 -> 1', () => {
    const f = (x) => x.exp();
    const res = quad(f, '-Infinity', 0);
    expectBFCloseTo(res, 1, 28);
  });

  test('29. Integrates 1/(x^2+4) from -Infinity to Infinity -> PI/2', () => {
    const f = (x) => bf(1).div(x.mul(x).add(4));
    const res = quad(f, '-Infinity', 'Infinity');
    expectBFCloseTo(res, PI_val.div(2), 28);
  });

  test('30. Integrates 1/x^3 from 1 to Infinity -> 0.5', () => {
    const f = (x) => bf(1).div(x.mul(x).mul(x));
    const res = quad(f, 1, 'Infinity');
    expectBFCloseTo(res, 0.5, 28);
  });

  // --------------------------------------------------------------------------
  // 31-40: Complex bounds and Contour integration Arrays
  // --------------------------------------------------------------------------
  test('31. Complex bounds: y = z from 0 to i -> -0.5', () => {
    const f = (z) => z;
    const res = quad(f, 0, 'i');
    expectBFCloseTo(res.re, -0.5, 28);
    expectBFCloseTo(res.im, 0, 28);
  });

  test('32. Complex bounds: y = z^2 from 0 to i -> -i/3', () => {
    const f = (z) => z.mul(z);
    const res = quad(f, 0, 'i');
    expectBFCloseTo(res.re, 0, 28);
    expectBFCloseTo(res.im, "-0.333333333333333333333333333333", 28);
  });

  test('33. Complex bounds: y = e^z from 0 to i -> e^i - 1', () => {
    const f = (z) => z.exp();
    const res = quad(f, 0, 'i');
    const expected_re = bf(1).cos().sub(1);
    const expected_im = bf(1).sin();
    expectBFCloseTo(res.re, expected_re, 28);
    expectBFCloseTo(res.im, expected_im, 28);
  });

  test('34. Contour array: y = z, [0, 1, 2] -> 2', () => {
    const f = (z) => z;
    const res = quad(f,[0, 1, 2]);
    expectBFCloseTo(res, 2, 28);
  });

  test('35. Contour array: y = z^2,[0, 1, 2] -> 8/3', () => {
    const f = (z) => z.mul(z);
    const res = quad(f, [0, 1, 2]);
    expectBFCloseTo(res, "2.666666666666666666666666666667", 28);
  });

  test('36. Contour array: y = e^z, [0, i, 1+i] -> e^(1+i) - 1', () => {
    const f = (z) => z.exp();
    const res = quad(f, [0, 'i', '1+i']);
    const e1 = bf(1).exp();
    const expected_re = e1.mul(bf(1).cos()).sub(1);
    const expected_im = e1.mul(bf(1).sin());
    expectBFCloseTo(res.re, expected_re, 28);
    expectBFCloseTo(res.im, expected_im, 28);
  });

  test('37. Contour array: closed loop y = 1,[0, 1, 1+i, i, 0] -> 0', () => {
    const f = (z) => complex(1);
    const res = quad(f,[0, 1, '1+i', 'i', 0]);
    expectBFCloseTo(res.re, 0, 28);
    expectBFCloseTo(res.im, 0, 28);
  });

  test('38. Contour array: Cauchy integral theorem y = z,[0, 1, 1+i, i, 0] -> 0', () => {
    const f = (z) => z;
    const res = quad(f, [0, 1, '1+i', 'i', 0]);
    expectBFCloseTo(res.re, 0, 28);
    expectBFCloseTo(res.im, 0, 28);
  });

  test('39. Complex bound: y = 1/z from 1 to i -> i*PI/2', () => {
    const f = (z) => complex(1).div(z);
    const res = quad(f, 1, 'i');
    expectBFCloseTo(res.re, 0, 28);
    expectBFCloseTo(res.im, PI_val.div(2), 28);
  });

  test('40. Contour array: Cauchy formula y = 1/z square avoiding origin[1-i, 1+i, -1+i, -1-i, 1-i] -> 2*PI*i', () => {
    const f = (z) => complex(1).div(z);
    const res = quad(f,['1-i', '1+i', '-1+i', '-1-i', '1-i']);
    expectBFCloseTo(res.re, 0, 28);
    expectBFCloseTo(res.im, PI_val.mul(2), 28);
  });

  // --------------------------------------------------------------------------
  // 41-45: Singularity handling
  // --------------------------------------------------------------------------
  test('41. Singularity at 0: y = 1/sqrt(x) from 0 to 1 -> 2', () => {
    const f = (x) => bf(1).div(x.sqrt());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, 2, 28);
  });

  test('42. Singularity at 0: y = ln(x) from 0 to 1 -> -1', () => {
    const f = (x) => x.log();
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, -1, 28);
  });

  test('43. Singularity at 1: y = 1/sqrt(1-x^2) from 0 to 1 -> PI/2', () => {
    const f = (x) => bf(1).div(bf(1).sub(x.mul(x)).sqrt());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, PI_val.div(2), 28);
  });

  test('44. Singularity at both bounds: y = 1/sqrt(x(1-x)) from 0 to 1 -> PI', () => {
    const f = (x) => bf(1).div(x.mul(bf(1).sub(x)).sqrt());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, PI_val, 28);
  });

  test('45. Singularity at 0: y = x^(-0.5) * ln(x) from 0 to 1 -> -4', () => {
    const f = (x) => x.log().div(x.sqrt());
    const res = quad(f, 0, 1);
    expectBFCloseTo(res, -4, 28);
  });

  // --------------------------------------------------------------------------
  // 46-50: API features, robust bounds swapping, and info callback behavior
  // --------------------------------------------------------------------------
  test('46. Direction swap: y = x from 1 to 0 -> -0.5', () => {
    const f = (x) => x;
    const res = quad(f, 1, 0);
    expectBFCloseTo(res, -0.5, 28);
  });

  test('47. Infinity direction swap: y = e^(-x) from Infinity to 0 -> -1', () => {
    const f = (x) => x.neg().exp();
    const res = quad(f, 'Infinity', 0);
    expectBFCloseTo(res, -1, 28);
  });

  test('48. Both Infinity swapped: y = 1/(1+x^2) from Infinity to -Infinity -> -PI', () => {
    const f = (x) => bf(1).div(bf(1).add(x.mul(x)));
    const res = quad(f, 'Infinity', '-Infinity');
    expectBFCloseTo(res, PI_val.neg(), 28);
  });

  test('49. Identical infinite bounds: y = e^(-x^2) from Infinity to Infinity -> 0', () => {
    const f = (x) => x.mul(x).neg().exp();
    const res = quad(f, 'Infinity', 'Infinity');
    expectBFCloseTo(res, 0, 28);
  });

  test('50. Callback and info object updates correctly', () => {
    const f = (x) => x;
    const info = { max_step: 6 };
    let cbCount = 0;
    
    info.cb = () => { cbCount++; };
    const res = quad(f, 0, 1, info);
    
    expectBFCloseTo(res, 0.5, 28);
    expect(cbCount).toBeGreaterThan(0);
    expect(info.steps).toBeGreaterThan(0);
    expect(info.error).toBeDefined();
    expect(info.rerror).toBeDefined();
    expect(info.exectime).toBeGreaterThanOrEqual(0);
  });
});