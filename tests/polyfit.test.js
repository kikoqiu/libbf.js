const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, polyfit } = bfjs = require('../dist/bf.cjs');

describe('helper.polyfit', () => {
  beforeAll(async () => {
    await init();
  });

  // --- 1.  (Exact Fits) ---

  test('1. Fits a horizontal line (Degree 0)', () => {
    // y = 5
    const x = [0, 1, 2, 3, 4];
    const y = [5, 5, 5, 5, 5];
    const coeffs = polyfit(x, y, 0);
    
    // Expected: [5]
    expect(coeffs.length).toBe(1);
    expectBFCloseTo(coeffs[0], 5, 25);
  });

  test('2. Fits a basic linear function (Degree 1)', () => {
    // y = 2x + 3
    const x = [0, 1, 2, 3];
    const y = [3, 5, 7, 9];
    const coeffs = polyfit(x, y, 1);
    
    // Expected: [2, 3] (2x + 3)
    expect(coeffs.length).toBe(2);
    expectBFCloseTo(coeffs[0], 2, 25); // Slope
    expectBFCloseTo(coeffs[1], 3, 25); // Intercept
  });

  test('3. Fits a standard quadratic function (Degree 2)', () => {
    // y = x^2
    const x = [-2, -1, 0, 1, 2];
    const y = [4, 1, 0, 1, 4];
    const coeffs = polyfit(x, y, 2);

    // Expected: [1, 0, 0] (1*x^2 + 0*x + 0)
    expect(coeffs.length).toBe(3);
    expectBFCloseTo(coeffs[0], 1, 25);
    expectBFCloseTo(coeffs[1], 0, 25);
    expectBFCloseTo(coeffs[2], 0, 25);
  });

  test('4. Fits a cubic function with negative coefficients (Degree 3)', () => {
    // y = -x^3 + 2x^2 + 5
    // x=0, y=5; x=1, y=6; x=2, y=5; x=-1, y=8
    const x = [0, 1, 2, -1];
    const y = [5, 6, 5, 8];
    const coeffs = polyfit(x, y, 3);

    // Expected: [-1, 2, 0, 5]
    expectBFCloseTo(coeffs[0], -1, 20);
    expectBFCloseTo(coeffs[1], 2, 20);
    expectBFCloseTo(coeffs[2], 0, 20);
    expectBFCloseTo(coeffs[3], 5, 20);
  });

  // --- 2.  (Least Squares Approximation) ---

  test('5. Least squares approximation for collinear points with noise', () => {
    // y ≈ x (Points: (0,0), (1,1.1), (2,1.9), (3,3))
    // Slope should be close to 1
    const x = [0, 1, 2, 3];
    const y = [0, 1.1, 1.9, 3.0];
    const info = {};
    const coeffs = polyfit(x, y, 1, info);

    expectBFCloseTo(coeffs[0], 1, 1); // Approx slope ~1.0
    expect(info.r_squared.cmp(0.95)).toBeGreaterThan(0); // R^2 should be high
  });

  test('6. Linear fit on clearly quadratic data (Underfitting)', () => {
    // Data follows y = x^2, but we force degree 1 fit
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 4, 9, 16];
    const info = {};
    const coeffs = polyfit(x, y, 1, info);

    // It will calculate a best fit line, but R^2 should not be perfect
    expect(info.r_squared.cmp(1)).toBeLessThan(0); 
    expect(info.ssr.cmp(0)).toBeGreaterThan(0); // Error exists
  });

  // --- 3.  (High Precision & Types) ---

  test('7. Handles string inputs for high precision', () => {
    // y = 2x, but using very precise string inputs
    const x = ["1.00000000000000000001", "2.00000000000000000001"];
    const y = ["2.00000000000000000002", "4.00000000000000000002"];
    const coeffs = polyfit(x, y, 1);

    expectBFCloseTo(coeffs[0], 2, 25);
    expectBFCloseTo(coeffs[1], 0, 25);
  });

  test('8. Handles BigFloat object inputs directly', () => {
    const x = [bf(1), bf(2), bf(3)];
    const y = [bf(2), bf(4), bf(6)];
    const coeffs = polyfit(x, y, 1);

    expectBFCloseTo(coeffs[0], 2, 28);
  });

  test('9. Large magnitude numbers', () => {
    // y = x + 10^20
    const largeNum = "100000000000000000000"; // 1e20
    const x = [0, 1, 2];
    const y = [largeNum, bf(largeNum).add(1), bf(largeNum).add(2)];
    const coeffs = polyfit(x, y, 1);

    expectBFCloseTo(coeffs[0], 1, 20);
    expectBFCloseTo(coeffs[1], largeNum, 15);
  });

  test('10. Small fractional numbers', () => {
    // y = 0.5x
    const x = [0.1, 0.2, 0.3];
    const y = [0.05, 0.10, 0.15];
    const coeffs = polyfit(x, y, 1);

    expectBFCloseTo(coeffs[0], 0.5, 20);
    expectBFCloseTo(coeffs[1], 0, 20);
  });

  // --- 4.  (Complex & Info) ---

  test('11. Returns correct R-squared = 1 for perfect fit', () => {
    const x = [1, 2, 3];
    const y = [2, 4, 6];
    const info = {};
    polyfit(x, y, 1, info);
    
    expectBFCloseTo(info.r_squared, 1, 20);
    expectBFCloseTo(info.ssr, 0, 20);
  });

  test('12. Polynomial with missing terms (y = x^4 + 1)', () => {
    // x^3, x^2, x terms are 0
    const x = [-2, -1, 0, 1, 2];
    const y = [17, 2, 1, 2, 17];
    const coeffs = polyfit(x, y, 4);

    expectBFCloseTo(coeffs[0], 1, 20); // x^4
    expectBFCloseTo(coeffs[1], 0, 20); // x^3
    expectBFCloseTo(coeffs[2], 0, 20); // x^2
    expectBFCloseTo(coeffs[3], 0, 20); // x
    expectBFCloseTo(coeffs[4], 1, 20); // Constant
  });

  test('13. Points not sorted by x', () => {
    // Order shouldn't matter for the math
    const x = [2, 0, 1];
    const y = [5, 1, 3]; // y = 2x + 1
    const coeffs = polyfit(x, y, 1);

    expectBFCloseTo(coeffs[0], 2, 25);
    expectBFCloseTo(coeffs[1], 1, 25);
  });

  test('14. Higher degree with perfect data (Degree 4 on 5 points)', () => {
    const x = [0, 1, 2, 3, 4];
    // y = x^4
    const y = x.map(v => Math.pow(v, 4));
    const coeffs = polyfit(x, y, 4);
    
    expectBFCloseTo(coeffs[0], 1, 20);
    // Others should be effectively zero
    expectBFCloseTo(coeffs[1], 0, 10); 
  });

  test('15. Check info execution time exists', () => {
    const x = [0, 1, 2];
    const y = [0, 1, 2];
    const info = {};
    polyfit(x, y, 1, info);
    expect(typeof info.exectime).toBe('number');
    expect(info.exectime).toBeGreaterThanOrEqual(0);
  });

  // --- 5.  (Edge Cases & Errors) ---

  test('16. Throws error if array lengths differ', () => {
    const x = [1, 2, 3];
    const y = [1, 2];
    expect(() => {
      polyfit(x, y, 1);
    }).toThrow();
  });

  test('17. Throws error if arrays are empty', () => {
    expect(() => {
      polyfit([], [], 1);
    }).toThrow();
  });

  test('18. Throws error if degree is negative', () => {
    const x = [1, 2];
    const y = [1, 2];
    expect(() => {
      polyfit(x, y, -1);
    }).toThrow();
  });

  test('19. Throws error if degree >= number of points (Strict check)', () => {
    // 2 points cannot uniquely determine a parabola (degree 2) without infinite solutions or overfitting logic
    // Assuming implementation throws error or handles it. 
    // Typically degree should be <= N-1.
    const x = [1, 2];
    const y = [1, 2];
    expect(() => {
      polyfit(x, y, 2); 
    }).toThrow();
  });

  test('20. Single point (Degree 0)', () => {
    // 1 point determines a constant y = c
    const x = [5];
    const y = [10];
    const coeffs = polyfit(x, y, 0);
    
    expect(coeffs.length).toBe(1);
    expectBFCloseTo(coeffs[0], 10, 25);
  });

});