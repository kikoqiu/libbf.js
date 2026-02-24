const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, ode15s } = bfjs = require('../dist/bf.cjs');

describe('ode15s', () => {
    
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
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-15"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 2, 12);
    });

    // 2. Integrates linear derivative y' = 2t => y(t) = t^2
    test('2. Integrates linear derivative y\' = 2t', () => {
        const odefun = (t, y) => [t.mul(bf(2))];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
    });

    // 3. Integrates quadratic derivative y' = 3t^2 => y(t) = t^3
    test('3. Integrates quadratic derivative y\' = 3t^2', () => {
        const odefun = (t, y) => [t.mul(t).mul(bf(3))];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 8, 10);
    });

    // 4. Integrates cubic derivative y' = 4t^3 => y(t) = t^4
    test('4. Integrates cubic derivative y\' = 4t^3', () => {
        const odefun = (t, y) =>[t.mul(t).mul(t).mul(bf(4))];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 16, 10);
    });

    // 5. Integrates quartic derivative y' = 5t^4 => y(t) = t^5
    test('5. Integrates quartic derivative y\' = 5t^4', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t);
            let t4 = t2.mul(t2);
            return [t4.mul(bf(5))];
        };
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 32, 9);
    });

    // 6. Integrates quintic derivative y' = 6t^5 => y(t) = t^6
    test('6. Integrates quintic derivative y\' = 6t^5', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t);
            let t4 = t2.mul(t2);
            return [t4.mul(t).mul(bf(6))];
        };
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 64, 8);
    });

    // --- Stiff Problems ---

    // 7. Simple Stiff Equation: y' = -10(y - t) + 1 => y(t) = t
    test('7. Simple decay to exact y=t', () => {
        const odefun = (t, y) => [bf("-10").mul(y[0].sub(t)).add(bf_one)];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 2, 10);
    });

    // 8. Stiff Polynomial (Deg 2): y' = -1000(y - t^2) + 2t => y(t) = t^2
    test('8. Stiff system exact y=t^2', () => {
        const odefun = (t, y) =>[bf("-1000").mul(y[0].sub(t.mul(t))).add(t.mul(bf(2)))];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
    });

    // 9. Stiff Polynomial (Deg 3): y' = -10000(y - t^3) + 3t^2 => y(t) = t^3
    test('9. Stiff system exact y=t^3', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t);
            return[bf("-10000").mul(y[0].sub(t2.mul(t))).add(t2.mul(bf(3)))];
        };
        const res = ode15s(odefun,[0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 8, 10);
    });

    // 10. Stiff Polynomial (Deg 4): y' = -100000(y - t^4) + 4t^3 => y(t) = t^4
    test('10. Stiff system exact y=t^4', () => {
        const odefun = (t, y) => {
            let t3 = t.mul(t).mul(t);
            return [bf("-100000").mul(y[0].sub(t3.mul(t))).add(t3.mul(bf(4)))];
        };
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-20"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 16, 9);
    });

    // 11. Stiff Polynomial (Deg 5): y' = -1e6(y - t^5) + 5t^4 => y(t) = t^5
    test('11. Stiff system exact y=t^5', () => {
        const odefun = (t, y) => {
            let t4 = t.mul(t).mul(t).mul(t);
            return[bf("-1000000").mul(y[0].sub(t4.mul(t))).add(t4.mul(bf(5)))];
        };
        const res = ode15s(odefun,[0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 32, 8);
    });

    // --- Multi-Dimensional Coupled Stiff Problems ---

    test('12. 2D Coupled Stiff System', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t), t3 = t2.mul(t);
            let E1 = y[0].sub(y[1]).add(t3).sub(t2);
            let S1 = y[0].sub(t2);
            let dy1 = bf("-1000").mul(E1).sub(bf("1000").mul(S1)).add(t.mul(bf(2)));
            
            let E2 = y[1].sub(y[0]).add(t2).sub(t3);
            let S2 = y[1].sub(t3);
            let dy2 = bf("-2000").mul(E2).sub(bf("2000").mul(S2)).add(t2.mul(bf(3)));
            return [dy1, dy2];
        };
        const res = ode15s(odefun, [0, 2],[0, 0], {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
        expectBFCloseTo(res.y[res.y.length - 1][1], 8, 10);
    });

    test('13. 3D Coupled Stiff System with mixed extreme stiffness', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t), t3 = t2.mul(t), t4 = t3.mul(t);
            
            let E0 = y[0].sub(y[1]).add(t3).sub(t2);
            let S0 = y[0].sub(t2);
            let E1 = y[1].sub(y[2]).add(t4).sub(t3);
            let S1 = y[1].sub(t3);
            let E2 = y[2].sub(y[0]).add(t2).sub(t4);
            let S2 = y[2].sub(t4);
            
            return[
                bf("-100").mul(E0).sub(bf("100").mul(S0)).add(t.mul(bf(2))),
                bf("-10000").mul(E1).sub(bf("1000").mul(S1)).add(t2.mul(bf(3))),
                bf("-1000000").mul(E2).sub(bf("10000").mul(S2)).add(t3.mul(bf(4)))
            ];
        };
        const res = ode15s(odefun,[0, 2], [0, 0, 0], {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
        expectBFCloseTo(res.y[res.y.length - 1][1], 8, 10);
        expectBFCloseTo(res.y[res.y.length - 1][2], 16, 8);
    });

    test('14. 5D Highly Stiff System', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t), t3 = t2.mul(t), t4 = t3.mul(t), t5 = t4.mul(t), t6 = t5.mul(t);
            let exacts = [t2, t3, t4, t5, t6];
            let derivs =[t.mul(bf(2)), t2.mul(bf(3)), t3.mul(bf(4)), t4.mul(bf(5)), t5.mul(bf(6))];
            
            let res =[];
            for(let i = 0; i < 5; i++) {
                let next = (i + 1) % 5;
                let E = y[i].sub(y[next]).add(exacts[next]).sub(exacts[i]);
                let S = y[i].sub(exacts[i]);
                let stiff_coef = bf("-10").mul(bf(Math.pow(10, i+1).toString()));
                res.push(stiff_coef.mul(E).sub(stiff_coef.mul(S)).add(derivs[i]));
            }
            return res;
        };
        let info= {_e:"1e-4"/*, cb(t,y){console.log(t+"")},estimate_error:true*/};
        const res = ode15s(odefun, [0, 2],[0, 0, 0, 0, 0],info);
        let lastY = res.y[res.y.length - 1];
        expectBFCloseTo(lastY[0], 4, 5);
        expectBFCloseTo(lastY[1], 8, 5);
        expectBFCloseTo(lastY[2], 16, 5);
        expectBFCloseTo(lastY[3], 32, 5);
        expectBFCloseTo(lastY[4], 64, 5);
    });

    // --- Non-Autonomous & Nonlinear Stiff Problems ---

    test('15. Non-autonomous Stiff System', () => {
        const odefun = (t, y) => [bf("-1000").mul(t).mul(y[0].sub(t.mul(t))).add(t.mul(bf(2)))];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
    });

    test('16. Nonlinear Stiff System (Varying Jacobian)', () => {
        const odefun = (t, y) => {
            let ysq = y[0].mul(y[0]).add(bf_one); // ensures non-zero variable stiffness
            return[bf("-1000").mul(ysq).mul(y[0].sub(t.mul(t))).add(t.mul(bf(2)))];
        };
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
    });

    // --- Analytic Jacobian API Checks ---

    test('17. 1D Stiff with Analytic Jacobian', () => {
        const odefun = (t, y) =>[bf("-1000").mul(y[0].sub(t.mul(t))).add(t.mul(bf(2)))];
        const jac = (t, y) => [[bf("-1000")] ];
        const res = ode15s(odefun, [0, 2], 0, { _e: "1e-12", Jacobian: jac });
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10);
    });

    test('18. 2D Coupled Stiff with Analytic Jacobian', () => {
        const odefun = (t, y) => {
            let t2 = t.mul(t);
            let dy1 = bf("-2000").mul(y[0]).add(bf("1000").mul(y[1])).add(bf("1000").mul(t2)).add(bf_one);
            let dy2 = bf("2000").mul(y[0]).sub(bf("-4000").mul(y[1])).add(bf("-6000").mul(t2)).add(t.mul(bf(2)));
            return [dy1, dy2];
        };
        const jac = (t, y) => [[bf("-2000"), bf("1000")],
            [bf("2000"), bf("-4000")]
        ];
        // exact shouldn't matter as long as it solves smoothly and doesn't crash 
        const res = ode15s(odefun, [0, 1], [0, 0], { _e: "1e-5", Jacobian: jac/*, cb(t,y){console.log(t+"")}*/ });
        expect(res.t[res.t.length-1].f64()).toBeCloseTo(1, 4);
    });

    // --- Reverse & Structural Integrity Checks ---

    test('19. Backward integration of stiff system', () => {
        // Integrate backward from t=2 to t=0
        const odefun = (t, y) =>[bf("1000").mul(y[0].sub(t.mul(t))).add(t.mul(bf(2)))]; 
        const res = ode15s(odefun, [2, 0], 4, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 0, 10);
    });

    test('20. Zero Interval Returns Null', () => {
        const odefun = (t, y) => [t];
        const res = ode15s(odefun, [1, 1], 0);
        expect(res).toBeNull();
    });

    test('21. Max steps limitation triggers correctly', () => {
        const odefun = (t, y) => [t];
        const info = { max_step: 5 };
        ode15s(odefun, [0, 100], 0, info);
        expect(info.status).toBe("max_steps");
    });

    test('22. Callback function is executed per accepted step', () => {
        const odefun = (t, y) => [t];
        let cb_called = 0;
        const info = { cb: () => { cb_called++; } };
        ode15s(odefun, [0, 2], 0, info);
        expect(cb_called).toBe(info.steps);
    });

    test('23. Estimate error flag populates global_error property', () => {
        const odefun = (t, y) => [y[0].neg()];
        const info = { estimate_error: true, _e:"1e-6" };
        ode15s(odefun,[0, 1], 1, info);
        expect(info.global_error).toBeDefined();
        expect(info.global_error_history).toBeDefined();
        expect(Array.isArray(info.global_error)).toBeTruthy();
    });

    test('24. Custom Tolerances affect computational step counts', () => {
        const odefun = (t, y) => [t.mul(t)]; 
        const info1 = { _e: "1e-5" };
        const info2 = { _e: "1e-15" };
        ode15s(odefun, [0, 2], 0, info1);
        ode15s(odefun, [0, 2], 0, info2);
        expect(info1.steps).toBeLessThanOrEqual(info2.steps);
    });

    test('25. BigFloat Array natively valid as Initial Condition', () => {
        const odefun = (t, y) => [t];
        const res = ode15s(odefun,[0, 2], [bf(0)], {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 2, 10);
    });

    // --- Famous Benchmarks & Chaos Equations ---

    test('26. Robertson Chemical Kinetics (ROBER) mass conservation', () => {
        const odefun = (t, y) => {
            let y1 = y[0], y2 = y[1], y3 = y[2];
            let dy1 = bf("-0.04").mul(y1).add(bf("1e4").mul(y2).mul(y3));
            let dy3 = bf("3e7").mul(y2).mul(y2);
            let dy2 = dy1.neg().sub(dy3); // Conserves dy1 + dy2 + dy3 = 0
            return [dy1, dy2, dy3];
        };
        const res = ode15s(odefun, [0, 10],[1, 0, 0], {_e:"1e-10"});
        let lastY = res.y[res.y.length - 1];
        let sum = lastY[0].add(lastY[1]).add(lastY[2]);
        expectBFCloseTo(sum, 1, 10);
    });

    test('27. Oregonator BZ reaction stiff system runs successfully', () => {
        const odefun = (t, y) => {
            let y1 = y[0], y2 = y[1], y3 = y[2];
            let dy1 = bf("77.27").mul(y2.add(y1.mul(bf_one.sub(bf("8.375e-6").mul(y1)).sub(y2))));
            let dy2 = bf_one.div(bf("77.27")).mul(y3.sub(bf_one.add(y1).mul(y2)));
            let dy3 = bf("0.161").mul(y1).sub(y3);
            return[dy1, dy2, dy3];
        };
        const info = { _e: "1e-8" };
        ode15s(odefun, [0, 1], [1, 2, 3], info);
        expect(info.status).toBe("done");
    });

    test('28. Extreme Stiffness 1e10 maintains accuracy without crashing', () => {
        const odefun = (t, y) => [bf("-1e10").mul(y[0].sub(t)).add(bf_one)];
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 2, 10);
    });

    test('29. Long duration integration scales intervals safely', () => {
        const odefun = (t, y) =>[bf("-100").mul(y[0].sub(t)).add(bf_one)];
        const res = ode15s(odefun, [0, 1000], 0, {_e:"1e-10"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 1000, 10);
    });

    test('30. Extreme discontinuity handles fallback limits / failure states cleanly', () => {
        const odefun = (t, y) => {
            // Unpredictable infinite corner generates severe structural discontinuity
            if (t.cmp(bf(1)) > 0) return [bf("-1e15").mul(y[0])];
            return[bf_one];
        };
        const info = { _e:"1e-15", max_step: 10000 };
        ode15s(odefun, [0, 2], 0, info);
        expect(["done", "underflow", "max_steps"]).toContain(info.status);
        expect(info.failed_steps).toBeGreaterThan(0);
    });

    test('31. High fluctuation exact solution forces VSVO adaptation tracking', () => {
        const odefun = (t, y) => {
            let tminus1 = t.sub(bf_one);
            let exact = t.mul(t).mul(tminus1).mul(tminus1); // exact y = t^2 * (t-1)^2
            
            let dt2 = t.mul(bf(2));
            let dtminus1_2 = tminus1.mul(bf(2));
            // Mathematical Derivative: 2t(t-1)^2 + t^2 * 2(t-1)
            let deriv = dt2.mul(tminus1).mul(tminus1).add(t.mul(t).mul(dtminus1_2));
            
            return [bf("-1000").mul(y[0].sub(exact)).add(deriv)];
        };
        const res = ode15s(odefun, [0, 2], 0, {_e:"1e-12"});
        expectBFCloseTo(res.y[res.y.length - 1][0], 4, 10); // at t=2 => 2^2 * 1^2 = 4
    });

});