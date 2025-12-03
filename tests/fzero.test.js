const {init,expectBFCloseTo,evalPoly}=require("./testhelper.js");
const { bf, fzero } =  require('../dist/bf.cjs');




describe('module.helper.fzero', () => {
  beforeAll(async () => {
    await init();
  });


  // 1. Basic Square Root: x^2 - 2 = 0
  test('1. Finds sqrt(2) correctly', () => {
    const f = (x) => x.mul(x).sub(bf(2));
    const result = fzero(f, 1, 2);
    expectBFCloseTo(result, bf(2).sqrt(), 25);
  });

  // 2. Cubic function: x^3 - x - 2 = 0 (Real root approx 1.521)
  test('2. Finds real root of cubic function', () => {
    const f = (x) => x.pow(3).sub(x).sub(bf(2));
    const result = fzero(f, 1, 2);
    // 1.5213797068045675696...
    const check = result.pow(3).sub(result).sub(bf(2));
    expectBFCloseTo(check, 0, 25);
  });

  // 3. Trigonometric: sin(x) = 0 near Pi
  test('3. Finds PI using sin(x)', () => {
    const f = (x) => x.sin();
    const result = fzero(f, 3, 4);
    expectBFCloseTo(result, bf(-1).acos(), 25); // PI
  });

  // 4. Transcendental: cos(x) - x = 0 (Dottie number)
  test('4. Finds Dottie number (cos(x) = x)', () => {
    const f = (x) => x.cos().sub(x);
    const result = fzero(f, 0, 1);
    const check = result.cos().sub(result);
    expectBFCloseTo(check, 0, 25);
  });

  // 5. Exponential: e^x - 3 = 0 (ln 3)
  test('5. Finds natural log of 3', () => {
    const f = (x) => x.exp().sub(bf(3));
    const result = fzero(f, 0, 2);
    expectBFCloseTo(result, bf(3).log(), 25);
  });

  // 6. High steepness: x^10 - 100 = 0
  test('6. Handles steep gradients (x^10 = 100)', () => {
    const f = (x) => x.pow(10).sub(bf(100));
    const result = fzero(f, 1, 2);
    expectBFCloseTo(result.pow(10), 100, 20);
  });

  // 7. Negative interval: (x+5)^3 = 0
  test('7. Finds negative roots correctly', () => {
    const f = (x) => x.add(5).pow(3);
    const result = fzero(f, -6, -4);
    expectBFCloseTo(result, -5, 25);
  });

  // 8. Very small interval
  test('8. Works with tight initial bounds', () => {
    const f = (x) => x.mul(x).sub(bf(4));
    const result = fzero(f, 1.99, 2.01);
    expectBFCloseTo(result, 2, 25);
  });

  // 9. Linear function
  test('9. Solves simple linear equation 2x - 4 = 0', () => {
    const f = (x) => x.mul(2).sub(4);
    const result = fzero(f, -10, 10);
    expectBFCloseTo(result, 2, 28);
  });

  // 10. Info object check
  test('10. Populates info object correctly', () => {
    const info = {_e:1e-20, _re:1e-20};
    const f = (x) => x.mul(x).sub(2);
    fzero(f, 1, 2, info);
    expect(info.result).toBeDefined();
    expect(info.steps).toBeGreaterThan(0);
    expect(info.eff_decimal_precision).toBeGreaterThan(18);
  });
});
