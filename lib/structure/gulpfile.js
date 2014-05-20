'use strict';

var fs = require('fs'),
	gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	concat = require ('gulp-concat'),
	cssmin = require('gulp-cssmin'),
	less = require('gulp-less'),
	sass = require('gulp-sass'),
	gulpif = require('gulp-if'),
	clean = require('gulp-clean'),
	inject = require('gulp-inject'),
	rename = require('gulp-rename'),
	argv = require('yargs').argv,
	config = argv.config || 'development',
	es = require('event-stream'),
	isdev,
	assets,
	assetKeys;

// make sure we have a valid config file.
if(!fs.existsSync('./app/configuration/' + config + '.json'))
	throw new Error('Unable to build assets. The configuration could not be found.');

// parse the configuration file, set vars.
config = require('./app/configuration/' + config + '.json');
assets = config.assets || undefined;
isdev = config.env === 'development';

// just in case return if no assets.
if(!assets) return;

/* NORMALIZE ASSETS
 ******************************************************/

// normalize array in case string is passed for src, concat, dest.
function normalizeArray(obj){
	if(obj instanceof Array) return obj;
	if(typeof obj == 'string' || obj instanceof String)
		return [obj];
	return obj;
}

// save all asset keys.
assetKeys = Object.keys(assets);

// iterate and normalize the src, dest and concat.
assetKeys.forEach(function (k) {
	var asset = assets[k];
	if((typeof asset).toString() === 'object' && !(asset instanceof Array)){
		// all assets require a src and dest.
		asset.src = normalizeArray(asset.src);
		asset.dest = normalizeArray(asset.dest);
		// if concat normalize as well.
		if(asset.concat)
			asset.concat = normalizeArray(asset.concat);
	}
});


/* DEFINE BUSINESS LOGIC
 *****************************************************/

// determines if default file type.
function defType(file) {
	return /^.+\.(css|less)$/.test(file.path);
}

// concat destinations and return unique values.
function concatDest(append) {
	var result = [],
		dest;
	assetKeys.forEach(function(k) {
		dest = assets[k].dest || undefined;
		if(dest && dest instanceof Array){
			dest.forEach(function (d){
				// note for append to work your
				// folder name must match extension.
				// ex: '/public/js' where js is the extension.
				if(append){
					var ext = d.split('/').pop();
					d += ('/**/*.' + ext);
				}
				if(result.indexOf(d) === -1)
					result.push(d);
			});
		}
	});
	return result;
}

// cleans output directories.
function clear() {
	if(!assets.clean) return;
	var dest = concatDest();
	return gulp.src(dest, {read: false})
		.pipe(clean());
}

// concats and creates mixin by file type.
function mixin() {
	if(!assets.mixin || !assets.mixin.src) return;
	var tasks = assets.mixin.src.map(function (src, idx){
		var dest = assets.mixin.dest[idx] || undefined,
			name = assets.mixin.concat[idx];
		if(!dest) return;
		if(isdev){
			return gulp.src(src)
				.pipe(concat(name))
				.pipe(gulp.dest(dest));
		} else {
			return gulp.src(src)
				.pipe(concat(name))
				.pipe(gulpif(defType, cssmin(), uglify()))
				.pipe(gulp.dest(dest));
		}
	});
	return es.concat.apply(null, tasks);
}

// minifies files by file type.
function minify() {
	if(!assets.minify || !assets.minify.src) return;
	var tasks = assets.minify.src.map(function (src, idx){
		var dest = assets.minify.dest[idx] || undefined;
		if(!dest) return;
		if(isdev) {
			return gulp.src(src)
				.pipe(gulp.dest(dest));
		} else {
			return gulp.src(src)
				.pipe(gulpif(defType, cssmin(), uglify()))
				.pipe(gulp.dest(dest));
		}
	});
	return es.concat.apply(null, tasks);
}

// process .less and .sass
function preprocess() {
	if(!assets.preprocess || !assets.preprocess.src) return;
	var tasks = assets.preprocess.src.map(function (src, idx){
		var dest = assets.preprocess.dest[idx] || assets.preprocess.dest[0] || undefined;
		if(!dest) return;
		if(isdev) {
			return gulp.src(src)
				.pipe(gulpif(defType, less(), sass()))
				.pipe(gulp.dest(dest));
		} else {
			return gulp.src(src)
				.pipe(gulpif(defType, less(), sass()))
				.pipe(cssmin())
				.pipe(gulp.dest(dest));
		}
	});
	return es.concat.apply(null, tasks);
}

// build/concat client side framework such as AngularJs, Ember, Backbone etc.
function framework() {
	if(!assets.framework || !assets.framework.src || !assets.framework.concat || !assets.framework.concat.length) return;
	var tasks = assets.framework.src.map(function (src, idx){
		var dest = assets.framework.dest[idx] || undefined,
			name = assets.framework.concat[idx];
		if(!dest) return;
		if(isdev) {
			return gulp.src(src)
				.pipe(concat(name))
				.pipe(gulp.dest(dest));
		} else {
			if(assets.framework.minify) {
				return gulp.src(src)
					.pipe(concat(name))
					.pipe(uglify())
					.pipe(gulp.dest(dest));

			} else {
				return gulp.src(src)
					.pipe(concat(name))
					.pipe(gulp.dest(dest));
			}
		}
	});
	return es.concat.apply(null, tasks);
}

function link () {
	if(!assets.link) return;
	var layout = '.' + config.express.views + '/' +
			config.express.layout + '.' +
			config.express['view engine'],
		sources = concatDest(true);
	gulp.src(layout)
		.pipe(inject(gulp.src(sources, {read: false}), assets.link))
		.pipe(gulp.dest('.' + config.express.views));
}

function watch() {
	// only watch if development.
	if(!isdev) return;
	gulp.watch(assets.mixin.src, mixin);
	gulp.watch(assets.minify.src, minify);
	gulp.watch(assets.preprocess.src, preprocess);
	gulp.watch(assets.framework.src, framework);
}

/* DEFINE TASKS
 *****************************************************/

gulp.task('clean', clear);
gulp.task('mixin', ['clean'], mixin);
gulp.task('minify', ['mixin'], minify);
gulp.task('preprocess', ['minify'], preprocess);
gulp.task('framework', ['preprocess'], framework);
gulp.task('watch', ['framework'], watch);
gulp.task('link', ['watch'], link);

//gulp.task('compile', ['mixin', 'minify', 'preprocess', 'framework']);
gulp.task('build', ['link']);






