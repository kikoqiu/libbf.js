const { init } = require("./testhelper.js");
const { bf, identify} = bfjs = require('../dist/bf.cjs');

describe('bfjs.identify', () => {
    beforeAll(async () => {
        await init();
    });

    // --- Rational Numbers ---
    test('1. Identify integer', () => {
        expect(identify(bf(5))).toBe("5");
    });

    test('2. Identify negative integer', () => {
        expect(identify(bf(-123))).toBe("-123");
    });

    test('3. Identify simple fraction', () => {
        expect(identify(bf(1).div(3))).toBe("(1)/3");
    });

    test('4. Identify complex fraction', () => {
        expect(identify(bf(22).div(7))).toBe("(22)/7");
    });

    test('5. Identify large denominator fraction', () => {
        expect(identify(bf(355).div(113))).toBe("(355)/113");
    });

    // --- PI related ---
    test('6. Identify PI', () => {
        expect(identify(bfjs.PI)).toBe("PI");
    });

    test('7. Identify 2*PI', () => {
        expect(identify(bfjs.PI.mul(2))).toBe("2*PI");
    });

    test('8. Identify PI/2', () => {
        expect(identify(bfjs.PI.div(2))).toBe("(PI)/2");
    });

    test('9. Identify 3*PI/4', () => {
        expect(identify(bfjs.PI.mul(3).div(4))).toBe("(3*PI)/4");
    });

    test('10. Identify negative PI combination', () => {
        expect(identify(bfjs.PI.mul(-5).div(6))).toBe("(-5*PI)/6");
    });

    // --- E related ---
    test('11. Identify E', () => {
        expect(identify(bfjs.E)).toBe("E");
    });

    test('12. Identify 1/E', () => {
        expect(identify(bf(1).div(bfjs.E))).toBe("exp(-1)");
    });

    test('13. Identify bfjs.E/5', () => {
        expect(identify(bfjs.E.div(5))).toBe("(E)/5");
    });

    // --- Square Roots ---
    test('14. Identify sqrt(2)', () => {
        expect(identify(bf(2).sqrt())).toBe("SQRT2");
    });

    test('15. Identify sqrt(1/2)', () => {
        expect(identify(bf(0.5).sqrt())).toBe("(SQRT2)/2");
    });

    test('16. Identify sqrt(3)', () => {
        expect(identify(bf(3).sqrt())).toBe("sqrt(3)");
    });

    test('17. Identify sqrt(2/3)', () => {
        expect(identify(bf(2).div(3).sqrt())).toBe("sqrt((2)/3)");
    });

    // --- Exponential and Logs ---
    test('18. Identify bfjs.E^2', () => {
        expect(identify(bfjs.E.mul(bfjs.E))).toBe("exp(2)");
    });

    test('19. Identify ln(2)', () => {
        expect(identify(bf(2).log())).toBe("LN2");
    });

    test('20. Identify 2*ln(2)', () => {
        expect(identify(bf(2).log().mul(2))).toBe("2*LN2");
    });

    // --- Golden Ratio ---
    test('21. Identify PHI', () => {
        const phi = bf(5).sqrt().add(1).div(2);
        expect(identify(phi)).toBe("PHI");
    });

    // --- Linear Combinations ---
    test('22. Identify PI + 1', () => {
        expect(identify(bfjs.PI.add(1))).toBe("PI+1");
    });

    test('23. Identify 2*PI - 3', () => {
        expect(identify(bfjs.PI.mul(2).sub(3))).toBe("2*PI-3");
    });

    test('24. Identify (PI/2) + 2', () => {
        expect(identify(bfjs.PI.div(2).add(2))).toBe("(PI)/2+2");
    });

    // --- Edge Cases & Zero ---
    test('25. Identify Zero', () => {
        expect(identify(bf(0))).toBe("0");
    });

    test('26. Identify small negative fraction', () => {
        expect(identify(bf(-2).div(1001))).toBe("(-2)/1001");
    });

    test('27. Identify PI*3/2', () => {
        const val = bfjs.PI.mul(3).div(2);
        const result = identify(val);
        expect(result).toMatch("(3*PI)/2");
    });

    // --- Mixed / Complex ---
    test('28. Identify a value that cannot be identified', () => {
        // A random-looking high precision number
        const val = bf("1.234567891011121314151617181920");
        expect(identify(val)).toBe(val.toString(10));
    });

    test('29. Identify exp(1/2)', () => {
        expect(identify(bf(0.5).exp())).toBe("exp((1)/2)");
    });

});