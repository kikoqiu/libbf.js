const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf,Complex,lambertw } = bfjs = require('../dist/bf.cjs');

describe('Lambert W Function (High-Precision)', () => {
  beforeAll(async () => {
    await init();
  });

  function expectLambertIdentity(z_re, z_im = 0, k = 0, tol = 25) {
    const z = new Complex(z_re, z_im);
    const w = lambertw(z, k);
    // wew = w * e^w
    const wew = w.mul(w.exp());
    expectBFCloseTo(wew.re, z_re, tol);
    expectBFCloseTo(wew.im, z_im, tol);
  }


  test('1. W_0(0) equals exactly 0', () => {
    const w = lambertw(0, 0);
    expectBFCloseTo(w.re, 0, 28);
    expectBFCloseTo(w.im, 0, 28);
  });

  test('2. W_0(e) equals exactly 1', () => {
    const w = lambertw(bfjs.E, 0);
    expectBFCloseTo(w.re, 1, 100);
    expectBFCloseTo(w.im, 0, 100);
  });

  test('3. W_0(-1/e) equals exactly -1 (Branch point)', () => {
    const branch_pt = new Complex(-1).div(new Complex(bfjs.E));
    const w = lambertw(branch_pt, 0);
    expectBFCloseTo(w.re, -1, 100);
    expectBFCloseTo(w.im, 0, 100);
  });

  test('4. W_{-1}(-1/e) equals exactly -1 (Branch point convergence)', () => {
    const branch_pt = new Complex(-1).div(new Complex(bfjs.E));
    const w = lambertw(branch_pt, -1);
    expectBFCloseTo(w.re, -1, 100);
    expectBFCloseTo(w.im, 0, 100);
  });

  test('5. W_0(1) equals the Omega constant', () => {
    const w = lambertw(1, 0);
    // Omega constant approx: 0.5671432904097838729999686622...
    const omega = "0.5671432904097838729999686622";
    expectBFCloseTo(w.re, omega, 25);
    expectBFCloseTo(w.im, 0, 25);
  });

  test('6. W_{-1}(0) approaches -Infinity', () => {
    const w = lambertw(0, -1);
    expect(w.re.toNumber()).toBe(-Infinity);
  });

  test('7. W_1(0) approaches -Infinity (Any k!=0 limit)', () => {
    const w = lambertw(0, 1);
    expect(w.re.toNumber()).toBe(-Infinity);
  });


  test('8. W_0(10) identity check', () => { expectLambertIdentity(10, 0, 0, 100); });
  
  test('9. W_0(100) identity check', () => { expectLambertIdentity(100, 0, 0, 100); });
  
  test('10. W_0(1000) identity check', () => { expectLambertIdentity(1000, 0, 0, 100); });
  
  test('11. W_0(10000) identity check', () => { expectLambertIdentity(10000, 0, 0, 100); });

  test('11.1 W_0(11111.2) identity check', () => { expectLambertIdentity("11111.2", 0, 0, 100); });

  test('12. W_0(-0.1) identity check (Negative real axis)', () => { expectLambertIdentity(-0.1, 0, 0, 100); });
  
  test('13. W_0(-0.2) identity check (Negative real axis)', () => { expectLambertIdentity(-0.2, 0, 0, 100); });
  
  test('14. W_0(-0.3) identity check (Negative real axis)', () => { expectLambertIdentity(-0.3, 0, 0, 100); });
  
  test('15. W_0(-0.36) identity check (Deep near branch cut)', () => { expectLambertIdentity(-0.36, 0, 0, 100); });



  test('16. W_0(i) identity check', () => { expectLambertIdentity(0, 1, 0, 100); });
  
  test('17. W_0(-i) identity check', () => { expectLambertIdentity(0, -1, 0, 100); });
  
  test('18. W_0(1 + i) identity check', () => { expectLambertIdentity(1, 1, 0, 100); });
  
  test('19. W_0(-2 + 3i) identity check', () => { expectLambertIdentity(-2, 3, 0, 100); });


  test('20. W_{-1}(-0.1) identity check', () => { expectLambertIdentity(-0.1, 0, -1, 100); });
  
  test('21. W_{-1}(-0.2) identity check', () => { expectLambertIdentity(-0.2, 0, -1, 100); });
  
  test('22. W_{-1}(-0.3) identity check', () => { expectLambertIdentity(-0.3, 0, -1, 100); });
  
  test('23. W_{-1}(-0.36) identity check (Near branch cut)', () => { expectLambertIdentity(-0.36, 0, -1, 100); });
  
  test('24. W_{-1}(i) identity check', () => { expectLambertIdentity(0, 1, -1, 100); });
  
  test('25. W_{-1}(-1 + i) identity check', () => { expectLambertIdentity(-1, 1, -1, 100); });


  test('26. W_1(1 + i) identity check', () => { expectLambertIdentity(1, 1, 1, 100); });
  
  test('27. W_1(-5) identity check', () => { expectLambertIdentity(-5, 0, 1, 100); });
  
  test('28. W_{-2}(-5) identity check', () => { expectLambertIdentity(-5, 0, -2, 100); });
  
  test('29. W_2(5i) identity check', () => { expectLambertIdentity(0, 5, 2, 100); });
  
  test('30. W_{3}(-10 - 10i) identity check', () => { expectLambertIdentity(-10, -10, 3, 100); });

});