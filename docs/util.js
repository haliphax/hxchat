/** hashing algorithm: https://stackoverflow.com/a/15710692 */
const hash = s => {
	const reduced = s.split('').reduce(
		(a, b) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		},
		0);

	return Math.abs(reduced).toString(16);
};

/** parsed hash string (key-value pairs become object properties) */
const hs = Object.fromEntries(
	window.location.hash.substring(1)?.split('&').map(v => v.split('=')) ?? []);

export { hash, hs };
