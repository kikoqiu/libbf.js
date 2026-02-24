const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, limit,diff } = bfjs = require('../dist/bf.cjs');

describe('helper.limit (High Precision Limits)', () => {
  beforeAll(async () => {
    await init();
  });

  // ==========================================
  // Category 1: Basic Finite Limits (Algebraic)
  // ==========================================

  // 1. Basic Polynomial: lim(x->2) x^2 = 4
  test('1. Limit of x^2 as x->2 is 4', () => {
    const f = (x) => x.pow(2);
    const res = limit(f, 2);
    expectBFCloseTo(res, 4, 25);
  });

  // 2. Linear shift: lim(x->0) (x + 5) = 5
  test('2. Limit of x+5 as x->0 is 5', () => {
    const f = (x) => x.add(5);
    const res = limit(f, 0);
    expectBFCloseTo(res, 5, 28);
  });

  // 3. Rational Function (Factorizable): lim(x->1) (x^2-1)/(x-1) = 2
  test('3. Limit of (x^2-1)/(x-1) as x->1 is 2', () => {
    const f = (x) => x.pow(2).sub(1).div(x.sub(1));
    const res = limit(f, 1);
    expectBFCloseTo(res, 2, 25);
  });

  // 4. Rational Function: lim(x->2) 1/(x+1) = 1/3
  test('4. Limit of 1/(x+1) as x->2 is 1/3', () => {
    const f = (x) => bf(1).div(x.add(1));
    const res = limit(f, 2);
    expectBFCloseTo(res, bf(1).div(3), 25);
  });

  // 5. Cubic: lim(x->-1) x^3 = -1
  test('5. Limit of x^3 as x->-1 is -1', () => {
    const f = (x) => x.pow(3);
    const res = limit(f, -1);
    expectBFCloseTo(res, -1, 28);
  });

  // ==========================================
  // Category 2: Classic 0/0 Singularities
  // ==========================================

  // 6. The Fundamental Trig Limit: lim(x->0) sin(x)/x = 1
  test('6. Limit of sin(x)/x as x->0 is 1', () => {
    const f = (x) => x.sin().div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 1, 25);
  });

  // 7. Cosine limit: lim(x->0) (1-cos(x))/x^2 = 0.5
  test('7. Limit of (1-cos(x))/x^2 as x->0 is 0.5', () => {
    const f = (x) => bf(1).sub(x.cos()).div(x.pow(2));
    const res = limit(f, 0);
    expectBFCloseTo(res, 0.5, 25);
  });

  // 8. Exponential definition: lim(x->0) (e^x - 1)/x = 1
  test('8. Limit of (e^x - 1)/x as x->0 is 1', () => {
    const f = (x) => x.exp().sub(1).div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 1, 25);
  });

  // 9. Logarithm: lim(x->0) ln(1+x)/x = 1
  test('9. Limit of ln(1+x)/x as x->0 is 1', () => {
    const f = (x) => x.add(1).log().div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 1, 25);
  });

  // 10. Tangent: lim(x->0) tan(x)/x = 1
  test('10. Limit of tan(x)/x as x->0 is 1', () => {
    const f = (x) => x.tan().div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 1, 25);
  });

  // ==========================================
  // Category 3: Infinite Limits (x -> Infinity)
  // ==========================================

  // 11. Inverse: lim(x->inf) 1/x = 0
  test('11. Limit of 1/x as x->inf is 0', () => {
    const f = (x) => bf(1).div(x);
    const res = limit(f, 'inf');
    expectBFCloseTo(res, 0, 28);
  });

  // 12. Rational Polynomials: lim(x->inf) (2x+1)/(x+1) = 2
  test('12. Limit of (2x+1)/(x+1) as x->inf is 2', () => {
    const f = (x) => x.mul(2).add(1).div(x.add(1));
    const res = limit(f, 'infinity');
    expectBFCloseTo(res, 2, 25);
  });

  // 13. Euler's Number: lim(x->inf) (1 + 1/x)^x = e
  test('13. Limit of (1 + 1/x)^x as x->inf is e', () => {
    const f = (x) => bf(1).add(bf(1).div(x)).pow(x);
    const res = limit(f, 'inf');
    // Convergence for this specific limit is slower, might need tuning
    expectBFCloseTo(res, bfjs.E || bf(1).exp(), 20); 
  });

  // 14. Arctan: lim(x->inf) atan(x) = PI/2
  test('14. Limit of atan(x) as x->inf is PI/2', () => {
    const f = (x) => x.atan();
    const res = limit(f, 'inf');
    const piOver2 = (bfjs.PI || bf(1).atan().mul(4)).div(2);
    expectBFCloseTo(res, piOver2, 25);
  });

  // 15. Root difference: lim(x->inf) sqrt(x^2+x) - x = 0.5
  test('15. Limit of sqrt(x^2+x) - x as x->inf is 0.5', () => {
    const f = (x) => x.pow(2).add(x).sqrt().sub(x);
    const res = limit(f, 'inf');
    expectBFCloseTo(res, 0.5, 25);
  });

  // ==========================================
  // Category 4: Derivative Definitions (Limit of difference quotient)
  // ==========================================

  // 16. d/dx(x^2) at x=3 -> lim(h->0) ((3+h)^2 - 9)/h = 6
  test('16. Derivative of x^2 at x=3 is 6', () => {
    const x0 = bf(3);
    const f = (h) => x0.add(h).pow(2).sub(x0.pow(2)).div(h);
    const res = limit(f, 0);
    expectBFCloseTo(res, 6, 25);
  });

  // 17. d/dx(sin x) at x=PI -> cos(PI) = -1
  test('17. Derivative of sin(x) at x=PI is -1', () => {
    const pi = bfjs.PI;
    const f = (h) => pi.add(h).sin().sub(pi.sin()).div(h);
    const res = limit(f, 0);
    expectBFCloseTo(res, -1, 25);
  });

  // 18. d/dx(ln x) at x=2 -> 1/2 = 0.5
  test('18. Derivative of ln(x) at x=2 is 0.5', () => {
    const x0 = bf(2);
    const f = (h) => x0.add(h).log().sub(x0.log()).div(h);
    const res = limit(f, 0);
    expectBFCloseTo(res, 0.5, 25);
  });

  // 19. d/dx(e^x) at x=1 -> e
  test('19. Derivative of e^x at x=1 is e', () => {
    const x0 = bf(1);
    const e = x0.exp();
    const f = (h) => x0.add(h).exp().sub(e).div(h);
    const res = limit(f, 0);
    expectBFCloseTo(res, e, 25);
  });

  // 20. d/dx(sqrt(x)) at x=4 -> 1/(2*sqrt(4)) = 0.25
  test('20. Derivative of sqrt(x) at x=4 is 0.25', () => {
    const x0 = bf(4);
    const f = (h) => x0.add(h).sqrt().sub(x0.sqrt()).div(h);
    const res = limit(f, 0);
    expectBFCloseTo(res, 0.25, 25);
  });

  // ==========================================
  // Category 5: Advanced & Composition Limits
  // ==========================================

  // 21. Exponential: lim(x->0) (1+x)^(1/x) = e
  test('21. Limit of (1+x)^(1/x) as x->0 is e', () => {
    const f = (x) => x.add(1).pow(bf(1).div(x));
    const res = limit(f, 0);
    expectBFCloseTo(res, bfjs.E || bf(1).exp(), 25);
  });

  // 22. General Exponential: lim(x->0) (2^x - 1)/x = ln(2)
  test('22. Limit of (2^x - 1)/x as x->0 is ln(2)', () => {
    const f = (x) => bf(2).pow(x).sub(1).div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, bf(2).log(), 25);
  });

  // 23. High Power L'Hopital: lim(x->1) (x^10 - 1)/(x - 1) = 10
  test('23. Limit of (x^10 - 1)/(x - 1) as x->1 is 10', () => {
    const f = (x) => x.pow(10).sub(1).div(x.sub(1));
    const res = limit(f, 1);
    expectBFCloseTo(res, 10, 25);
  });

  // 24. Root Fraction: lim(x->8) (cbrt(x) - 2)/(x - 8) = 1/12
  // 1/(3 * 8^(2/3)) = 1/(3*4) = 1/12
  test('24. Limit of (cbrt(x) - 2)/(x - 8) as x->8 is 1/12', () => {
    // cbrt(x) = x^(1/3)
    const f = (x) => x.pow(bf(1).div(3)).sub(2).div(x.sub(8));
    const res = limit(f, 8);
    expectBFCloseTo(res, bf(1).div(12), 25);
  });

  // 25. Trig Composition: lim(x->0) sin(2x)/x = 2
  test('25. Limit of sin(2x)/x as x->0 is 2', () => {
    const f = (x) => x.mul(2).sin().div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 2, 25);
  });

  // ==========================================
  // Category 6: Negative Infinity / Directional
  // ==========================================

  // 26. Negative Infinity Exponent: lim(x->-inf) e^x = 0
  test('26. Limit of e^x as x->-inf is 0', () => {
    const f = (x) => x.exp();
    const res = limit(f, '-inf');
    expectBFCloseTo(res, 0, 28);
  });

  // 27. Negative Infinity Rational: lim(x->-inf) (2x+1)/(3x-2) = 2/3
  test('27. Limit of (2x+1)/(3x-2) as x->-inf is 2/3', () => {
    const f = (x) => x.mul(2).add(1).div(x.mul(3).sub(2));
    const res = limit(f, '-infinity');
    expectBFCloseTo(res, bf(2).div(3), 25);
  });

  // 28. Inverse Tangent at -inf: lim(x->-inf) atan(x) = -PI/2
  test('28. Limit of atan(x) as x->-inf is -PI/2', () => {
    const f = (x) => x.atan();
    const res = limit(f, '-inf');
    const negPiOver2 = (bfjs.PI || bf(1).atan().mul(4)).div(2).neg();
    expectBFCloseTo(res, negPiOver2, 25);
  });

  // 29. One-sided Limit (Right): lim(x->0+) x * ln(x) = 0
  // Note: ln(x) is undefined for x < 0, so we must approach from positive side
  test('29. Right-sided limit of x*ln(x) as x->0+ is 0', () => {
    const f = (x) => x.mul(x.log());
    // Direction 1 means x = 0 + h (where h reduces towards 0)
    const res = limit(f, 0, { direction: 1 });
    expectBFCloseTo(res, 0, 25);
  });

  // 30. Inverse Sine Limit: lim(x->0) arcsin(x)/x = 1
  test('30. Limit of arcsin(x)/x as x->0 is 1', () => {
    const f = (x) => x.asin().div(x);
    const res = limit(f, 0);
    expectBFCloseTo(res, 1, 25);
  });

  test('31.1 useExp', () => {
    const f = (x) => bf(1).div(x.log());
    const res = limit(f, "inf",{useExp:true});
    expectBFCloseTo(res, 0, 25);
  });

  test('31.2 useExp', () => {
    const f = (x) => bf(1).div(x);
    const res = limit(f, "-inf",{useExp:true});
    expectBFCloseTo(res, 0, 25);
  });

  test('31.3 useExp', () => {
    const f = (x) => bf(1).add(bfjs.one.div(x)).pow(x);
    const res = limit(f, "inf",{useExp:true});
    expectBFCloseTo(res, bfjs.E, 25);
  });

});




