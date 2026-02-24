const { init, expectBFCloseTo } = require("./testhelper.js");
const bfjs = require('../dist/bf.cjs');
const { bf, complex, gamma, logGamma, bernoulli, factorial, beta } = bfjs;

describe('High-Precision Gamma & Bernoulli Functions', () => {

    beforeAll(async () => {
        await init();
    });



    // --- Bernoulli Numbers (10 tests) ---
    describe('bernoulli(n)', () => {
        test('1. B_0 = 1', () => expectBFCloseTo(bernoulli(0), 1, 45));
        test('2. B_1 = -0.5', () => expectBFCloseTo(bernoulli(1), -0.5, 45));
        test('3. B_2 = 1/6', () => expectBFCloseTo(bernoulli(2), bf(1).div(6), 45));
        test('4. B_4 = -1/30', () => expectBFCloseTo(bernoulli(4), bf(-1).div(30), 45));
        test('5. B_6 = 1/42', () => expectBFCloseTo(bernoulli(6), bf(1).div(42), 45));
        test('6. B_8 = -1/30', () => expectBFCloseTo(bernoulli(8), bf(-1).div(30), 45));
        test('7. B_10 = 5/66', () => expectBFCloseTo(bernoulli(10), bf(5).div(66), 45));
        test('8. B_12 = -691/2730', () => expectBFCloseTo(bernoulli(12), bf(-691).div(2730), 45));
        test('9. B_odd (n > 1) is 0', () => {
            expectBFCloseTo(bernoulli(3), 0, 45);
            expectBFCloseTo(bernoulli(13), 0, 45);
        });
        test('10. B_14 = 7/6', () => expectBFCloseTo(bernoulli(14), bf(7).div(6), 45));
    });

    // --- Real Gamma (15 tests) ---
    describe('gamma(z) - Real Arguments', () => {
        test('11-15. Positive integers (n-1)!', () => {
            expectBFCloseTo(gamma(1).re, 1, 45);
            expectBFCloseTo(gamma(2).re, 1, 45);
            expectBFCloseTo(gamma(3).re, 2, 45);
            expectBFCloseTo(gamma(4).re, 6, 45);
            expectBFCloseTo(gamma(5).re, 24, 45);
        });
        test('16. Gamma(0.5) = sqrt(bfjs.PI)', () => expectBFCloseTo(gamma(0.5).re, bfjs.PI.sqrt(), 45));
        test('17. Gamma(1.5) = 0.5 * sqrt(bfjs.PI)', () => expectBFCloseTo(gamma(1.5).re, bfjs.PI.sqrt().mul(0.5), 45));
        test('18. Gamma(2.5) = 0.75 * sqrt(bfjs.PI)', () => expectBFCloseTo(gamma(2.5).re, bfjs.PI.sqrt().mul(0.75), 45));
        test('19. Gamma(-0.5) = -2 * sqrt(bfjs.PI)', () => expectBFCloseTo(gamma(-0.5).re, bfjs.PI.sqrt().mul(-2), 45));
        test('20. Gamma(-1.5) = 4/3 * sqrt(bfjs.PI)', () => expectBFCloseTo(gamma(-1.5).re, bfjs.PI.sqrt().mul(bf(4).div(3)), 45));
        test('21-25. Small positive values', () => {
            expectBFCloseTo(gamma(0.1).re, "9.513507698668731285807979895825232500913716106390308265702100353577892124945196658677442893815489311007", 45);
            expectBFCloseTo(gamma(0.9).re, "1.068628702119319336984154223994951445487786617671887803069836619123607919051310319546724027795033858673", 45);
            expectBFCloseTo(gamma(1.1).re, "0.9513507698668731478232604282791689918457930893703437644993952812565841394768180626295926908279281795648", 45);
            expectBFCloseTo(gamma(1.2).re, "0.9181687423997606224265196592562720930225796870199403208440183197626526978635026461664120762809390944555", 45);
            expectBFCloseTo(gamma(1.5).re, "0.8862269254527580136490837416705725913987747280611935641069038949264556422955160906874753283692723327065", 45);
        });
    });

    // --- Complex Gamma (10 tests) ---
    describe('gamma(z) - Complex Arguments', () => {
        test('26. Gamma(1 + i)', () => {
            const res = gamma(complex(1, 1));
            expectBFCloseTo(res.re, "0.4980156681183560427136911174621980919529629675876500928926429549984583004359819345078945042826705814064", 80);
            expectBFCloseTo(res.im, "-0.1549498283018106851249551304838866051958796520793249302658802767988608014911385390129513664794630707488", 80);
        });
        test('27. Gamma(1 - i) (Conjugate)', () => {
            const res = gamma(complex(1, -1));
            expectBFCloseTo(res.re, "0.4980156681183560427136911174621980919529629675876500928926429549984583004359819345078945042826705814064", 40);
            expectBFCloseTo(res.im, "0.1549498283018106851249551304838866051958796520793249302658802767988608014911385390129513664794630707488", 40);
        });
        test('28. Gamma(i)', () => {
            const res = gamma(complex(0, 1));
            // Gamma(i) = Gamma(1+i)/i = -i * Gamma(1+i)
            expectBFCloseTo(res.re, "-0.1549498283018106851249551304838866051958796520793249302658802767988608014911385390129513664794630707488", 40);
            expectBFCloseTo(res.im, "-0.4980156681183560427136911174621980919529629675876500928926429549984583004359819345078945042826705814064", 40);
        });
        test('29. Gamma(2 + 3i)', () => {
            const res = gamma(complex(2, 3));
            expectBFCloseTo(res.re, "-0.08239527266561188367387031436462597748929073790384267522299520391541169173417080793826686200916482607126", 35);
            expectBFCloseTo(res.im, "0.09177428743525931459566741729377691773837791463103965887598905605603080993149922074849934176711205193948", 35);
        });
        test('30-35. Reflection Property: Gamma(z)Gamma(1-z) = bfjs.PI/sin(bfjs.PI*z)', () => {
            const z = complex(0.3, 0.4);
            const left = gamma(z).mul(gamma(complex(1).sub(z)));
            const right = complex(bfjs.PI).div(z.mul(complex(bfjs.PI)).sin());
            expectBFCloseTo(left.re, right.re, 40);
            expectBFCloseTo(left.im, right.im, 40);
        });
    });

    // --- LogGamma & Poles (5 tests) ---
    describe('logGamma(z) & Poles', () => {
        test('36. logGamma(10) = ln(9!)', () => {
            expectBFCloseTo(logGamma(10).re, bf(362880).log(), 45);
        });
        test('37. logGamma(50) - large value consistency', () => {
            const res = logGamma(50).exp();
            const expected = gamma(50);
            expectBFCloseTo(res.re, expected.re, 30);
        });
        test('38. logGamma(1 + i)', () => {
            const res = logGamma(complex(1, 1));
            expectBFCloseTo(res.re, "-0.6509231993018563388852168315039476650655087571397225919983824821064074311304967070645585950940948583137", 30);
            expectBFCloseTo(res.im, "-0.3016403204675331978875316577968965406598997739437652369407440053830605814395029533998982269727950119417", 30);
        });
        test('39. Pole at 0 throws error', () => {
            expect(() => gamma(0)).toThrow();
        });
        test('40. Pole at -1 throws error', () => {
            expect(() => gamma(-1)).toThrow();
        });
    });

    // --- Factorial (5 tests) ---
    describe('factorial(n)', () => {
        test('41. 0! = 1', () => expectBFCloseTo(factorial(0), 1, 45));
        test('42. 5! = 120', () => expectBFCloseTo(factorial(5), 120, 45));
        test('43. 10! = 3628800', () => expectBFCloseTo(factorial(10), 3628800, 45));
        test('44. factorial(0.5) = Gamma(1.5)', () => expectBFCloseTo(factorial(0.5), gamma(1.5).re, 45));
        test('45. Factorial complex: (i)!', () => {
            const res = factorial(complex(0, 1)); // gamma(1+i)
            expectBFCloseTo(res.re, "0.4980156681183560427", 18);
        });
    });

    // --- Beta Function (5 tests) ---
    describe('beta(x, y)', () => {
        test('46. B(1, 1) = 1', () => expectBFCloseTo(beta(1, 1).re, 1, 45));
        test('47. B(2, 1) = 0.5', () => expectBFCloseTo(beta(2, 1).re, 0.5, 45));
        test('48. B(2, 2) = 1/6', () => expectBFCloseTo(beta(2, 2).re, bf(1).div(6), 45));
        test('49. B(0.5, 0.5) = bfjs.PI', () => expectBFCloseTo(beta(0.5, 0.5).re, bfjs.PI, 45));
        test('50. Beta symmetry B(x,y) = B(y,x)', () => {
            const x = complex(1.2, 3.4);
            const y = complex(5.6, 7.8);
            const res1 = beta(x, y);
            const res2 = beta(y, x);
            expectBFCloseTo(res1.re, res2.re, 45);
            expectBFCloseTo(res1.im, res2.im, 45);
        });
    });
});