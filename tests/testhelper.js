const bfjs = require('../dist/bf.cjs');
const { bf,  helper } = bfjs;

async function init(){
    let createLibbf=require('../dist/libbf.js');
		let m = await createLibbf({ locateFile: function(path, prefix) {
			return "dist/libbf.wasm";
		}});
    await bfjs.init(m);
}
/**
 * Helper to assert BigFloat equality within a tolerance
 * @param {BigFloat} actual 
 * @param {BigFloat|number} expected 
 * @param {number} precision - decimal places
 */
const expectBFCloseTo = (actual, expected, precision = 20) => {
  const diff = bf(actual).sub(bf(expected)).abs();
  const tolerance = bf(10).pow(bf(-precision));
  
  if (diff.cmp(tolerance) > 0) {
    throw new Error(`
      Expected: ${expected.toString()}
      Received: ${actual.toString()}
      Diff:     ${diff.toString()}
      Tolerance: 1e-${precision}
    `);
  }
};

/**
 * Helper to evaluate polynomial P(x) given coefficients
 */
const evalPoly = (coeffs, x) => {
  const Complex = helper.Complex;
  const x_complex = new Complex(x); // wrap if x is BF

  // coeffs are: c0*x^n + ... + cn
  // Iterate backwards or use Horner's
  // Let's use Horner's method for stability
  let result = new Complex(coeffs[0]);
  for(let i=1; i<coeffs.length; i++) {
    result = result.mul(x_complex).add(new Complex(coeffs[i]));
  }
  return result;
};

module.exports={init,expectBFCloseTo,evalPoly};