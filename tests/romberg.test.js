const {init,expectBFCloseTo,evalPoly}=require("./testhelper.js");
const { bf, romberg } =bfjs=  require('../dist/bf.cjs');



describe('helper.romberg', () => {
  beforeAll(async () => {
    await init();
  });
  // 1. Constant function: y = 5
  test('1. Integrates constant function', () => {
    const f = (x) => bf(5);
    const res = romberg(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 2. Linear: y = x, integral = 0.5 * x^2
  test('2. Integrates x from 0 to 1', () => {
    const f = (x) => x;
    const res = romberg(f, 0, 1);
    expectBFCloseTo(res, 0.5, 28);
  });

  // 3. Parabola: y = 3x^2, integral = x^3
  test('3. Integrates 3x^2 from 0 to 2 (result 8)', () => {
    const f = (x) => x.pow(2).mul(3);
    const res = romberg(f, 0, 2);
    expectBFCloseTo(res, 8, 25);
  });

  // 4. Exponential: e^x, integral = e^x
  test('4. Integrates e^x from 0 to 1 (result e - 1)', () => {
    const f = (x) => x.exp();
    const res = romberg(f, 0, 1);
    const expected = bf(1).exp().sub(1);
    expectBFCloseTo(res, expected, 25);
  });

  // 5. Trigonometric: sin(x) from 0 to PI (result 2)
  test('5. Integrates sin(x) from 0 to PI', () => {
    const f = (x) => x.sin();
    const res = romberg(f, 0, bf(-1).acos()); // PI
    expectBFCloseTo(res, 2, 25);
  });

  // 6. Rational: 4/(1+x^2) from 0 to 1 (result PI)
  test('6. Integrates 4/(1+x^2) to compute PI', () => {
    const f = (x) => bf(4).div(x.pow(2).add(1));
    const res = romberg(f, 0, 1);
    expectBFCloseTo(res, bf(-1).acos(), 25);
  });

  // 7. Symmetric interval odd function: x^3 from -1 to 1 (result 0)
  test('7. Integrates odd function over symmetric interval', () => {
    const f = (x) => x.pow(3);
    const res = romberg(f, -1, 1);
    expectBFCloseTo(res, 0, 25);
  });

  // 8. Negative range
  test('8. Integrates on negative interval [-5, -2]', () => {
    const f = (x) => x.mul(2); // 2x -> x^2
    const res = romberg(f, -5, -2);
    // (-2)^2 - (-5)^2 = 4 - 25 = -21
    expectBFCloseTo(res, -21, 25);
  });

  // 9. 1/sqrt(x) - Approach singularity (0.01 to 1)
  test('9. Integrates near singularity 1/sqrt(x)', () => {
    const f = (x) => bf(1).div(x.sqrt());
    // int 0.01 to 1 of x^-0.5 = [2x^0.5] = 2(1) - 2(0.1) = 1.8
    const res = romberg(f, "0.01", "1");
    expectBFCloseTo(res, "1.8", 25);
  });

  // 10. High precision configuration
  test('10. Respects max_acc and high precision', () => {
    const info = { max_acc: 20, _e:1e-40,_re:1e-40};
    const f = (x) => x.cos();
    // Int cos = sin. sin(PI/2) = 1.
    const res = romberg(f, 0, bf(-1).acos().div(2), info);
    expectBFCloseTo(res, 1, 35);
    expect(info.steps).toBeGreaterThan(2);
  });
});



// Helper to create BigFloat from string/number
const B = (v) => bf(v);

describe('romberg1', () => {
  
  beforeAll(async () => {
    await init();
  });

  // --- Basic Polynomials ---

  // 1. Constant function: f(x) = 5
  // Int(5, 0..10) = 50
  test('1. Integrates constant function f(x) = 5', () => {
    const f = (x) => B(5);
    const res = romberg(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 2. Linear function: f(x) = x
  // Int(x, 0..10) = 0.5 * 10^2 = 50
  test('2. Integrates linear function f(x) = x', () => {
    const f = (x) => x;
    const res = romberg(f, 0, 10);
    expectBFCloseTo(res, 50, 28);
  });

  // 3. Quadratic function: f(x) = x^2
  // Int(x^2, 0..1) = 1/3
  test('3. Integrates quadratic function f(x) = x^2', () => {
    const f = (x) => x.pow(2);
    const res = romberg(f, 0, 1);
    expectBFCloseTo(res, B(1).div(B(3)), 28);
  });

  // 4. Cubic function: f(x) = x^3
  // Int(x^3, 0..1) = 0.25
  test('4. Integrates cubic function f(x) = x^3', () => {
    const f = (x) => x.pow(3);
    const res = romberg(f, 0, 1);
    expectBFCloseTo(res, 0.25, 28);
  });

  // --- Transcendental Functions ---

  // 5. Exponential function: f(x) = e^x
  // Int(e^x, 0..1) = e^1 - e^0 = e - 1
  test('5. Integrates exponential function f(x) = e^x', () => {
    const f = (x) => x.exp();
    const res = romberg(f, 0, 1);
    const expected = B(1).exp().sub(B(1));
    expectBFCloseTo(res, expected, 25);
  });

  // 6. Natural Logarithm via Inverse: f(x) = 1/x
  // Int(1/x, 1..e) = ln(e) - ln(1) = 1
  test('6. Integrates 1/x to calculate ln(e)', () => {
    const f = (x) => B(1).div(x);
    const e = B(1).exp();
    const res = romberg(f, 1, e);
    expectBFCloseTo(res, 1, 25);
  });

  // 7. Sine function: f(x) = sin(x)
  // Int(sin(x), 0..PI) = -cos(PI) - (-cos(0)) = 1 + 1 = 2
  test('7. Integrates sin(x) over [0, PI]', () => {
    const f = (x) => x.sin();
    const pi = B(-1).acos(); // Generate PI
    const res = romberg(f, 0, pi);
    expectBFCloseTo(res, 2, 25);
  });

  // 8. Cosine function: f(x) = cos(x)
  // Int(cos(x), 0..PI/2) = sin(PI/2) - sin(0) = 1
  test('8. Integrates cos(x) over [0, PI/2]', () => {
    const f = (x) => x.cos();
    const halfPi = B(0).acos(); // PI/2
    const res = romberg(f, 0, halfPi);
    expectBFCloseTo(res, 1, 25);
  });

  // --- Advanced Math / Constants ---

  // 9. Calculating Pi: f(x) = 4 / (1 + x^2)
  // Int(4/(1+x^2), 0..1) = 4 * atan(1) = 4 * (PI/4) = PI
  test('9. Calculates PI using f(x) = 4/(1+x^2)', () => {
    const f = (x) => B(4).div(B(1).add(x.pow(2)));
    const res = romberg(f, 0, 1);
    const pi = B(-1).acos();
    expectBFCloseTo(res, pi, 25);
  });

  // 10. Integration by parts check: f(x) = x * e^x
  // Int(x*e^x) = (x-1)e^x. Eval at 0..1 => 0 - (-1) = 1
  test('10. Integrates f(x) = x * e^x', () => {
    const f = (x) => x.mul(x.exp());
    const res = romberg(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  // --- Interval & Symmetry Tests ---

  // 11. Zero width interval
  // Int(f, a..a) = 0
  test('11. Returns zero for zero-width interval [2, 2]', () => {
    const f = (x) => x.pow(2);
    const res = romberg(f, 2, 2);
    expectBFCloseTo(res, 0, 30);
  });

  // 12. Reversed limits
  // Int(x^2, 1..0) = - Int(x^2, 0..1) = -1/3
  test('12. Handles reversed limits (b < a)', () => {
    const f = (x) => x.pow(2);
    const res = romberg(f, 1, 0);
    const expected = B(-1).div(B(3));
    expectBFCloseTo(res, expected, 28);
  });

  // 13. Odd function symmetry
  // Int(sin(x), -1..1) = 0 (approx, due to precision noise, but should be extremely close)
  test('13. Symmetric interval for odd function (sin) should be ~0', () => {
    const f = (x) => x.sin();
    // Using a range like [-1, 1]
    const res = romberg(f, -1, 1);
    // Absolute error check roughly close to 0
    expectBFCloseTo(res, 0, 28);
  });

  // 14. Even function symmetry
  // Int(x^2, -1..1) = 2/3
  test('14. Symmetric interval for even function (x^2)', () => {
    const f = (x) => x.pow(2);
    const res = romberg(f, -1, 1);
    const expected = B(2).div(B(3));
    expectBFCloseTo(res, expected, 28);
  });

  // --- Higher Precision / Complexity ---

  // 15. Higher power polynomial
  // Int(x^10, 0..1) = 1/11
  test('15. Integrates high order polynomial f(x) = x^10', () => {
    const f = (x) => x.pow(10);
    const res = romberg(f, 0, 1);
    const expected = B(1).div(B(11));
    expectBFCloseTo(res, expected, 25);
  });

  // 16. Sqrt function
  // Int(sqrt(x), 0..4) = [2/3 x^(3/2)] = 2/3 * 8 = 16/3
  test('16. Integrates square root f(x) = sqrt(x)', () => {
    const f = (x) => x.sqrt();
    let info={_e:1e-8};
    const res = romberg(f, 0, 4,info);
    const expected = B(16).div(B(3));
    expectBFCloseTo(res, expected, 7);
  });

  // 17. Rational function
  // Int(x / (x+1), 0..2) = Int(1 - 1/(x+1)) = [x - ln(x+1)] = (2 - ln3) - (0)
  test('17. Integrates rational function f(x) = x / (x+1)', () => {
    const f = (x) => x.div(x.add(1));
    const res = romberg(f, 0, 2);
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
    const res = romberg(f, 0, 1, info);
    // Result should still be decent, but we check if info object is populated
    expectBFCloseTo(res, B(1).exp().sub(1), 5);
    // Ensure it didn't take too many steps for this loose tolerance
    if(info.steps) {
        // Romberg converges fast, but 1e-5 should be fewer steps than default 1e-30
        // This is just a sanity check that it runs.
        expect(info.steps).toBeGreaterThan(0);
    }
  });


  // 20. Info Object Population
  // Verify that the info object contains execution statistics
  test('20. Populates the info object with stats', () => {
    const f = (x) => x.pow(2);
    const info = {};
    romberg(f, 0, 1, info);
    
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