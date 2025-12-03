const {init,expectBFCloseTo,evalPoly}=require("./testhelper.js");
const { bf,roots, Complex } =  require('../dist/bf.cjs');



describe('module.helper.roots', () => {
  beforeAll(async () => {
    await init();
  });

  // Helper to check if array contains a root (approx)
  const hasRoot = (results, expectedRe, expectedIm) => {
    return results.some(r => {
      const diffRe = r.re.sub(bf(expectedRe)).abs();
      const diffIm = r.im.sub(bf(expectedIm)).abs();
      return diffRe.cmp(1e-15) < 0 && diffIm.cmp(1e-15) < 0;
    });
  };

  // 1. Simple: x^2 - 1 = 0
  test('1. Solves x^2 - 1 = 0 (Roots: 1, -1)', () => {
    const res = roots([1, 0, -1]);
    expect(res.length).toBe(2);
    expect(hasRoot(res, 1, 0)).toBe(true);
    expect(hasRoot(res, -1, 0)).toBe(true);
  });

  // 2. Simple Complex: x^2 + 1 = 0
  test('2. Solves x^2 + 1 = 0 (Roots: i, -i)', () => {
    const res = roots([1, 0, 1]);
    expect(hasRoot(res, 0, 1)).toBe(true);
    expect(hasRoot(res, 0, -1)).toBe(true);
  });

  // 3. Known Integer Roots: (x-2)(x-3) = x^2 - 5x + 6
  test('3. Solves x^2 - 5x + 6 = 0 (Roots: 2, 3)', () => {
    const res = roots([1, -5, 6]);
    expect(hasRoot(res, 2, 0)).toBe(true);
    expect(hasRoot(res, 3, 0)).toBe(true);
  });

  // 4. Roots of Unity: x^3 - 1 = 0
  test('4. Solves cube roots of unity', () => {
    const res = roots([1, 0, 0, -1]);
    // 1, -0.5 + 0.866i, -0.5 - 0.866i
    expect(hasRoot(res, 1, 0)).toBe(true);
    expect(hasRoot(res, -0.5, Math.sqrt(3)/2)).toBe(true);
  });

  // 5. Higher Degree: x^5 - 32 = 0
  test('5. Solves x^5 - 32 = 0', () => {
    const res = roots([1, 0, 0, 0, 0, -32]);
    expect(res.length).toBe(5);
    // Should find Real root 2
    expect(hasRoot(res, 2, 0)).toBe(true);
  });

  // 6. Leading Coeff != 1: 2x^2 - 8 = 0
  test('6. Handles non-monic polynomial 2x^2 - 8 = 0', () => {
    const res = roots([2, 0, -8]); // x^2 - 4 = 0 -> +/- 2
    expect(hasRoot(res, 2, 0)).toBe(true);
    expect(hasRoot(res, -2, 0)).toBe(true);
  });

  // 7. Linear Equation: 5x - 10 = 0
  test('7. Solves linear equation 5x - 10 = 0', () => {
    const res = roots([5, -10]);
    expect(res.length).toBe(1);
    expect(hasRoot(res, 2, 0)).toBe(true);
  });

  // 8. Complex Coefficients: x^2 - i = 0
  test('8. Handles complex coefficients', () => {
    // x^2 - i = 0. Roots are +/- (1+i)/sqrt(2)
    // 1/sqrt(2) approx 0.7071
    const res = roots([1, 0, new Complex(0, -1)]);
    const val = 1 / Math.sqrt(2);
    expect(hasRoot(res, val, val)).toBe(true);
  });

  // 9. Zeroes inside coeffs: x^4 + x^2 = 0 -> x^2(x^2+1)
  test('9. Handles multiple zero roots (x^4 + x^2 = 0)', () => {
    const res = roots([1, 0, 1, 0, 0]);
    // Roots: 0, 0, i, -i
    // Note: Iterative methods might return 1e-30 instead of 0
    expect(hasRoot(res, 0, 0)).toBe(true); 
    expect(hasRoot(res, 0, 1)).toBe(true);
  });

  // 10. Large Coefficients
  test('10. Solves with large scale coefficients', () => {
    // x^2 - 1000000 = 0 -> +/- 1000
    const res = roots([1, 0, -1000000]);
    expect(hasRoot(res, 1000, 0)).toBe(true);
  });
});