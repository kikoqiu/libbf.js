
const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, fminbnd } = bfjs = require('../dist/bf.cjs');

describe('module.helper.fminbnd', () => {
  beforeAll(async () => {
    await init();
  });

  // --- Group 1: Basic Quadratic Functions (Parabolas) ---

  test('1. Simple parabola: (x-2)^2 should have min at x=2', () => {
    // f(x) = (x - 2)^2
    const f = (x) => x.sub(bf(2)).pow(2);
    // Search in [0, 5]
    const result = fminbnd(f, 0, 5);
    expectBFCloseTo(result, bf(2), 25);
  });

  test('2. Parabola at origin with offset: x^2 + 5 should have min at x=0', () => {
    const f = (x) => x.mul(x).add(bf(5));
    // Search in [-1, 1]
    const result = fminbnd(f, -1, 1);
    expectBFCloseTo(result, bf(0), 25);
  });

  test('3. Large number offset: (x - 1000)^2', () => {
    const f = (x) => x.sub(bf(1000)).pow(2);
    const result = fminbnd(f, 0, 2000);
    expectBFCloseTo(result, bf(1000), 20);
  });

  // --- Group 2: Trigonometric Functions ---

  test('4. Cosine function: cos(x) in [0, 2pi], min at pi', () => {
    // f(x) = cos(x)
    const f = (x) => x.cos();
    const result = fminbnd(f, 0, 6); // 6 < 2*pi
    expectBFCloseTo(result, bfjs.PI, 25);
  });

  test('5. Sine function: sin(x) in [4, 5], min at 3pi/2', () => {
    // 3pi/2 approx 4.712
    const f = (x) => x.sin();
    const target = bf(3).mul(bfjs.PI).div(bf(2));
    const result = fminbnd(f, 4, 5);
    expectBFCloseTo(result, target, 25);
  });

  // --- Group 3: Exponential and Logarithmic Functions ---

  test('6. Cosh function: (e^x + e^-x)/2, min at x=0', () => {
    // f(x) = cosh(x)
    const f = (x) => x.exp().add(x.neg().exp());
    const result = fminbnd(f, -1, 2);
    expectBFCloseTo(result, bf(0), 25);
  });

  test('7. x^x (x * ln(x) equivalent): min at 1/e', () => {
    // f(x) = x^x. Minimum is at x = 1/e approx 0.3678
    const f = (x) => x.pow(x);
    const target = bf(1).div(bfjs.E);
    const result = fminbnd(f, 0.1, 1); // Domain must be > 0
    expectBFCloseTo(result, target, 25);
  });

  // --- Group 4: Polynomials ---

  test('8. Quartic function: x^4 - x^2 (W-shape), local min at 1/sqrt(2)', () => {
    // Derivative: 4x^3 - 2x = 0 -> 2x(2x^2 - 1) = 0. Roots: 0, +/- 1/sqrt(2).
    // In range [0.1, 2], min is positive 1/sqrt(2).
    const f = (x) => x.pow(4).sub(x.pow(2));
    const target = bf(0.5).sqrt();
    const result = fminbnd(f, 0.1, 2);
    expectBFCloseTo(result, target, 25);
  });

  test('9. Cubic function on limited interval: x^3 - 3x, min at 1 for x>0', () => {
    // f'(x) = 3x^2 - 3. Roots +/- 1. Min at 1.
    const f = (x) => x.pow(3).sub(x.mul(bf(3)));
    const result = fminbnd(f, 0, 2);
    expectBFCloseTo(result, bf(1), 25);
  });

  // --- Group 5: Rational and Non-Smooth Functions ---

  test('10. Rational function: x + 1/x, min at x=1', () => {
    const f = (x) => x.add(bf(1).div(x));
    const result = fminbnd(f, 0.1, 5);
    expectBFCloseTo(result, bf(1), 25);
  });

  test('11. Absolute value (Non-differentiable at min): |x - 3|', () => {
    // Brent's method uses parabolic interpolation which assumes smoothness,
    // but it falls back to Golden Section which handles this fine.
    const f = (x) => x.sub(bf(3)).abs();
    const result = fminbnd(f, 0, 10);
    expectBFCloseTo(result, bf(3), 25);
  });

  // --- Group 6: Boundary and Asymmetric Interval Conditions ---

  test('12. Monotonic Increasing: f(x) = x, min at left boundary a', () => {
    const f = (x) => x;
    const result = fminbnd(f, 2, 5);
    expectBFCloseTo(result, bf(2), 25);
  });

  test('13. Monotonic Decreasing: f(x) = -x, min at right boundary b', () => {
    const f = (x) => x.neg();
    const result = fminbnd(f, -5, -2);
    expectBFCloseTo(result, bf(-2), 25);
  });

  test('14. Highly asymmetric interval: x^2 in [-0.01, 100]', () => {
    // Min is very close to left edge
    const f = (x) => x.mul(x);
    const result = fminbnd(f, -0.01, 100);
    expectBFCloseTo(result, bf(0), 25);
  });

  // --- Group 7: Challenging Numerical Cases ---

  test('15. Flat Valley: x^4 near 0', () => {
    // x^4 is very flat. High precision position is hard because f(0.001) is tiny.
    // We check if it gets reasonably close to 0.
    const f = (x) => x.pow(4);
    const result = fminbnd(f, -1, 1);
    // Tolerance might need to be slightly looser for position on flat functions
    // but with high precision BF, it should still be good.
    expectBFCloseTo(result, bf(0), 15); 
  });

  test('16. High order polynomial: (x-1.23456789)^2', () => {
    const target = bf("1.23456789123456789");
    const f = (x) => x.sub(target).pow(2);
    const result = fminbnd(f, 0, 3);
    expectBFCloseTo(result, target, 25);
  });

  // --- Group 8: Configuration Options (Tolerance, Info, Etc) ---

  test('17. Custom Tolerance (Loose): Stops earlier', () => {
    const f = (x) => x.sub(bf(5)).pow(2);
    const info = {_e: 1e-2,_re: 1e-2};
    // Use a very loose tolerance
    fminbnd(f, 0, 10, info);
    
    // Result should be approx 5, but precision is low
    // info.steps should be significantly lower than default high precision run
    expectBFCloseTo(info.result, bf(5), 2); 
    expect(info.steps).toBeLessThan(100); 
  });

  test('18. Custom Tolerance (Very Tight): 1e-50', () => {
    const f = (x) => x.sub(bf(2)).pow(2);
    const info = {_e:1e-50, _re:1e-50};
    // This requires the BF library to support sufficient precision bits
    fminbnd(f, 1, 3,  info);
    
    expectBFCloseTo(info.result, bf(2), 45);
    // Should populate the info object
    expect(info.eff_decimal_precision).toBeGreaterThan(45);
  });

  test('19. Info Object Population', () => {
    const f = (x) => x.mul(x); // x^2
    const info = {_e:1e-20, _re:1e-20};
    fminbnd(f, -1, 2,  info);

    expect(info).toHaveProperty('steps');
    expect(info).toHaveProperty('exectime');
    expect(info).toHaveProperty('min_value');
    expect(info.lastresult).toBeDefined();
    expect(typeof info.toString).toBe('function');
    
    // String output check
    const str = info.toString();
    expect(str).toContain('xmin=');
    expect(str).toContain('steps=');
  });

  test('20. Max Steps Limit', () => {
    const f = (x) => x.cos(); // Takes some steps to converge
    const info = { max_step: 2, _e:1e-30, _re:1e-30 }; // Force fail very early
    
    const result = fminbnd(f, 0, 6, info);
    
    // Should return null on failure (max steps reached without convergence)
    // *Note: Behavior depends on implementation. The previous fminbnd returns null on timeout/max_step.*
    expect(result).toBeNull();
    expect(info.steps).toBe(2);
  });

});