describe('helper.limit (High Precision Limits - useExp Cases)', () => {
  beforeAll(async () => {
    await init();
  });

  // 32.01: Basic Rational Function x -> Inf
  // limit(1/x, x->inf) = 0
  test('32.01 useExp: 1/x -> 0', () => {
    const f = (x) => bf(1).div(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(0), 20);
  });

  // 32.02: Rational Function with non-zero limit
  // limit((2x^2 + 1) / x^2, x->inf) = 2
  test('32.02 useExp: (2x^2+1)/x^2 -> 2', () => {
    const f = (x) => x.pow(2).mul(2).add(1).div(x.pow(2));
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(2), 20);
  });

  // 32.03: Definition of E (The original fix case)
  // limit((1 + 1/x)^x, x->inf) = e
  test('32.03 useExp: (1 + 1/x)^x -> e', () => {
    const f = (x) => bf(1).add(bf(1).div(x)).pow(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bfjs.E, 20);
  });

  // 32.04: Root approach
  // limit(x^(1/x), x->inf) = 1
  test('32.04 useExp: x^(1/x) -> 1', () => {
    const f = (x) => x.pow(bf(1).div(x));
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1), 20);
  });

  // 32.05: Logarithmic growth vs Linear
  // limit(ln(x)/x, x->inf) = 0
  test('32.05 useExp: ln(x)/x -> 0', () => {
    const f = (x) => x.log().div(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(0), 20);
  });

  // 32.06: Sinc approach at infinity
  // limit(x * sin(1/x), x->inf) = 1 (equivalent to sin(t)/t as t->0)
  test('32.06 useExp: x * sin(1/x) -> 1', () => {
    const f = (x) => x.mul(bf(1).div(x).sin());
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1), 20);
  });

  // 32.07: Arctan at infinity
  // limit(atan(x), x->inf) = PI/2
  test('32.07 useExp: atan(x) -> PI/2', () => {
    const f = (x) => x.atan();
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bfjs.PI.div(2), 20);
  });

  // 32.08: Rational Limit
  // limit((3x - 5) / (2x + 1), x->inf) = 1.5
  test('32.08 useExp: (3x-5)/(2x+1) -> 1.5', () => {
    const f = (x) => x.mul(3).sub(5).div(x.mul(2).add(1));
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1.5), 20);
  });

  // 32.09: Difference of roots
  // limit(sqrt(x^2 + x) - x, x->inf) = 0.5
  test('32.09 useExp: sqrt(x^2+x) - x -> 0.5', () => {
    const f = (x) => x.pow(2).add(x).sqrt().sub(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(0.5), 20);
  });

  // 32.10: Negative Infinity, 1/x
  // limit(1/x, x->-inf) = 0
  test('32.10 useExp: 1/x (x -> -inf) -> 0', () => {
    const f = (x) => bf(1).div(x);
    const res = limit(f, "-inf", { useExp: true });
    expectBFCloseTo(res, bf(0), 20);
  });

  // 32.11: Negative Infinity, Rational
  // limit((2x+1)/(4x-2), x->-inf) = 0.5
  test('32.11 useExp: (2x+1)/(4x-2) (x -> -inf) -> 0.5', () => {
    const f = (x) => x.mul(2).add(1).div(x.mul(4).sub(2));
    const res = limit(f, "-inf", { useExp: true });
    expectBFCloseTo(res, bf(0.5), 20);
  });

  // 32.12: Negative Infinity, Euler definition
  // limit((1 + 1/x)^x, x->-inf) = e
  test('32.12 useExp: (1 + 1/x)^x (x -> -inf) -> e', () => {
    const f = (x) => bf(1).add(bf(1).div(x)).pow(x);
    const res = limit(f, "-inf", { useExp: true });
    expectBFCloseTo(res, bfjs.E, 20);
  });

  // 32.13: Finite limit with useExp (Exponential approach to point)
  // limit(x * ln(x), x->0+) = 0
  test('32.13 useExp: x * ln(x) (x -> 0+) -> 0', () => {
    const f = (x) => x.mul(x.log());
    // Point 0, useExp=true means x approaches 0 via 2^(-1/t)
    const res = limit(f, 0, { useExp: true, direction: 1 });
    expectBFCloseTo(res, bf(0), 20);
  });

  // 32.14: Standard Sinc at 0
  // limit(sin(x)/x, x->0) = 1
  test('32.14 useExp: sin(x)/x (x -> 0) -> 1', () => {
    const f = (x) => x.sin().div(x);
    const res = limit(f, 0, { useExp: true });
    expectBFCloseTo(res, bf(1), 20);
  });

  // 32.15: Derivative of ln(x) at x=1
  // limit(ln(x)/(x-1), x->1) = 1
  test('32.15 useExp: ln(x)/(x-1) (x -> 1) -> 1', () => {
    const f = (x) => x.log().div(x.sub(1));
    const res = limit(f, 1, { useExp: false });
    expectBFCloseTo(res, bf(1), 20);
  });

  // 32.16: Inverse Euler
  // limit((1 - 1/x)^x, x->inf) = 1/e
  test('32.16 useExp: (1 - 1/x)^x -> 1/e', () => {
    const f = (x) => bf(1).sub(bf(1).div(x)).pow(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1).div(bfjs.E), 20);
  });

  // 32.17: Power tower limit variation
  // limit((x/(x+1))^x, x->inf) = 1/e
  test('32.17 useExp: (x/(x+1))^x -> 1/e', () => {
    const f = (x) => x.div(x.add(1)).pow(x);
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1).div(bfjs.E), 20);
  });

  // 32.18: Exponential decay dominates polynomial growth
  // limit(x^5 / e^x, x->inf) = 0
  test('32.18 useExp: x^5 / e^x -> 0', () => {
    const f = (x) => x.pow(5).div(bfjs.E.pow(x));
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(0), 20);
  });

  // 32.19: x^x as x->0+
  // limit(x^x, x->0+) = 1
  test('32.19 useExp: x^x (x -> 0+) -> 1', () => {
    const f = (x) => x.pow(x);
    const res = limit(f, 0, { useExp: true, direction: 1 });
    expectBFCloseTo(res, bf(1), 20);
  });

  // 32.20: Hyperbolic ratio
  // limit((5^x - 3^x) / (5^x + 3^x), x->inf) = 1
  test('32.20 useExp: (5^x - 3^x)/(5^x + 3^x) -> 1', () => {
    const f = (x) => {
      const p5 = bf(5).pow(x);
      const p3 = bf(3).pow(x);
      return p5.sub(p3).div(p5.add(p3));
    };
    const res = limit(f, "inf", { useExp: true });
    expectBFCloseTo(res, bf(1), 20);
  });


    // 32.20: Hyperbolic ratio
  // limit((5^x - 3^x) / (5^x + 3^x), x->inf) = 1
  test('32.21 useExp = 3 : (5^x - 3^x)/(5^x + 3^x) -> 1', () => {
    const f = (x) => {
      const p5 = bf(5).pow(x);
      const p3 = bf(3).pow(x);
      return p5.sub(p3).div(p5.add(p3));
    };
    const res = limit(f, "inf", { useExp: 3 });
    expectBFCloseTo(res, bf(1), 20);
  });
});









