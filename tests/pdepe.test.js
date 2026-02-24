const { init, expectBFCloseTo } = require("./testhelper.js");
const { bf, pdepe } = require('../dist/bf.cjs');

// Helper function: Generate linearly spaced array
function linspace(start, end, n) {
    const arr =[];
    const step = (end - start) / (n - 1);
    for (let i = 0; i < n; i++) arr.push(start + step * i);
    return arr;
}

// Global execution config as requested
const testInfo = { _e: "1e-4", _re: "1e-3", progress: undefined };

describe('pdepe solver tests', () => {
    let bf_zero, bf_one, bf_half;
    

    beforeAll(async () => {
        await init(); // Must wait for WASM/BigFloat core init
        bf_zero = bf(0);
        bf_one = bf(1);
        bf_half = bf("0.5");

    });

    // ==========================================
    // Part I: Basic & Physical PDEs (1 - 10)
    // ==========================================
    describe('Physical and Mathematical PDEs', () => {
        const xmesh_std = linspace(0, 1, 21);
        const tspan_std = linspace(0, 0.5, 11);

        test('1. Standard 1D Heat Equation (Slab, m=0)', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_zero });
            const icfun = (x) => bf(Math.sin(Math.PI * x.f64()));
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero }); 
            
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std, tspan_std, testInfo);
            // Analytical solution: u(x,t) = exp(-pi^2 * t) * sin(pi * x)
            const expected = Math.exp(-Math.PI * Math.PI * 0.5) * Math.sin(Math.PI * 0.5);
            expectBFCloseTo(sol[10][10], expected, 2); 
        });

        test('2. Cylindrical Heat Equation (m=1)', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_zero });
            const icfun = (x) => bf_one.sub(x.mul(x));
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: bf_zero, ql: bf_one, pr: ur[0], qr: bf_zero }); 
            const sol = pdepe(1, pdefun, icfun, bcfun, linspace(0, 1, 21), [0, 0.1], testInfo);
            expect(sol[1][0].cmp(bf_zero)).toBeGreaterThan(0);
        });

        test('3. Spherical Heat Equation (m=2)', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_zero });
            const icfun = (x) => bf_one;
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: bf_zero, ql: bf_one, pr: ur[0], qr: bf_zero });
            const sol = pdepe(2, pdefun, icfun, bcfun, linspace(0, 1, 21),[0, 0.1], testInfo);
            expect(sol).toBeDefined();
        });

        test('4. Heat Equation with Source Term', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_one });
            const icfun = (x) => bf_zero;
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero });
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std,[0, 0.5], testInfo);
            expect(sol[1][10].cmp(bf_zero)).toBeGreaterThan(0); // Center point should heat up
        });

        test('5. Advection-Diffusion Equation', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0].mul(bf("0.1")), s: dudx[0].neg() });
            const icfun = (x) => bf(Math.exp(-100 * Math.pow(x.f64() - 0.5, 2)));
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero });
            const sol = pdepe(0, pdefun, icfun, bcfun, linspace(0, 1, 51),[0, 0.1], testInfo);
            expect(sol).toBeDefined();
        });

        test('6. Neumann Boundary Conditions (Insulated ends)', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_zero });
            const icfun = (x) => x; 
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: bf_zero, ql: bf_one, pr: bf_zero, qr: bf_one });
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std, [0, 10], testInfo);
            // Steady state should equal the average of the initial condition (0.5)
            expectBFCloseTo(sol[1][10], 0.5, 2);
        });

        test('7. Viscous Burgers Equation', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: u[0].mul(dudx[0]).neg() });
            const icfun = (x) => bf(Math.sin(Math.PI * x.f64()));
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: ul[0], ql: bf_zero, pr: ur[0], qr: bf_zero });
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std, [0, 0.5], testInfo);
            expect(sol).toBeDefined();
        });

        test('8. Fisher Reaction-Diffusion Equation', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: u[0].mul(bf_one.sub(u[0])) });
            const icfun = (x) => bf(x.f64() < 0.2 ? 1 : 0);
            const bcfun = (xl, ul, xr, ur, t) => ({ pl: bf_zero, ql: bf_one, pr: ur[0], qr: bf_zero });
            const sol = pdepe(0, pdefun, icfun, bcfun, linspace(0, 1, 31),[0, 1.0], testInfo);
            expect(sol[1][15].cmp(bf_zero)).toBeGreaterThan(0); // Wave front advances
        });

        test('9. System of 2 Coupled Heat Equations (D=2)', () => {
            const pdefun = (x, t, u, dudx) => ({
                c: [bf_one, bf_one],
                f: [dudx[0], dudx[1]],
                s: [u[1], u[0]] // Intercoupled sources
            });
            const icfun = (x) => [bf_one, bf_zero];
            const bcfun = (xl, ul, xr, ur, t) => ({
                pl: [ul[0], ul[1]], ql: [bf_zero, bf_zero],
                pr: [ur[0], ur[1]], qr: [bf_zero, bf_zero]
            });
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std,[0, 0.1], testInfo);
            expect(sol[1][10].length).toBe(2);
        });

        test('10. Time-dependent Boundary Conditions', () => {
            const pdefun = (x, t, u, dudx) => ({ c: bf_one, f: dudx[0], s: bf_zero });
            const icfun = (x) => bf_zero;
            const bcfun = (xl, ul, xr, ur, t) => ({
                pl: ul[0].sub(bf(Math.sin(t.f64()))), ql: bf_zero, // Left boundary driven by sin(t)
                pr: ur[0], qr: bf_zero
            });
            const sol = pdepe(0, pdefun, icfun, bcfun, xmesh_std, [0, Math.PI/2], testInfo);
            expectBFCloseTo(sol[1][0], 1.0, 2); // At t=pi/2, left boundary u=1
        });
    });
});