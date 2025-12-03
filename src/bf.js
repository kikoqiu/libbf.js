/**
 * copyright © 2021-2026 kikoqiu
 * MIT Licence
 * 
 */

import { complex } from "./complex.js";

/**
 * @description Flags for controlling the behavior of BigFloat operations.
 */
export var Flags = {};
/** @member {number} */
Flags.BF_ST_INVALID_OP = (1 << 0)
/** @member {number} */
Flags.BF_ST_DIVIDE_ZERO = (1 << 1)
/** @member {number} */
Flags.BF_ST_OVERFLOW = (1 << 2)
/** @member {number} */
Flags.BF_ST_UNDERFLOW = (1 << 3)
/** @member {number} */
Flags.BF_ST_INEXACT = (1 << 4)
/* indicate that a memory allocation error occured. NaN is returned */
/** @member {number} */
Flags.BF_ST_MEM_ERROR = (1 << 5)

/** @member {number} */
Flags.BF_RADIX_MAX = 36 /* maximum radix for bf_atof() and bf_ftoa() */

/* additional flags for bf_atof */
/* do not accept hex radix prefix (0x or 0X) if radix = 0 or radix = 16 */
/** @member {number} */
Flags.BF_ATOF_NO_HEX = (1 << 16)
/* accept binary (0b or 0B) or octal (0o or 0O) radix prefix if radix = 0 */
/** @member {number} */
Flags.BF_ATOF_BIN_OCT = (1 << 17)
/* Do not parse NaN or Inf */
/** @member {number} */
Flags.BF_ATOF_NO_NAN_INF = (1 << 18)
/* return the exponent separately */
/** @member {number} */
Flags.BF_ATOF_EXPONENT = (1 << 19)


/* Conversion of floating point number to string. Return a null
terminated string or NULL if memory error. *plen contains its
length if plen != NULL.  The exponent letter is "e" for base 10,
"p" for bases 2, 8, 16 with a binary exponent and "@" for the other
bases. */
/** @member {number} */
Flags.BF_RND_MASK = 0x7;

/** @member {number} */
Flags.BF_FTOA_FORMAT_MASK = (3 << 16)

/* fixed format: prec significant digits rounded with (flags &
BF_RND_MASK). Exponential notation is used if too many zeros are
needed.*/
/** @member {number} */
Flags.BF_FTOA_FORMAT_FIXED = (0 << 16)
/* fractional format: prec digits after the decimal point rounded with
(flags & BF_RND_MASK) */
/** @member {number} */
Flags.BF_FTOA_FORMAT_FRAC = (1 << 16)
/* free format: 

For binary radices with bf_ftoa() and for bfdec_ftoa(): use the minimum
number of digits to represent 'a'. The precision and the rounding
mode are ignored.

For the non binary radices with bf_ftoa(): use as many digits as
necessary so that bf_atof() return the same number when using
precision 'prec', rounding to nearest and the subnormal
configuration of 'flags'. The result is meaningful only if 'a' is
already rounded to 'prec' bits. If the subnormal flag is set, the
exponent in 'flags' must also be set to the desired exponent range.
*/
/** @member {number} */
Flags.BF_FTOA_FORMAT_FREE = (2 << 16)
/* same as BF_FTOA_FORMAT_FREE but uses the minimum number of digits
(takes more computation time). Identical to BF_FTOA_FORMAT_FREE for
binary radices with bf_ftoa() and for bfdec_ftoa(). */
/** @member {number} */
Flags.BF_FTOA_FORMAT_FREE_MIN = (3 << 16)

/* force exponential notation for fixed or free format */
/** @member {number} */
Flags.BF_FTOA_FORCE_EXP = (1 << 20)
/* add 0x prefix for base 16, 0o prefix for base 8 or 0b prefix for
base 2 if non zero value */
/** @member {number} */
Flags.BF_FTOA_ADD_PREFIX = (1 << 21)
/* return "Infinity" instead of "Inf" and add a "+" for positive
exponents */
/** @member {number} */
Flags.BF_FTOA_JS_QUIRKS = (1 << 22)
/** @member {number} */
Flags.BF_POW_JS_QUIRKS = (1 << 16); /* (+/-1)^(+/-Inf) = NaN, 1^NaN = NaN */

/** @member {number} */
Flags.BF_RNDN = 0; /* round to nearest, ties to even */
/** @member {number} */
Flags.BF_RNDZ = 1; /* round to zero */
/** @member {number} */
Flags.BF_RNDD = 2; /* round to -inf (the code relies on (BF_RNDD xor BF_RNDU) = 1) */
/** @member {number} */
Flags.BF_RNDU = 3;/* round to +inf */
/** @member {number} */
Flags.BF_RNDNA = 4; /* round to nearest, ties away from zero */
/** @member {number} */
Flags.BF_RNDA = 5; /* round away from zero */
/** @member {number} */
Flags.BF_RNDF = 6; /* faithful rounding (nondeterministic, either RNDD or RNDU,
			inexact flag is always set)  */



