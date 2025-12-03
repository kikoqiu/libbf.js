const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, ode45 } = bfjs = require('../dist/bf.cjs');

describe('helper.ode45', () => {
    
    let bf_one, bf_zero;

    beforeAll(async () => {
        await init();
        bf_one = bfjs.one;
        bf_zero = bfjs.zero;
    });

    // --- Scalar Problems ---

    // 1. Simple Linear Integration: y' = 1, y(0) = 0 => y(t) = t
    test('1. Integrates constant derivative y\' = 1', () => {
        const odefun = (t, y) => [bf(1)];
        const tspan = [0, 2];
        const y0 = 0;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        
        expectBFCloseTo(final_y, 2, 20);
    });

    // 2. Exponential Growth: y' = y, y(0) = 1 => y(t) = exp(t)
    test('2. Integrates exponential growth y\' = y', () => {
        const odefun = (t, y) => y[0];
        const tspan = [0, 1];
        const y0 = 1;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        const expected = bfjs.one.exp(); // e^1
        
        expectBFCloseTo(final_y, expected, 15);
    });

    // 3. Exponential Decay: y' = -y, y(0) = 10 => y(t) = 10 * exp(-t)
    test('3. Integrates exponential decay y\' = -y', () => {
        const odefun = (t, y) => [y[0].neg()];
        const tspan = [0, 1];
        const y0 = 10;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        const expected = bf(10).mul(bfjs.minus_one.exp());
        
        expectBFCloseTo(final_y, expected, 15);
    });

    // 4. Polynomial Integration: y' = 2t, y(0) = 0 => y(t) = t^2
    test('4. Integrates time-dependent scalar y\' = 2t', () => {
        const odefun = (t, y) => [t.mul(bf(2))];
        const tspan = [0, 3];
        const y0 = 0; // y(0) = 0
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        // Expected: 3^2 = 9
        expectBFCloseTo(final_y, 9, 20);
    });

    // 5. Separable Equation: y' = -2ty, y(0) = 1 => y(t) = exp(-t^2)
    test('5. Integrates separable equation y\' = -2ty', () => {
        const odefun = (t, y) => [ t.mul(y[0]).mul(bf(-2)) ];
        const tspan = [0, 1]; // y(1) = 1/e
        const y0 = 1;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        const expected = bfjs.minus_one.exp();
        
        expectBFCloseTo(final_y, expected, 15);
    });

    // --- Vector / System Problems ---

    // 6. Harmonic Oscillator: y'' = -y
    // Convert to system: y1' = y2, y2' = -y1
    // Initial: y1(0)=0, y2(0)=1 => y1(t) = sin(t)
    test('6. Integrates Harmonic Oscillator (System of 2)', () => {
        const odefun = (t, y) => [ y[1], y[0].neg() ];
        const tspan = [0, bfjs.PI.mul(bf(0.5))]; // t = pi/2
        const y0 = [0, 1]; 
        
        const res = ode45(odefun, tspan, y0);
        const final_state = res.y[res.y.length - 1];
        
        // At pi/2: sin(pi/2) = 1, cos(pi/2) = 0
        expectBFCloseTo(final_state[0], 1, 15); // y1
        expectBFCloseTo(final_state[1], 0, 15); // y2
    });

    // 7. Coupled Linear System: 
    // y1' = y1 + 2*y2
    // y2' = 2*y1 + y2
    // Eigenvalues are -1 and 3.
    test('7. Integrates Coupled Linear System', () => {
        const odefun = (t, y) => [
            y[0].add(y[1].mul(bf(2))),
            y[0].mul(bf(2)).add(y[1])
        ];
        // Start at eigenvector [1, 1], should grow as e^(3t)
        const tspan = [0, 1];
        const y0 = [1, 1];
        
        const res = ode45(odefun, tspan, y0);
        const final_y1 = res.y[res.y.length - 1][0];
        const expected = bfjs.exp(bf(3));
        
        expectBFCloseTo(final_y1, expected, 14);
    });

    // 8. Logistic Equation: y' = r*y*(1 - y/K)
    // r=1, K=10, y0=1.
    test('8. Integrates Logistic Equation (Non-linear)', () => {
        const r = bf(1), K = bf(10);
        const odefun = (t, y) => {
            // y * (1 - y/10)
            return [ y[0].mul(bf_one.sub(y[0].div(K))) ];
        };
        const tspan = [0, 5];
        const y0 = 1;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        
        // Exact solution: y(t) = K / (1 + (K-y0)/y0 * e^(-rt))
        // y(5) = 10 / (1 + 9 * e^-5)
        const exact = K.div(bf_one.add(bf(9).mul(bfjs.exp(bf(-5)))));
        
        expectBFCloseTo(final_y, exact, 15);
    });

    // --- Time Direction & Span ---

    // 9. Negative Time Integration: Integrate backwards
    // y' = y, y(0) = 1. Integrate from 1 to 0. Target: 1.
    test('9. Handles negative time direction', () => {
        const odefun = (t, y) => [ y[0] ];
        const tspan = [1, 0];
        const y0 = bfjs.one.exp(); // Start at e^1
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        
        expectBFCloseTo(final_y, 1, 15);
    });

    // 10. Large Time Span
    // Ensure solver remains stable over longer integration periods
    test('10. Handles large time span', () => {
        const odefun = (t, y) => [ bf(0.1) ]; // y' = 0.1
        const tspan = [0, 1000];
        const y0 = 0;
        
        const info = { max_step: 100000 };
        const res = ode45(odefun, tspan, y0, info);
        const final_y = res.y[res.y.length - 1][0];
        
        expectBFCloseTo(final_y, 100, 14);
    });

    // --- Configuration & Error Handling ---

    // 11. High Precision Configuration
    // Set strict tolerance and check higher precision result
    test('11. Respects high precision tolerances', () => {
        const odefun = (t, y) => [y[0]];
        const tspan = [0, 1];
        const y0 = 1;
        
        // Very strict tolerance
        const info = { _e: 1e-25, _re: 1e-25 };
        const res = ode45(odefun, tspan, y0, info);
        const final_y = res.y[res.y.length - 1][0];
        const expected = bfjs.one.exp();
        
        // Should be close to high precision
        expectBFCloseTo(final_y, expected, 20); 
    });

    // 12. Max Steps Limit Exceeded
    // Should return status 'max_steps' and partial result
    test('12. Handles max_step limit gracefully', () => {
        const odefun = (t, y) => [y[0]];
        const tspan = [0, 10]; // Needs many steps
        const y0 = 1;
        const info = { max_step: 5 }; // Force failure
        
        ode45(odefun, tspan, y0, info);
        
        expect(info.status).toBe("max_steps");
        expect(info.steps).toBe(5);
        expect(info.y.length).toBeGreaterThan(0);
    });

    // 13. Callback Function Execution
    // Verify callback is called at each step
    test('13. Executes callback function', () => {
        const odefun = (t, y) => [bf(1)];
        let callCount = 0;
        const info = {
            cb: (t, y) => { callCount++; }
        };
        
        ode45(odefun, [0, 1], 0, info);
        expect(callCount).toBeGreaterThan(0);
        expect(callCount).toBe(info.steps);
    });

    // 14. Initial Step Size User Input
    // Verify providing an initial step works
    test('14. Accepts user-defined initial step', () => {
        const odefun = (t, y) => [y[0]];
        const info = { initial_step: 0.0001 }; // Very small start
        
        const res = ode45(odefun, [0, 0.1], 1, info);
        // Just checking it runs without error and produces result
        expect(res.t.length).toBeGreaterThan(1);
        expectBFCloseTo(res.y[res.y.length-1][0], bfjs.exp(bf(0.1)), 10);
    });

    // --- Advanced / Mathematical Edge Cases ---

    // 15. Square Root Function (Derivative singularity at 0?)
    // y' = 1/(2sqrt(t)) => y = sqrt(t). Start from epsilon to avoid div/0
    test('15. Integrates function with singularity near start', () => {
        const odefun = (t, y) => [ bf_one.div(bf(2).mul(t.sqrt())) ];
        // Start slightly offset from 0
        const tspan = [0.01, 4]; 
        const y0 = 0.1; // sqrt(0.01) = 0.1
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        
        // Expected: sqrt(4) = 2
        expectBFCloseTo(final_y, 2, 15);
    });

    // 16. Trigonometric RHS
    // y' = cos(t), y(0) = 0 => y = sin(t)
    test('16. Integrates trigonometric derivative y\' = cos(t)', () => {
        const odefun = (t, y) => [ bfjs.cos(t) ];
        const tspan = [0, bfjs.PI];
        const y0 = 0;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        
        // sin(pi) should be 0
        expectBFCloseTo(final_y, 0, 15);
    });

    // 17. System with different magnitudes (Stiff-like behavior test)
    // y1' = y1, y2' = 100 * y2 (y2 grows much faster)
    test('17. Handles system with different scales', () => {
        const odefun = (t, y) => [ y[0], y[1].mul(bf(5)) ];
        const tspan = [0, 1];
        const y0 = [1, 1e-10];
        
        const res = ode45(odefun, tspan, y0);
        const final_state = res.y[res.y.length - 1];
        
        expectBFCloseTo(final_state[0], bfjs.one.exp(), 10);
        expectBFCloseTo(final_state[1], bf(1e-10).mul(bfjs.exp(bf(5))), 10);
    });

    // 18. Zero Span (Immediate return)
    test('18. Returns immediately for zero length tspan', () => {
        const odefun = (t, y) => [y[0]];
        const res = ode45(odefun, [5, 5], 1);
        
        // Should return null or handle gracefully
        expect(res).toBeNull();
    });

    // 19. Forward and Backward Consistency Check
    // Integrate forward, then take result and integrate backward to start.
    test('19. Consistency: Integrate forward then backward returns to start', () => {
        const odefun = (t, y) => [y[0]]; // y' = y
        
        // Forward
        const res1 = ode45(odefun, [0, 1], 1);
        const y_at_1 = res1.y[res1.y.length - 1];
        
        // Backward
        const res2 = ode45(odefun, [1, 0], y_at_1);
        const final_y = res2.y[res2.y.length - 1][0];
        
        expectBFCloseTo(final_y, 1, 14); // Loss of precision expected in roundtrip
    });

    // 20. BigFloat Constants in Equation
    // y' = PI * y
    test('20. Works with BigFloat constants in ODE function', () => {
        const odefun = (t, y) => [ y[0].mul(bfjs.PI) ];
        const tspan = [0, 1];
        const y0 = 1;
        
        const res = ode45(odefun, tspan, y0);
        const final_y = res.y[res.y.length - 1][0];
        const expected = bfjs.exp(bfjs.PI);
        
        expectBFCloseTo(final_y, expected, 14);
    });

});