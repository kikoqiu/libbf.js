const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, Complex, besselj, besseli, bessely, besselk, hankel1, hankel2, hyp0f1 } = bfjs = require('../dist/bf.cjs');

describe('Bessel Functions Family (High-Precision)', () => {
  beforeAll(async () => {
    await init();
  });

  // Helper comparison function to assert both real and imaginary parts of a Complex number
  function expectComplexCloseTo(c, expected_re, expected_im = 0, tol = 10) {
    expectBFCloseTo(c.re, expected_re, tol);
    expectBFCloseTo(c.im, expected_im, tol);
  }

  // ==========================================
  // Group 1: Bessel function of the first kind J_v(z)
  // ==========================================
  test('1. J_0(0) equals exactly 1', () => {
    const w = besselj(0, 0);
    expectComplexCloseTo(w, 1, 0, 25);
  });

  test('2. J_1(0) equals exactly 0', () => {
    const w = besselj(1, 0);
    expectComplexCloseTo(w, 0, 0, 25);
  });

  test('3. J_2(0) equals exactly 0', () => {
    const w = besselj(2, 0);
    expectComplexCloseTo(w, 0, 0, 25);
  });

  test('4. J_{-1}(1.5) = -J_1(1.5) (Odd negative integer order parity)', () => {
    const j_minus_1 = besselj(-1, 1.5);
    const j_1 = besselj(1, 1.5);
    expectComplexCloseTo(j_minus_1.add(j_1), 0, 0, 25);
  });

  test('5. J_{-2}(1.5) = J_2(1.5) (Even negative integer order parity)', () => {
    const j_minus_2 = besselj(-2, 1.5);
    const j_2 = besselj(2, 1.5);
    expectComplexCloseTo(j_minus_2.sub(j_2), 0, 0, 25);
  });

  test('6. J_{0.5}(2.0) = sqrt(1/pi) * sin(2) (Half-integer order elementary form)', () => {
    const w = besselj(0.5, 2.0);
    const expected = Math.sqrt(1 / Math.PI) * Math.sin(2);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('7. J_{-0.5}(2.0) = sqrt(1/pi) * cos(2)', () => {
    const w = besselj(-0.5, 2.0);
    const expected = Math.sqrt(1 / Math.PI) * Math.cos(2);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('8. J_n Recurrence: J_0(2) + J_2(2) = J_1(2)', () => {
    const j0 = besselj(0, 2);
    const j1 = besselj(1, 2);
    const j2 = besselj(2, 2);
    expectComplexCloseTo(j0.add(j2), j1.re, j1.im, 12);
  });

  test('9. J_0(i) = I_0(1) (Relation between complex parameter and modified form)', () => {
    const j0i = besselj(0, new Complex(0, 1));
    const i0 = besseli(0, 1);
    expectComplexCloseTo(j0i, i0.re, i0.im, 12);
  });

  // ==========================================
  // Group 2: Modified Bessel function of the first kind I_v(z)
  // ==========================================
  test('10. I_0(0) equals exactly 1', () => {
    const w = besseli(0, 0);
    expectComplexCloseTo(w, 1, 0, 25);
  });

  test('11. I_1(0) equals exactly 0', () => {
    const w = besseli(1, 0);
    expectComplexCloseTo(w, 0, 0, 25);
  });

  test('12. I_{-1}(1.5) = I_1(1.5) (Negative integer order symmetry)', () => {
    const i_minus_1 = besseli(-1, 1.5);
    const i_1 = besseli(1, 1.5);
    expectComplexCloseTo(i_minus_1.sub(i_1), 0, 0, 25);
  });

  test('13. I_{-2}(1.5) = I_2(1.5)', () => {
    const i_minus_2 = besseli(-2, 1.5);
    const i_2 = besseli(2, 1.5);
    expectComplexCloseTo(i_minus_2.sub(i_2), 0, 0, 25);
  });

  test('14. I_{0.5}(1.5) = sqrt(4/(3*pi)) * sinh(1.5) (Half-integer order hyperbolic form)', () => {
    const w = besseli(0.5, 1.5);
    const expected = Math.sqrt(4 / (3 * Math.PI)) * Math.sinh(1.5);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('15. I_{-0.5}(1.5) = sqrt(4/(3*pi)) * cosh(1.5)', () => {
    const w = besseli(-0.5, 1.5);
    const expected = Math.sqrt(4 / (3 * Math.PI)) * Math.cosh(1.5);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('16. I_n Recurrence: I_0(2) - I_2(2) = I_1(2)', () => {
    const i0 = besseli(0, 2);
    const i1 = besseli(1, 2);
    const i2 = besseli(2, 2);
    expectComplexCloseTo(i0.sub(i2), i1.re, i1.im, 12);
  });

  // ==========================================
  // Group 3: Bessel function of the second kind Y_v(z)
  // ==========================================
  test('17. Y_{0.5}(2) = -sqrt(1/pi) * cos(2)', () => {
    const w = bessely(0.5, 2);
    const expected = -Math.sqrt(1 / Math.PI) * Math.cos(2);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('18. Wronskian J_0(2)Y_1(2) - J_1(2)Y_0(2) = -1/pi (Real Wronskian identity)', () => {
    const j0 = besselj(0, 2);
    const j1 = besselj(1, 2);
    const y0 = bessely(0, 2);
    const y1 = bessely(1, 2);
    const wronskian = j0.mul(y1).sub(j1.mul(y0));
    expectComplexCloseTo(wronskian, -1 / Math.PI, 0, 10);
  });

  test('19. Y_{-1}(2.5) = -Y_1(2.5) (Integer order perturbation handling)', () => {
    const y_minus_1 = bessely(-1, 2.5);
    const y_1 = bessely(1, 2.5);
    expectComplexCloseTo(y_minus_1.add(y_1), 0, 0, 10);
  });

  test('20. Y_{-2}(2.5) = Y_2(2.5) (Even integer order perturbation handling)', () => {
    const y_minus_2 = bessely(-2, 2.5);
    const y_2 = bessely(2, 2.5);
    expectComplexCloseTo(y_minus_2.sub(y_2), 0, 0, 10);
  });

  test('21. Complex Wronskian for Y and J at z=1+i (Complex domain Wronskian)', () => {
    const z = new Complex(1, 1);
    const j0 = besselj(0, z);
    const j1 = besselj(1, z);
    const y0 = bessely(0, z);
    const y1 = bessely(1, z);
    const wronskian = j0.mul(y1).sub(j1.mul(y0));
    // RHS = -2 / (pi * z) = -2 * (1-i) / (pi * 2) = (-1 + i) / pi
    expectComplexCloseTo(wronskian, -1 / Math.PI, 1 / Math.PI, 10);
  });

  // ==========================================
  // Group 4: Modified Bessel function of the second kind K_v(z)
  // ==========================================
  test('22. K_n Recurrence: K_2(1.5) - K_0(1.5) = (2/1.5)*K_1(1.5)', () => {
    const k0 = besselk(0, 1.5);
    const k1 = besselk(1, 1.5);
    const k2 = besselk(2, 1.5);
    const lhs = k2.sub(k0);
    const rhs = k1.mul(new Complex(2 / 1.5));
    expectComplexCloseTo(lhs, rhs.re, rhs.im, 10);
  });

  test('23. K_{0.5}(2) = sqrt(pi/4) * e^{-2} (Half-integer order exponential form)', () => {
    const w = besselk(0.5, 2);
    const expected = Math.sqrt(Math.PI / 4) * Math.exp(-2);
    expectComplexCloseTo(w, expected, 0, 10);
  });

  test('24. Wronskian I_0(2)K_1(2) + I_1(2)K_0(2) = 1/z = 1/2', () => {
    const i0 = besseli(0, 2);
    const i1 = besseli(1, 2);
    const k0 = besselk(0, 2);
    const k1 = besselk(1, 2);
    const wronskian = i0.mul(k1).add(i1.mul(k0));
    expectComplexCloseTo(wronskian, 0.5, 0, 10);
  });

  test('25. K_{-1}(3) = K_1(3)', () => {
    const k_minus_1 = besselk(-1, 3);
    const k_1 = besselk(1, 3);
    expectComplexCloseTo(k_minus_1.sub(k_1), 0, 0, 10);
  });

  test('26. K_{-2}(3) = K_2(3)', () => {
    const k_minus_2 = besselk(-2, 3);
    const k_2 = besselk(2, 3);
    expectComplexCloseTo(k_minus_2.sub(k_2), 0, 0, 10);
  });

  // ==========================================
  // Group 5: Hankel functions H1_v(z) & H2_v(z)
  // ==========================================
  test('27. Hankel Wronskian H1_0(2)H2_1(2) - H1_1(2)H2_0(2) = 2i/pi', () => {
    const h1_0 = hankel1(0, 2);
    const h1_1 = hankel1(1, 2);
    const h2_0 = hankel2(0, 2);
    const h2_1 = hankel2(1, 2);
    const wronskian = h1_0.mul(h2_1).sub(h1_1.mul(h2_0));
    // Expected: Real part = 0, Imaginary part = 2 / pi
    expectComplexCloseTo(wronskian, 0, 2 / Math.PI, 10);
  });

  test('28. H1_1(z) = J_1(z) + iY_1(z) (Hankel function composition consistency)', () => {
    const h1 = hankel1(1, 2);
    const j1 = besselj(1, 2);
    const y1 = bessely(1, 2);
    const i = new Complex(0, 1);
    const rhs = j1.add(i.mul(y1));
    expectComplexCloseTo(h1, rhs.re, rhs.im, 10);
  });

  // ==========================================
  // Group 6: 0F1 Generalized Hypergeometric Limit Function Base
  // ==========================================
  test('29. hyp0f1(; 1; 1) = I_0(2) (Hypergeometric representation of modified Bessel)', () => {
    const f = hyp0f1(1, 1);
    const i0 = besseli(0, 2);
    expectComplexCloseTo(f, i0.re, i0.im, 10);
  });

  test('30. hyp0f1(; 2; -1) = J_1(2) (Hypergeometric representation of alternating series Bessel)', () => {
    const f = hyp0f1(2, -1);
    const j1 = besselj(1, 2);
    expectComplexCloseTo(f, j1.re, j1.im, 10);
  });

});