var gc_array = new Set();
var gcing = false;
function gc() {
	if (gcing) return;
	gcing = true;
	let ele = [...gc_array].sort((a, b) => {
		let diff = b.visited - a.visited;
		if (diff > (2 ** 31) || diff < -(2 ** 31)) {
			diff *= -1;
		}
		return diff;
	}
	);
	let gcstartpos = Math.floor(gc_ele_limit / 2);
	for (let i = gcstartpos; i < ele.length; ++i) {
		let e = ele[i];
		e.dispose();
	}
	gc_array = new Set(ele.slice(0, gcstartpos));
	gcing = false;
};
var visit_index = 0;
function gc_track(f, addToArray = true){
	f.visited = visit_index;
	visit_index = (visit_index + 1) % (2 ** 32);
	if (addToArray) {
		gc_array.add(f);
		if (gc_array.size >= gc_ele_limit) {
			gc();
		}
	}
};
var recyclebin = [];
function recycle(h) {
	const recyclebin_size = gc_ele_limit;
	if (recyclebin.length < recyclebin_size) {
		recyclebin.push(h);
	} else {
		libbf._delete_(h);
	}
};
function get_recycled_or_new() {
	if (recyclebin.length > 0) {
		return recyclebin.pop();
	}
	return libbf._new_();
};
/**
 * The current precision in bits.
 * @type {number}
 */
export var precision = 500;

/**
 * Set the global precision
 * @param {number} p
 */
export function setPrecision(p){
	precision = p;
}

var precision_array = [];
/**
 * Pushes the current precision to the stack and sets a new precision.
 * @param {number} prec - The new precision in bits.
 */
export function push_precision(prec) {
	precision_array.push(precision);
	precision = prec;
};
/**
 * Pops the precision from the stack and restores the previous precision.
 */
export function pop_precision() {
	if (precision.length) {
		precision = precision_array.pop();
	}
};

/**
 * Gets or sets the precision in decimal digits.
 * @param {number} [dp] - The new precision in decimal digits. If not provided, the function returns the current precision in decimal digits.
 * @returns {number | undefined}
 */
export function decimal_precision(dp) {
	if (dp != undefined) {
		precision = Math.ceil(dp * Math.log2(10));
	} else {
		return Math.ceil(precision / Math.log2(10));
	}
};
/**
 * Pushes the current precision to the stack and sets a new precision in decimal digits.
 * @param {number} dp - The new precision in decimal digits.
 */
export function push_decimal_precision(dp) {
	push_precision(0);
	decimal_precision(dp);
};

/**
 * The maximum number of elements before garbage collection is triggered.
 * @type {number}
 */
export var gc_ele_limit = 200;//maxmum elements before gc

/**
 * Set gc_ele_limit
 * @param {number} l
 */
export function set_gc_ele_limit(l){
	gc_ele_limit = l;
}

/**
 * Checks if the libbf library is ready.
 * @returns {boolean}
 */
export function is_ready() {
	return !!libbf;
};

/**
 * If true, an exception is thrown on invalid operations.
 * @type {boolean}
 */
export var throwExceptionOnInvalidOp = false;

/**
 * Set throwExceptionOnInvalidOp
 * @param {boolean} f
 */
export function setThrowExceptionOnInvalidOp(f){
	throwExceptionOnInvalidOp=f;
}

/**
 * The libbf instance.
 * @type {any}
 */
export var libbf = null;

/**
 * The global flags for libbf operations.
 * @type {number}
 */
export var globalFlag = 0; /*bf_set_exp_bits(15) MAXMUM | */

/**
 * Set the global flags for libbf operations.
 * @param {number} f
 */
export function setGlobalFlag(f){
	globalFlag = f;
}

function fromUint8Array(data) {
	const BF_T_STRUCT_SIZE = 20; // Size of bf_t struct in bytes
	const limb_size = 4; // Assuming limb_t is uint32_t (4 bytes)

	// Read len from the backed-up data
	const dataView = new DataView(data.buffer, 0, BF_T_STRUCT_SIZE);
	const len = dataView.getUint32(12, true); // len field is at offset 12

	const limbs_byte_length = len * limb_size;

	// Allocate new memory in WASM for bf_t struct and for limbs
	const new_h = libbf._malloc(BF_T_STRUCT_SIZE);
	let new_tab_ptr = 0;
	if (len > 0) {
		new_tab_ptr = libbf._malloc(limbs_byte_length);
	}

	// Copy the backed-up bf_t struct data to the new WASM memory location
	libbf.HEAPU8.set(data.subarray(0, BF_T_STRUCT_SIZE), new_h);

	// Copy the backed-up limb data to the new WASM memory location
	if (new_tab_ptr !== 0) {
		libbf.HEAPU8.set(data.subarray(BF_T_STRUCT_SIZE, BF_T_STRUCT_SIZE + limbs_byte_length), new_tab_ptr);
	}

	// Update the 'tab' pointer within the newly allocated bf_t struct
	// tab field is at offset 16 bytes (i.e., 16/4 = 4th Uint32 element)
	libbf.HEAPU32[(new_h / 4) + 4] = new_tab_ptr;

	return new_h;
}


