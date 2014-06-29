'use strict';

module.exports = {
	message: 'Loading Stukko update package 1.0.5.',
	min: '1.0.0',                                           // min version required to use update.
	diff: 4,                                                // version can be no greater than x version(s) back.
	files: [                                                // files that must be updated.
		{ src: '/lib/structure/gulpfile.js', dest: '/gulpfile.js' }
	]
};