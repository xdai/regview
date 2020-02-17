export function str2hex(s) {
	return parseInt(s, 16);
}

export function num2hexstr(n) {
	return "0x" + ("00000000" + n.toString(16)).toUpperCase().substr(-8);
}

export function isNumberString(s) {
	const _s = s.trim();
	return !!(
		_s.match(/^[1-9]\d*$/)     || // decimal, e.g. "128"
		_s.match(/^0[0-7]*$/)      || // octal, e.g. "073"
		_s.match(/^0x[0-9a-f]+$/i) || // hex, e.g. "0x07"
		_s.match(/^[0-9a-f]+h$/i)  || // hex, e.g. "07h"
		_s.match(/^0b[01]+$/i)        // binary, e.g. "0b1011"
	);
}

export function parseNumberString(s) {
	const _s = s.trim();
	if (_s.match(/^[1-9]\d*$/)) {  // decimal
		return parseInt(_s, 10);
	} else if (_s.match(/^0[0-7]*$/)) { // octal
		return parseInt(_s, 8);
	} else if (_s.match(/^0x[0-9a-f]+$/i)) { // hex, e.g. "0x07"
		return parseInt(_s, 16);
	} else if (_s.match(/^[0-9a-f]+h$/i)) { // hex, e.g. "07h"
		return parseInt(_s.slice(0, -1), 16);
	} else if (_s.match(/^0b[01]+$/i)) { // binary, e.g. "0b1011"
		return _s.slice(2).split("").reduce((acc, cur) => (acc << 1) | cur, 0);
	} else {
		return NaN;
	}
}

export function isInRange(n, range) {
	return (range[0] <= n && n <= range[1]) || (range[1] <= n && n <= range[0]);
}

export function splitKey(key) {
	if (!key) {
		return [undefined, undefined];
	}
	
	if (key === '/') {
		return [undefined, '/'];
	}

	return key.match(/^(.*\/)(.+)$/).slice(1, 3);
}