/**
 * Trims repeating trailing decimals based on specific rules.
 * @param {string} str - The input string number.
 * @param {boolean} [pretty=false] pretty print
 * @returns {string} - The formatted string.
 */
const formatDecimal = (str,pretty=false) => {
  // Check if the string has a decimal point to avoid altering integers
  if (!str.includes('.')) return str;

  // Split integer and decimal parts
  const [intPart, decPart] = str.split('.');

  // Replace repetitive digits at the end of the decimal part
  // Regex: /(\d)\1+$/ 
  // - (\d) : Capture a single digit
  // - \1+  : Match that captured digit 1 or more times (ensures repetition)
  // - $    : Match the end of the string
  const newDecPart = decPart.replace(/(\d)\1+$/, (match, digit) => {
    
    // Rule: If it ends with repeating '0's, return ''
    if (digit === '0') {
      return '';
    }

	if(pretty){
		// Rule: If repetition exceeds 6 digits, truncate to 6
		if (match.length > 6) {
			return `${digit.repeat(5)}(${digit})`;
		}
	}

    // Otherwise, return the match as is
    return match;
  });

  // Recombine the parts
  if(newDecPart==""){
	return intPart;
  }
  return `${intPart}.${newDecPart}`;
};

let EPSILONS_cache=[];
/**
 * @class BigFloat
 * @description A class for arbitrary-precision floating-point arithmetic.
 */
export class BigFloat {
	/**
	 * Creates a new BigFloat instance.
	 * @param {string | number | bigint | BigFloat} [val] - The value to initialize the BigFloat with.
	 * @param {number} [radix=10] - The radix to use if `val` is a string.
	 * @param {boolean} [managed=true] - Whether the BigFloat should be managed by the garbage collector.
	 * @param {boolean} [constant=false] - Whether the BigFloat is a constant.
	 */
	constructor(val, radix = 10, managed = true, constant = false) {
		this.hwrapper = [get_recycled_or_new()];
		this.managed  = managed;		
		this.status   = 0;
		switch (typeof (val)) {
			case "undefined":
				break;
			case "string":
				this._fromString(val, radix);
				break;
			case "number":
				this.fromNumber(val);
				break;
			case 'bigint':
				this._fromString(val.toString(), 10);
				break;
			case 'object':
				if (!!val && val.constructor == BigFloat) {
					this.copy(val);
					break;
				}
			default:
				throw new Error('BigFloat: invalid constructor oprand ' + typeof (val));
		}
		this.visit();
		//set constant here
		this.constant = constant;
	}
	/**
	 * The handle to the underlying C object.
	 * @type {number}
	 */
	get h(){
		return this.hwrapper[0];
	}
	set h(hv){
		this.hwrapper[0]=hv;
	}
	/**
	 * Marks the BigFloat as visited by the garbage collector.
	 * @param {boolean} [addToArray=true] - Whether to add the BigFloat to the garbage collector's array.
	 */
	visit(addToArray=true){
		if(this.managed){
			gc_track(this,addToArray);
		}
	}
	/**
	 * Converts the BigFloat to a Uint8Array.
	 * @returns {Uint8Array}
	 */
	toUint8Array() {
		const BF_T_STRUCT_SIZE = 20; // Size of bf_t struct in bytes (4*5 fields)
		const limb_size = 4; // Assuming limb_t is uint32_t (4 bytes)

		// Create a DataView to read bf_t struct members from WASM memory
		const dataView = new DataView(libbf.HEAPU8.buffer, this.h, BF_T_STRUCT_SIZE);

		// Read ctx, sign, expn, len, tab from the bf_t struct
		// For the purpose of backup, we only need len and the tab pointer's target data
		// ctx field is at offset 0 (4 bytes, pointer)
		// sign field is at offset 4 (4 bytes, int)
		// expn field is at offset 8 (4 bytes, slimb_t)
		const len = dataView.getUint32(12, true); // len field is at offset 12 (4 bytes, limb_t)
		const tab_ptr = dataView.getUint32(16, true); // tab field is at offset 16 (4 bytes, pointer)

		const limbs_byte_length = len * limb_size;
		const total_backup_size = BF_T_STRUCT_SIZE + limbs_byte_length;

		const h_bak_data = new Uint8Array(total_backup_size);

		// Copy bf_t struct data (20 bytes)
		h_bak_data.set(new Uint8Array(libbf.HEAPU8.buffer, this.h, BF_T_STRUCT_SIZE), 0);

		// Copy limb data if tab pointer is valid and len > 0
		if (tab_ptr !== 0 && len > 0) {
			h_bak_data.set(new Uint8Array(libbf.HEAPU8.buffer, tab_ptr, limbs_byte_length), BF_T_STRUCT_SIZE);
		}
		return h_bak_data;
	}

