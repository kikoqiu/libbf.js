const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, nsum } = bfjs = require('../dist/bf.cjs');

describe('helper.nsum (High Precision Summation)', () => {
  beforeAll(async () => {
    await init();
  });

  // ==========================================
  // Category 1: Finite Sums (Arithmetic/Basic)
  // ==========================================

  // 1. Sum of integers 1 to 100: n(n+1)/2 = 5050
  test('1. Finite Sum: integers 1 to 100', () => {
    const f = (n) => n;
    const res = nsum(f, [1, 100]);
    expectBFCloseTo(res, 5050, 30);
  });

  // 2. Sum of squares 1 to 10: n(n+1)(2n+1)/6 = 385
  test('2. Finite Sum: squares 1 to 10', () => {
    const f = (n) => n.pow(2);
    const res = nsum(f, [1, 10]);
    expectBFCloseTo(res, 385, 30);
  });

  // 3. Finite sum with negative range: -5 to 5 of n = 0
  test('3. Finite Sum: range includes negative numbers', () => {
    const f = (n) => n;
    const res = nsum(f, [-5, 5]);
    expectBFCloseTo(res, 0, 30);
  });

  // 4. Single term sum: [10, 10]
  test('4. Finite Sum: single term', () => {
    const f = (n) => n.pow(2);
    const res = nsum(f, [10, 10]);
    expectBFCloseTo(res, 100, 30);
  });

  // 5. Empty range: [10, 0] should return 0
  test('5. Finite Sum: empty range returns 0', () => {
    const f = (n) => n;
    const res = nsum(f, [10, 0]); // start > end
    expectBFCloseTo(res, 0, 30);
  });

  // ==========================================
  // Category 2: Geometric Series (Infinite)
  // ==========================================

  // 6. Geometric Series: sum(1/2^n, n=0 to inf) = 2
  test('6. Geometric Series: 1/2^n (0 to inf)', () => {
    const f = (n) => bf(1).div(bf(2).pow(n));
    const res = nsum(f, [0, 'inf']);
    expectBFCloseTo(res, 2, 25);
  });

  // 7. Geometric Series shifted: sum(1/2^n, n=1 to inf) = 1
  test('7. Geometric Series: 1/2^n (1 to inf)', () => {
    const f = (n) => bf(1).div(bf(2).pow(n));
    const res = nsum(f, [1, 'inf']);
    expectBFCloseTo(res, 1, 25);
  });

  // 8. Geometric Series base 3: sum(1/3^n, n=0 to inf) = 1.5
  test('8. Geometric Series: 1/3^n', () => {
    const f = (n) => bf(1).div(bf(3).pow(n));
    const res = nsum(f, [0, 'inf']);
    expectBFCloseTo(res, 1.5, 25);
  });

  // 9. Alternating Geometric: sum((-1/2)^n, n=0 to inf) = 1/(1 - -0.5) = 2/3
  test('9. Alternating Geometric Series', () => {
    // (-0.5)^n
    const f = (n) => bf(-0.5).pow(n);
    const res = nsum(f, [0, 'inf']);
    expectBFCloseTo(res, bf(2).div(3), 25);
  });

  // ==========================================
  // Category 3: Taylor Series & Constants
  // ==========================================

  // 10. Definition of e: sum(1/n!, n=0 to inf) = e
  /*test('10. Sum 1/n! converges to e', () => {
    const f = (n) => {
        if(n.isZero()) return bf(1); // 0! = 1
        // Simple factorial for test (or use bfjs math functions if available)
        let fact = bf(1);
        for(let i=1; i<=n.toNumber(); i++) fact = fact.mul(i);
        return bf(1).div(fact);
    };
    // Note: n! grows very fast, nsum should converge quickly.
    // For test stability we might use a simplified factorial or ensure n is small enough
    // But since nsum calls f(n) with BigFloat, we rely on the loop.
    // Better to use:
    const f_fast = (n) => bf(1).div(bf.gamma(n.add(1))); // 1/gamma(n+1) = 1/n!
    
    const res = nsum(f_fast, [0, 'inf']);
    const e_val = bf(1).exp();
    expectBFCloseTo(res, e_val, 25);
  });

  // 11. Taylor for cos(1): sum((-1)^n / (2n)!, n=0 to inf)
  test('11. Sum (-1)^n / (2n)! converges to cos(1)', () => {
    const f = (n) => {
        let term = bf(-1).pow(n).div(bf.gamma(n.mul(2).add(1)));
        return term;
    };
    const res = nsum(f, [0, 'inf']);
    const target = bf(1).cos();
    expectBFCloseTo(res, target, 25);
  });

  // 12. Taylor for sin(1): sum((-1)^n / (2n+1)!, n=0 to inf)
  test('12. Sum (-1)^n / (2n+1)! converges to sin(1)', () => {
    const f = (n) => {
        let term = bf(-1).pow(n).div(bf.gamma(n.mul(2).add(2)));
        return term;
    };
    const res = nsum(f, [0, 'inf']);
    const target = bf(1).sin();
    expectBFCloseTo(res, target, 25);
  });*/

  // ==========================================
  // Category 4: P-Series & Zeta Function (Slower Convergence)
  // ==========================================

  // 13. Basel Problem: sum(1/n^2, n=1 to inf) = pi^2 / 6
  test('13. Zeta(2) converges to pi^2/6', () => {
    const f = (n) => bf(1).div(n.pow(2));
    const res = nsum(f, [1, 'inf']);
    const pi = bfjs.acos(-1);
    const target = pi.pow(2).div(6);
    expectBFCloseTo(res, target, 20); // Convergence is polynomial, might need tolerance
  });

  // 14. Zeta(4): sum(1/n^4, n=1 to inf) = pi^4 / 90
  test('14. Zeta(4) converges to pi^4/90', () => {
    const f = (n) => bf(1).div(n.pow(4));
    const res = nsum(f, [1, 'inf']);
    const pi = bfjs.acos(-1);
    const target = pi.pow(4).div(90);
    expectBFCloseTo(res, target, 25);
  });

  // ==========================================
  // Category 5: Alternating Series (Convergence Tests)
  // ==========================================

  // 15. Alternating Harmonic: sum((-1)^(n+1) / n, n=1 to inf) = ln(2)
  test('15. Alternating Harmonic converges to ln(2)', () => {
    const f = (n) => bf(-1).pow(n.add(1)).div(n);
    const res = nsum(f, [1, 'inf']);
    const target = bf(2).log();
    expectBFCloseTo(res, target, 20); 
  });

  // 16. Leibniz for Pi: sum((-1)^n / (2n+1), n=0 to inf) = pi/4
  // Note: Extremely slow convergence normally, Richardson extrapolation makes it viable.
  test('16. Leibniz Series converges to pi/4', () => {
    const f = (n) => bf(-1).pow(n).div(n.mul(2).add(1));
    // This is hard! We might need more steps for high precision.
    const res = nsum(f, [0, 'inf'], { max_step: 25 });
    const pi = bfjs.acos(-1);
    const target = pi.div(4);
    expectBFCloseTo(res, target, 15); // Lower precision expectation for this hard series
  });

  // ==========================================
  // Category 6: Combined / Arithmetico-Geometric
  // ==========================================

  // 17. Sum n / 2^n from n=1 to inf = 2
  test('17. Sum n/2^n converges to 2', () => {
    const f = (n) => n.div(bf(2).pow(n));
    const res = nsum(f, [1, 'inf']);
    expectBFCloseTo(res, 2, 25);
  });

  // 18. Sum n^2 / 2^n from n=1 to inf = 6
  test('18. Sum n^2/2^n converges to 6', () => {
    const f = (n) => n.pow(2).div(bf(2).pow(n));
    const res = nsum(f, [1, 'inf']);
    expectBFCloseTo(res, 6, 25);
  });

  // ==========================================
  // Category 7: Advanced / Edge
  // ==========================================

  // 19. Start index shift: sum(1/2^n, n=10 to inf) = 1/2^9 = 1/512
  test('19. Geometric series with offset start index', () => {
    const f = (n) => bf(1).div(bf(2).pow(n));
    const res = nsum(f, [10, 'inf']);
    const target = bf(1).div(bf(512));
    expectBFCloseTo(res, target, 25);
  });

  // 20. Very small numbers: sum(10^-n, n=1 to inf) = 0.1111... = 1/9
  test('20. Sum 10^-n converges to 1/9', () => {
    const f = (n) => bf(10).pow(n.neg());
    const res = nsum(f, [1, 'inf']);
    const target = bf(1).div(9);
    expectBFCloseTo(res, target, 25);
  });

});