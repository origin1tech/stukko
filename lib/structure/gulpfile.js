'use strict';

var fs = require('fs'),
    p = require('path'),
	gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	concat = require ('gulp-concat'),
	cssmin = require('gulp-cssmin'),
	less = require('gulp-less'),
	sass = require('gulp-sass'),
	gulpif = require('gulp-if'),
	clean = require('gulp-rimraf'),
	inject = require('gulp-inject'),
	htmlmin = require('gulp-html-minifier'),
	argv = require('yargs').argv,
	config = argv.config || 'development',
	es = require('event-stream'),
	isDev,
	assets,
	assetKeys;


// make sure we have a valid config file.
if(!fs.existsSync(p.join(process.cwd(), '/server/configuration/active.json')))
	throw new Error('Active configuration not found. Be sure you run your app once before running Gulp manually.');

// parse the configuration file, set vars.
config = require(p.join(process.cwd(), '/server/configuration/active.json'));
assets = config.assets || {};
isDev = config.env === 'development';
assetKeys = Object.keys(assets);

// temp hack for html layout/linking.
var htmlInterval;
function startInterval() {
    htmlInterval = setInterval(function () {
        if(gulp.tasks.html.done){
            clearInterval(htmlInterval);
            link();
        }
    },100);
}

/* NORMALIZE ASSETS
 ******************************************************/

// normalize array in case string is passed for src, concat, dest.
function normalizeArray(obj){
	if(obj instanceof Array) return obj;
	if(typeof obj == 'string' || obj instanceof String)
		return [obj];
	return obj;
}
// iterate and noralize the src, dest and concat.
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
		if(dest){
			dest = normalizeArray(dest);
			if(!(dest instanceof Array)) return [];
			dest.forEach(function (d){
				// folder name must match extension for append to work.
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
		.pipe(clean({force: true}));
}
// concats and creates mixin by file type.
function mixin() {
	if(!assets.mixin || !assets.mixin.src) return;
	var tasks = assets.mixin.src.map(function (src, idx){
		var dest = assets.mixin.dest[idx] || undefined,
			name = assets.mixin.concat[idx];
		if(!dest) return;
		if(isDev){
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
		if(isDev) {
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
		if(isDev) {
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
		if(isDev) {
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
function html() {

	if(!assets.html) return;
	var sources = assets.html.exclude.concat(assets.html.src),
        tasks;
	assets.html.env = config.env;
	tasks = sources.map(function (src, idx){
		var dest = assets.html.dest[idx] || assets.html.dest[0] || undefined;
		if(!dest) return;
		return gulp.src(src)
			.pipe(htmlmin(assets.html))
			.pipe(gulp.dest(dest));

	});
    startInterval();
	return es.concat.apply(null, tasks);
}
/**
 * TODO consider splitting up manage and app linking function.
 * @returns {*}
 */
function link () {
	// asset linking must be valid object
	// for management dashboard.
	if(!assets.link || (!assets.link.common && !assets.link.application && !assets.link.cdn)) return;
	var layoutRoot, layoutDest, layout, sources, sourcesApp,
		appLink, commonConf, appConf;

	// set defaults to prevent errors.
	sources = [];
	sourcesApp = [];
	commonConf = {};
	appConf = {};

	layoutRoot = '.' + config.express.views + '/' +	config.express.layout;
	layoutDest = layoutRoot.split('/');
	layoutDest = layoutDest.splice(0, layoutDest.length - 1).join('/');
	layout = layoutRoot +  '.' + config.express['view engine'];

	// build common globs
	if(assets.link.common) {
		assets.link.common.exclude = assets.link.common.exclude || [];
		// iterate app files make sure excluded from common.
		if(assets.link.application){
			assets.link.application.files = assets.link.application.files || [];
			assets.link.application.files.forEach(function(glob) {
				if(assets.link.common.exclude.indexOf(glob) === -1)
					assets.link.common.exclude.push('!' + glob);
			});
		}
		sources = assets.link.common.exclude.concat(assets.link.common.files);
		// hacky clone but don't want to require lodash/underscore.
		commonConf = JSON.parse(JSON.stringify(assets.link.common));
	}

	// build app globs.
	if(assets.link.application) {
		assets.link.application.exclude = assets.link.application.exclude || [];
		sourcesApp = assets.link.application.exclude.concat(assets.link.application.files);
		appConf = JSON.parse(JSON.stringify(assets.link.application));
	}

	// link it all up.
    return gulp.src(layout)
        .pipe(inject(gulp.src(sources, { read: false }), commonConf))
        .pipe(inject(gulp.src(sourcesApp, { read: false }), appConf))
        .pipe(gulp.dest(layoutDest));

}

function watch() {

	// only watch if development.
	if(!isDev) return;
	gulp.watch(assets.mixin.src, mixin);
    gulp.watch(assets.minify.src, minify);
	gulp.watch(assets.preprocess.watch, preprocess);
    gulp.watch(assets.framework.src, framework);
	gulp.watch(assets.html.src, html);

}
/* DEFINE TASKS
 *****************************************************/
gulp.task('clean', clear);
gulp.task('mixin', ['clean'], mixin);
gulp.task('minify', ['clean', 'mixin'], minify);
gulp.task('preprocess', ['clean', 'mixin', 'minify'], preprocess);
gulp.task('framework', ['clean', 'mixin', 'minify', 'preprocess'], framework);
gulp.task('html', ['clean', 'mixin', 'minify', 'preprocess', 'framework'], html);
gulp.task('watch', ['clean', 'mixin', 'minify', 'preprocess', 'framework', 'html'], watch);
gulp.task('link', [ 'clean', 'mixin', 'minify', 'preprocess', 'framework', 'html', 'watch'], link);

/* BUILD & DEV TASKS
 ******************************************************/

// builds the project.
gulp.task('build', ['link']);