	/**
	 * Disposes of the BigFloat's resources.
	 * @param {boolean} [recoverable=true] - Whether the BigFloat can be recovered later.
	 */
	dispose(recoverable = true) {
		if (this.h != 0) {
			if (recoverable) {
				this.h_bak = this.toUint8Array();
			}
			recycle(this.h);
			this.h = 0;
		}
	}
	/**
	 * Gets the handle to the underlying C object, creating it if necessary.
	 * @returns {number}
	 */
	geth() {
		if (this.h == 0) {
			if (this.h_bak) {
				this.h = fromUint8Array(this.h_bak); // Use the new function
				this.h_bak = null; // Clear the backup
			} else {
				// new BigFloat
				this.h = get_recycled_or_new();
			}
			this.visit(true);
		} else {
			//this would not cause gc, because addToArray=false		
			this.visit(false);
		}
		return this.h;
	}

	/**
	 * Checks if the last operation resulted in an inexact result.
	 * @returns {boolean}
	 */
	isInExact() {
		return this.checkstatus(this.status);
	}

	/**
	 * Checks the status of the last operation.
	 * @param {number} s - The status to check.
	 * @returns {number} The status.
	 */
	checkstatus(s) {
		/*if(s&Flags.BF_ST_INEXACT){
			  console.log("libbf BF_ST_INEXACT ");
		}*/
		if (s & Flags.BF_ST_DIVIDE_ZERO) {
			console.log("libbf BF_ST_DIVIDE_ZERO, status=" + s);
		}
		if (s & Flags.BF_ST_INVALID_OP) {
			if (throwExceptionOnInvalidOp) {
				throw new Error("libbf BF_ST_INVALID_OP, status=");
			}
			//don't throw an exception, the result will be a NaN
			console.log("libbf BF_ST_INVALID_OP, status=" + s);
		}
		return s;
	}
	/**
	 * Wraps the given arguments in BigFloat handles.
	 * @param {...(BigFloat | string | number | bigint | object)} ar - The arguments to wrap.
	 * @returns {[function(): void, ...number[]]} An array containing a cleanup function and the handles.
	 */
	wraptypeh(...ar) {
		let ret = [];
		let disposes = [];
		ret.push(function () {
			for (let e of disposes) {
				e.dispose(false);
			}
		});
		for (let a of ar) {
			if (a === null) {
				ret.push(0);
			} else if (a.constructor == BigFloat) {
				ret.push(a.geth());
			} else if (typeof (a) == 'string' || typeof (a) == 'number' || typeof (a) == 'bigint') {
				let b = new BigFloat(a, 10, false, true);
				ret.push(b.h);
				disposes.push(b);
			} else if(typeof(a)==="object" && a.toBigFloat) {
				let b = a.toBigFloat();
				ret.push(b.h);
				disposes.push(b);
			}else{
				throw new Error('object is not a BigFloat ' + a.constructor.name);
			}
		}
		return ret;
	}

	/**
	 * Converts the BigFloat to a Complex number.
	 * @returns {complex}
	 */
	toComplex(){
		return complex(this,zero);
	}
	/**
	 * 
	 * @param {string} method 
	 * @param {BigFloat | number | string | bigint | null} a 
	 * @param {BigFloat | number | string | bigint | null} b 
	 * @param {number} prec 
	 * @param {number} [flags] - if set, or with globalflag
	 * @param {number} [rnd_mode] - if set, overwrite round mode in globalflag
	 * @returns {BigFloat} this
	 */