describe('helper.diff (High Precision Differentiation)', () => {
  beforeAll(async () => {
    await init();
  });

  // ==========================================
  // Category 1: Basic Polynomials (1st Order)
  // ==========================================

  test('1. 1st derivative of x^2 at x=3 is 6', () => {
    const f = (x) => x.pow(2);
    const res = diff(f, 3, 1);
    expectBFCloseTo(res, 6, 25);
  });

  test('2. 1st derivative of x^3 at x=2 is 12', () => {
    const f = (x) => x.pow(3);
    const res = diff(f, 2, 1);
    expectBFCloseTo(res, 12, 25);
  });

  test('3. 1st derivative of constant 5 is 0', () => {
    const f = (x) => bf(5);
    const res = diff(f, 10, 1);
    expectBFCloseTo(res, 0, 25);
  });

  test('4. 1st derivative of 5x + 10 at x=100 is 5', () => {
    const f = (x) => x.mul(5).add(10);
    const res = diff(f, 100, 1);
    expectBFCloseTo(res, 5, 25);
  });

  test('5. 1st derivative of x^10 at x=1 is 10', () => {
    const f = (x) => x.pow(10);
    const res = diff(f, 1, 1);
    expectBFCloseTo(res, 10, 25);
  });

  // ==========================================
  // Category 2: Trigonometric Functions
  // ==========================================

  test('6. 1st derivative of sin(x) at x=0 is cos(0)=1', () => {
    const f = (x) => x.sin();
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  test('7. 1st derivative of cos(x) at x=0 is -sin(0)=0', () => {
    const f = (x) => x.cos();
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 0, 25);
  });

  test('8. 1st derivative of tan(x) at x=0 is sec^2(0)=1', () => {
    const f = (x) => x.tan();
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  test('9. 1st derivative of sin(x) at x=PI is cos(PI)=-1', () => {
    const PI = bfjs.PI; // Precise PI
    const f = (x) => x.sin();
    const res = diff(f, PI, 1);
    expectBFCloseTo(res, -1, 25);
  });

  // ==========================================
  // Category 3: Exponential and Logarithmic
  // ==========================================

  test('10. 1st derivative of e^x at x=1 is e', () => {
    const f = (x) => x.exp();
    const res = diff(f, 1, 1);
    expectBFCloseTo(res, bf(1).exp(), 25);
  });

  test('11. 1st derivative of ln(x) at x=2 is 1/2=0.5', () => {
    const f = (x) => x.log();
    const res = diff(f, 2, 1);
    expectBFCloseTo(res, 0.5, 25);
  });

  test('12. 1st derivative of 2^x at x=0 is ln(2)', () => {
    const f = (x) => bf(2).pow(x);
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, bf(2).log(), 25);
  });

  // ==========================================
  // Category 4: Higher Order Derivatives
  // ==========================================

  test('13. 2nd derivative of x^3 at x=2 is 6*2=12', () => {
    const f = (x) => x.pow(3);
    const res = diff(f, 2, 2);
    expectBFCloseTo(res, 12, 25);
  });

  test('14. 2nd derivative of sin(x) at x=0 is -sin(0)=0', () => {
    const f = (x) => x.sin();
    const res = diff(f, 0, 2);
    expectBFCloseTo(res, 0, 25);
  });

  test('15. 3rd derivative of x^4 at x=1 is 24', () => {
    const f = (x) => x.pow(4);
    const res = diff(f, 1, 3);
    expectBFCloseTo(res, 24, 25);
  });

  test('16. 4th derivative of e^x at x=0 is 1', () => {
    const f = (x) => x.exp();
    const res = diff(f, 0, 4);
    expectBFCloseTo(res, 1, 25);
  });

  test('17. 2nd derivative of ln(x) at x=2 is -1/4=-0.25', () => {
    const f = (x) => x.log();
    const res = diff(f, 2, 2);
    expectBFCloseTo(res, -0.25, 25);
  });

  test('18. 5th derivative of x^5 at x=10 is 120', () => {
    const f = (x) => x.pow(5);
    const res = diff(f, 10, 5);
    expectBFCloseTo(res, 120, 20); // Higher order may lose slight precision
  });

  // ==========================================
  // Category 5: Singularities and Singular Mode
  // ==========================================

  test('19. Singular mode: diff of (x^2-1)/(x-1) at x=1 is 1', () => {
    // This function is undefined at x=1, but the limit of derivative is 1
    const f = (x) => x.pow(2).sub(1).div(x.sub(1));
    const res = diff(f, 1, 1, { singular: true });
    expectBFCloseTo(res, 1, 25);
  });

  test('20. Right-hand derivative of |x| at x=0 is 1', () => {
    const f = (x) => x.abs();
    const res = diff(f, 0, 1, { direction: 1, singular: true });
    expectBFCloseTo(res, 1, 25);
  });

  test('21. Left-hand derivative of |x| at x=0 is -1', () => {
    const f = (x) => x.abs();
    const res = diff(f, 0, 1, { direction: -1, singular: true });
    expectBFCloseTo(res, -1, 25);
  });

  // ==========================================
  // Category 6: Piecewise and Directional
  // ==========================================

  test('22. Piecewise function right derivative at join', () => {
    // f(x) = x^2 (x>=0), x (x<0). Right diff at 0 is 0.
    const f = (x) => x.cmp(0) >= 0 ? x.pow(2) : x;
    const res = diff(f, 0, 1, { direction: 1 });
    expectBFCloseTo(res, 0, 25);
  });

  test('23. Piecewise function left derivative at join', () => {
    // f(x) = x^2 (x>=0), x (x<0). Left diff at 0 is 1.
    const f = (x) => x.cmp(0) >= 0 ? x.pow(2) : x;
    const res = diff(f, 0, 1, { direction: -1 });
    expectBFCloseTo(res, 1, 25);
  });

  // ==========================================
  // Category 7: Chain Rule and Compound
  // ==========================================

  test('24. 1st derivative of sin(x^2) at x=1 is 2*cos(1)', () => {
    const f = (x) => x.pow(2).sin();
    const res = diff(f, 1, 1);
    const expected = bf(2).mul(bf(1).cos());
    expectBFCloseTo(res, expected, 25);
  });

  test('25. 1st derivative of x*exp(x) at x=0 is 1', () => {
    const f = (x) => x.mul(x.exp());
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  test('26. 1st derivative of sqrt(x) at x=4 is 0.25', () => {
    const f = (x) => x.sqrt();
    const res = diff(f, 4, 1);
    expectBFCloseTo(res, 0.25, 25);
  });

  test('27. 1st derivative of 1/x at x=1 is -1', () => {
    const f = (x) => bf(1).div(x);
    const res = diff(f, 1, 1);
    expectBFCloseTo(res, -1, 25);
  });

  test('28. 1st derivative of atan(x) at x=0 is 1', () => {
    const f = (x) => x.atan();
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 1, 25);
  });

  test('29. 1st derivative of exp(-x^2) at x=0 is 0', () => {
    const f = (x) => x.pow(2).neg().exp();
    const res = diff(f, 0, 1);
    expectBFCloseTo(res, 0, 25);
  });

  test('30. 2nd derivative of sqrt(x) at x=1 is -0.25', () => {
    // f'(x) = 0.5 * x^-0.5, f''(x) = -0.25 * x^-1.5
    const f = (x) => x.sqrt();
    const res = diff(f, 1, 2);
    expectBFCloseTo(res, -0.25, 25);
  });
});