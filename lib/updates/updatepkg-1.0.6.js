'use strict';

module.exports = {
	message: 'Loading Stukko update package 1.0.6.',
	min: '1.0.0',                                           // min version required to use update.
	files: [                                                // files that must be updated.
		{ src: '/lib/structure/gulpfile.js', dest: '/gulpfile.js' }
	]
};