	calc(method, a = null, b = null, prec, flags = undefined, rnd_mode = undefined) {
		if(this.constant){
			throw new Error("constant");
		}
		if (prec < 1) prec = precision;
		let [cleanup, ah, bh] = this.wraptypeh(a, b);
		try{
			let targetflags = globalFlag;
			if (!(flags === undefined)) {
				targetflags = targetflags | (flags & ~Flags.BF_RND_MASK);
			}
			if (!(rnd_mode === undefined)) {
				targetflags = (targetflags & ~Flags.BF_RND_MASK) | (rnd_mode & Flags.BF_RND_MASK);
			}
			this.status |= libbf._calc(method.charCodeAt(0), this.geth(), ah, bh, prec, targetflags);
		}finally{
			cleanup();
		}		
		this.checkstatus(this.status);
		return this;
	}
	/**
	 * 
	 * @param {string} method 
	 * @param {BigFloat | number | string | bigint | null} a 
	 * @param {BigFloat | number | string | bigint | null} b 
	 * @param {number} prec 
	 * @param {number} [rnd_mode=0]
	 * @param {BigFloat | null} q 
	 * @returns {BigFloat} this
	 */
	calc2(method, a = null, b = null, prec, rnd_mode = 0, q = null) {
		if(this.constant){
			throw new Error("constant");
		}
		if (prec < 1) prec = precision;
		let [cleanup, ah, bh, qh] = this.wraptypeh(a, b, q);
		try{
			this.status |= libbf._calc2(method.charCodeAt(0), this.geth(), ah, bh, prec, globalFlag, rnd_mode, qh);
		}finally{
			cleanup();
		}
		this.checkstatus(this.status);
		return this;
	}
	/**
	 * Checks if the given arguments are valid operands.
	 * @param {...any} args - The arguments to check.
	 */
	checkoprand(...args) {
		for (let a of args) {
			if (a === null || typeof (a) == 'undefined') {
				throw new Error('oprand missmatch');
			}
		}
	}
	/**
	 * Sets this BigFloat to the sum of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setadd(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('+', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the difference of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setsub(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('-', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the product of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setmul(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('*', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the division of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setdiv(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('/', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the modulus of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setmod(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc2('%', a, b, prec, Flags.BF_RNDZ, null);
	}
	/**
	 * Sets this BigFloat to the remainder of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setrem(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc2('%', a, b, prec, Flags.BF_RNDN, null);
	}
	/**
	 * Sets this BigFloat to the bitwise OR of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setor(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('|', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the bitwise XOR of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setxor(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('^', a, b, prec);
	}
	/**
	 * Sets this BigFloat to the bitwise AND of a and b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setand(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('&', a, b, prec);
	}

	/**
	 * Sets this BigFloat to the square root of a.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setsqrt(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('s', a, null, prec);
	}
	/**
	 * Rounds this BigFloat to a given precision.
	 * @param {number} [prec=0] 
	 * @param {number} [rnd_mode=Flags.BF_RNDN] 
	 * @returns {BigFloat} this
	 */
	setfpround(prec = 0, rnd_mode = Flags.BF_RNDN) {
		return this.calc('r', null, null, prec, undefined, rnd_mode);
	}
	/**
	 * Rounds this BigFloat to the nearest integer.
	 * @returns {BigFloat} this
	 */
	setround() {
		return this.calc('i', null, null, 0, undefined, Flags.BF_RNDN);
	}
	/**
	 * Truncates this BigFloat to an integer.
	 * @returns {BigFloat} this
	 */
	settrunc() {
		return this.calc('i', null, null, 0, undefined, Flags.BF_RNDZ);
	}
	/**
	 * Floors this BigFloat to an integer.
	 * @returns {BigFloat} this
	 */
	setfloor() {
		return this.calc('i', null, null, 0, undefined, Flags.BF_RNDD);
	}
	/**
	 * Ceils this BigFloat to an integer.
	 * @returns {BigFloat} this
	 */
	setceil() {
		return this.calc('i', null, null, 0, undefined, Flags.BF_RNDU);
	}
	/**
	 * Negates this BigFloat.
	 * @returns {BigFloat} this
	 */
	setneg() {
		return this.calc('n', null, null, 0);
	}
	/**
	 * Sets this BigFloat to its absolute value.
	 * @returns {BigFloat} this
	 */
	setabs() {
		return this.calc('b', null, null, 0);
	}

	/**
	 * Sets this BigFloat to the sign of a.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setsign(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('g', a, null, prec);
	}
	/**
	 * Sets this BigFloat to the value of log2(e).
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setLOG2(prec = 0) {
		return this.calc('2', null, null, prec);
	}
	/**
	 * Sets this BigFloat to the value of PI.
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setPI(prec = 0) {
		return this.calc('3', null, null, prec);
	}
	/**
	 * Sets this BigFloat to its minimum value.
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setMIN_VALUE(prec = 0) {
		return this.calc('z', null, null, prec);
	}
	/**
	 * Sets this BigFloat to its maximum value.
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setMAX_VALUE(prec = 0) {
		return this.calc('Z', null, null, prec);
	}
	/**
	 * Sets this BigFloat to its epsilon value.
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setEPSILON(prec = 0) {
		return this.calc('y', null, null, prec);
	}



	/**
	 * Sets this BigFloat to e^a.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setexp(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('E', a, null, prec);
	}
	/**
	 * Sets this BigFloat to log(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setlog(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('L', a, null, prec);
	}
	/**
	 * Sets this BigFloat to a^b.
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setpow(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('P', a, b, prec, Flags.BF_POW_JS_QUIRKS);
	}
	/**
	 * Sets this BigFloat to cos(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setcos(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('C', a, null, prec);
	}
	/**
	 * Sets this BigFloat to sin(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setsin(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('S', a, null, prec);
	}
	/**
	 * Sets this BigFloat to tan(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	settan(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('T', a, null, prec);
	}
	/**
	 * Sets this BigFloat to atan(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setatan(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('4', a, null, prec);
	}
	/**
	 * Sets this BigFloat to atan2(a, b).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setatan2(a, b, prec = 0) {
		this.checkoprand(a, b);
		return this.calc('5', a, b, prec);
	}
	/**
	 * Sets this BigFloat to asin(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setasin(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('6', a, null, prec);
	}
	/**
	 * Sets this BigFloat to acos(a).
	 * @param {BigFloat | number | string | bigint} a 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat} this
	 */
	setacos(a, prec = 0) {
		this.checkoprand(a);
		return this.calc('7', a, null, prec);
	}


	/**
	 * Checks if this BigFloat is finite.
	 * @returns {boolean}
	 */
	isFinit() {
		return libbf._is_finite_(this.geth());
	}
	/**
	 * Checks if this BigFloat is NaN.
	 * @returns {boolean}
	 */
	isNaN() {
		return libbf._is_nan_(this.geth());
	}
	/**
	 * Checks if this BigFloat is exactly zero.
	 * @returns {boolean}
	 */
	isExactZero() {
		return libbf._is_zero_(this.geth());
	}
	/**
	 * Checks if this BigFloat is almost zero.
	 * @returns {boolean}
	 */
	isZero() {
		return this.isAlmostZero();
		//return this.isExactZero();
	}
	/**
	 * Gets the epsilon value for the current precision.
	 * @returns {number}
	 */
	getEpsilon(){
		if(undefined===EPSILONS_cache[precision]){
			EPSILONS_cache[precision]=bf().setEPSILON().f64();
		}
		return EPSILONS_cache[precision];
	}

	/**
	 * Checks if this BigFloat is almost zero.
	 * @returns {boolean}
	 */
	isAlmostZero() {
		return Math.abs(this.f64())<=this.getEpsilon();
	}

	/**
	 * Copies the value of another BigFloat to this one.
	 * @param {BigFloat} a - The BigFloat to copy from.
	 * @returns {void}
	 */
	copy(a) {
		if(this.constant){
			throw new Error("constant");
		}
		this.checkoprand(a);
		return libbf._set_(this.geth(), a.geth());
	}
	/**
	 * Clones this BigFloat.
	 * @returns {BigFloat}
	 */
	clone() {
		return new BigFloat(this);
	}
	/**
	 * Sets the value of this BigFloat from a number.
	 * @param {number} a 
	 * @returns {void}
	 */
	fromNumber(a) {
		if(this.constant){
			throw new Error("constant");
		}
		return libbf._set_number_(this.geth(), a);
	}
	/**
	 * Converts this BigFloat to a 64-bit float.
	 * @returns {number}
	 */
	f64() {
		return libbf._get_number_(this.geth());
	}
	/**
	 * Converts this BigFloat to a number.
	 * @returns {number}
	 */
	toNumber() {
		return libbf._get_number_(this.geth());
	}
	/**
	 * Compares this BigFloat with another one.
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {number} 0 if equal, >0 if this > b, <0 if this < b.
	 */
	cmp(b) {
		this.checkoprand(b);
		let [cleanup, bh] = this.wraptypeh(b);
		let ret;
		try{
			ret = libbf._cmp_(this.geth(), bh);
		}finally{
			cleanup();
		}
		return ret;
	}

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorLess(b) {
		return this.cmp(b) < 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorGreater(b) {
		return this.cmp(b) > 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorLessEqual(b) {
		return this.cmp(b) <= 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorGreaterEqual(b) {
		return this.cmp(b) >= 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorEqual(b) {
		return this.cmp(b) == 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	operatorNotEqual(b) {
		return this.cmp(b) != 0;
	}
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @returns {boolean}
	 */
	equals(b){
		return this.operatorEqual(b);
	}


	/**
	 * @param {string} str 
	 * @param {number} [radix=10] 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
	static fromString(str, radix = 10, prec = 0) {
		return new BigFloat()._fromString(str,radix,prec);
	}

	/**
	 * @private
	 * @param {string} str 
	 * @param {number} [radix=10] 
	 * @param {number} [prec=0] 
	 * @returns {this}
	 */
	_fromString(str, radix = 10, prec = 0) {
		if(this.constant){
			throw new Error("constant");
		}
		if (radix > 64) throw new Error('radix error');
		if (prec < 1) prec = precision;
		let hstr = libbf.allocateUTF8(str);
		let ret = libbf._atof_(this.geth(), hstr, radix, prec, 0);
		libbf._free(hstr);
		this.checkstatus(ret);
		return this;
	}
	/**
	 * toString
	 * @param {number} [radix=10] 
	 * @param {number} [prec=-1] precision digits in radix
	 * @param {boolean} [pretty=false] pretty print
	 * @returns {string}
	 */
	toString(radix = 10, prec = -1, pretty=false) {
		if (radix > 64) throw new Error('radix error');
		if (isNaN(prec)) throw new Error('prec is NaN');
		if (prec <= 0) prec = Math.ceil(precision / Math.log2(radix));
		let flag = 0;
		//flag =Flags.BF_FTOA_FORMAT_FREE_MIN | Flags.BF_RNDZ | Flags.BF_FTOA_JS_QUIRKS;
		flag = Flags.BF_FTOA_FORMAT_FIXED | Flags.BF_RNDZ | Flags.BF_FTOA_JS_QUIRKS
		let ret = libbf._ftoa_(0, this.geth(), radix, prec, flag);
		let rets = libbf.AsciiToString(ret);
		libbf._free(ret);
		return formatDecimal(rets,pretty);
	}
	/**
	 * 
	 * @param {number} [radix=10] 
	 * @param {number} [prec=-1] precision digits in radix
	 * @param {number} [rnd_mode=Flags.BF_RNDNA] 
	 * @returns {string}
	 */
	toFixed(radix = 10, prec = -1, rnd_mode = Flags.BF_RNDNA) {
		if (radix > 64) throw new Error('radix error');
		if (prec < 0) prec = Math.floor(precision / Math.log2(radix));
		let flag = 0;
		flag = rnd_mode | Flags.BF_FTOA_FORMAT_FRAC
		let ret = libbf._ftoa_(0, this.geth(), radix, prec, flag);
		let rets = libbf.AsciiToString(ret);
		libbf._free(ret);
		return rets;
	}

	/**
	 * @returns {bigint}
	 */
	toBigInt() {
		let s = this.toString(10, 0);
		return BigInt(s);
	}


	/**
	 * @param {function} ofunc 
	 * @param {number} numps 
	 * @param {...any} args 
	 * @returns {BigFloat}
	 */
	callFunc(ofunc,numps,...args) {
		if (numps == 0) {
			return ofunc.apply(new BigFloat(this));
		} else if (numps == 2) {
			return ofunc.apply(new BigFloat(), [this,...args]);
		} else {
			return ofunc.apply(new BigFloat(), [this, ...args]);
		}
	}


	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
	add(b,prec=0){
        return this.callFunc(this.setadd,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    sub(b,prec=0){
        return this.callFunc(this.setsub,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    mul(b,prec=0){
        return this.callFunc(this.setmul,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    div(b,prec=0){
        return this.callFunc(this.setdiv,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    mod(b,prec=0){
        return this.callFunc(this.setmod,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    rem(b,prec=0){
        return this.callFunc(this.setrem,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    or(b,prec=0){
        return this.callFunc(this.setor,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    xor(b,prec=0){
        return this.callFunc(this.setxor,3,b,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    and(b,prec=0){
        return this.callFunc(this.setand,3,b,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    sqrt(prec=0){
        return this.callFunc(this.setsqrt,2,prec);
    }

	/**
	 * @param {number} prec 
	 * @param {number} rnd_mode 
	 * @returns {BigFloat}
	 */
    fpround(prec, rnd_mode){
        return bf(this).setfpround(prec,rnd_mode);
    }

	/**
	 * @returns {BigFloat}
	 */
    round(){
        return this.callFunc(this.setround,0);
    }

	/**
	 * @returns {BigFloat}
	 */
    trunc(){
        return this.callFunc(this.settrunc,0);
    }

	/**
	 * @returns {BigFloat}
	 */
    floor(){
        return this.callFunc(this.setfloor,0);
    }

	/**
	 * @returns {BigFloat}
	 */
    ceil(){
        return this.callFunc(this.setceil,0);
    }

	/**
	 * @returns {BigFloat}
	 */
    neg(){
        return this.callFunc(this.setneg,0);
    }

	/**
	 * @returns {BigFloat}
	 */
    abs(){
        return this.callFunc(this.setabs,0);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    sign(prec=0){
        return this.callFunc(this.setsign,2,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    exp(prec=0){
        return this.callFunc(this.setexp,2,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    log(prec=0){
        return this.callFunc(this.setlog,2,prec);
    }

	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    pow(b,prec=0){
        return this.callFunc(this.setpow,3,b,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    cos(prec=0){
        return this.callFunc(this.setcos,2,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    sin(prec=0){
        return this.callFunc(this.setsin,2,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    tan(prec=0){
        return this.callFunc(this.settan,2,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    atan(prec=0){
        return this.callFunc(this.setatan,2,prec);
    }
	/**
	 * @param {BigFloat | number | string | bigint} b 
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    atan2(b,prec=0){
        return this.callFunc(this.setatan2,3,b,prec);
    }

	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    asin(prec=0){
        return this.callFunc(this.setasin,2,prec);
    }
	/**
	 * @param {number} [prec=0] 
	 * @returns {BigFloat}
	 */
    acos(prec=0){
        return this.callFunc(this.setacos,2,prec);
    }


}


BigFloat.prototype.operatorAdd = BigFloat.prototype.add;
BigFloat.prototype.operatorSub = BigFloat.prototype.sub;
BigFloat.prototype.operatorMul = BigFloat.prototype.mul;
BigFloat.prototype.operatorDiv = BigFloat.prototype.div;
BigFloat.prototype.operatorPow = BigFloat.prototype.pow;
BigFloat.prototype.operatorMod = BigFloat.prototype.mod;
BigFloat.prototype.operatorNeg = BigFloat.prototype.neg;
BigFloat.prototype.operatorBitwiseAnd = BigFloat.prototype.and;
BigFloat.prototype.operatorBitwiseOr = BigFloat.prototype.or;
BigFloat.prototype.operatorBitwiseXor = BigFloat.prototype.xor;
//BigFloat.prototype.operatorBitwiseLShift=BigFloat.prototype.mul2exp;
//BigFloat.prototype.operatorBitwiseRShift=BigFloat.prototype.mul2exp;
BigFloat.prototype.operatorBitwiseNot = BigFloat.prototype.not;



/**
 * Creates a new BigFloat instance.
 * @param {string | number | bigint | BigFloat} [val] - The value to initialize the BigFloat with.
 * @param {number} [radix=10] - The radix to use if `val` is a string.
 * @param {boolean} [managed=true] - Whether the BigFloat should be managed by the garbage collector.
 * @param {boolean} [constant=false] - Whether the BigFloat is a constant.
 * @returns {BigFloat}
 */
export function bf(val, radix = 10, managed=true, constant=false) {
	return new BigFloat(val, radix, managed, constant);
};

/** @type {BigFloat | null} */
export var minus_one=null;
/** @type {BigFloat | null} */
export var zero=null;
/** @type {BigFloat | null} */
export var half=null;
/** @type {BigFloat | null} */
export var one=null;
/** @type {BigFloat | null} */
export var two=null;
/** @type {BigFloat | null} */
export var three=null;
/** @type {BigFloat | null} */
export var PI=null;
/** @type {BigFloat | null} */
export var E=null;

let inited=false;
/**
 * Initializes the libbf library.
 * @param {any} m - The wasm module.
 * @returns {Promise<boolean>}
 */
export async function init(m) {
	if(inited){
		return;
	}
	// this is reached when everything is ready, and you can call methods on Module		
	m._init_context_();
	libbf = m;
	minus_one = bf(-1,10,false,true);
	zero = bf(0,10,false,true);
	half = bf(0.5,10,false,true);
	one = bf(1,10,false,true);
	two = bf(2,10,false,true);
	three = bf(3,10,false,true);
	PI = bf(bf().setPI(),10,false,true);
	E = bf(bf(1).exp(),10,false,true);
	inited=true;
	return true;
}

/**
 * @param {...(BigFloat | number | string | bigint)} args 
 * @returns {BigFloat}
 */
export function max(...args){
	let t=args.map(v=>v instanceof BigFloat?v:bf(v));
	let ret=args[0];
	for(let i=1;i<args.length;++i){
		if(args[i].cmp(ret)>0){
			ret=args[i];
		}
	}
	return ret;
}


/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function sqrt(v,prec=0) {
	return bf(v).sqrt(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @param {number} [rnd_mode=0] 
 * @returns {BigFloat}
 */
export function fpround(v,prec=0,rnd_mode=0) {
	return bf(v).fpround(prec,rnd_mode);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function round(v,prec=0) {
	return bf(v).round(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function trunc(v,prec=0) {
	return bf(v).trunc(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function floor(v,prec=0) {
	return bf(v).floor(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function ceil(v,prec=0) {
	return bf(v).ceil(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function neg(v,prec=0) {
	return bf(v).neg(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function abs(v,prec=0) {
	return bf(v).abs(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function sign(v,prec=0) {
	return bf(v).sign(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function exp(v,prec=0) {
	return bf(v).exp(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function log(v,prec=0) {
	return bf(v).log(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {BigFloat | number | string | bigint} b 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function pow(v,b,prec=0) {
	return bf(v).pow(b,prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function cos(v,prec=0) {
	return bf(v).cos(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function sin(v,prec=0) {
	return bf(v).sin(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function tan(v,prec=0) {
	return bf(v).tan(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function atan(v,prec=0) {
	return bf(v).atan(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function atan2(v,prec=0) {
	return bf(v).atan2(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function asin(v,prec=0) {
	return bf(v).asin(prec);
}

/**
 * @param {BigFloat | number | string | bigint} v 
 * @param {number} [prec=0] 
 * @returns {BigFloat}
 */
export function acos(v,prec=0) {
	return bf(v).acos(prec);
}



export * from "./complex.js";
export * from "./polyfit.js";
export * from "./ode45.js";
export * from "./fminbnd.js";
export * from "./roots.js";
export * from "./fzero.js";
export * from "./romberg.js";

export * from "./frac.js";
export * from "./poly.js";
export * from "./scalar.js";


