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
    browserify = require('gulp-browserify'),
	es = require('event-stream'),
	isDev,
	assets,
	assetKeys,
    viewExt;


// make sure we have a valid config file.
if(!fs.existsSync(p.join(process.cwd(), '/server/configuration/active.json')))
	throw new Error('Active configuration not found. Be sure you run your app once before running Gulp manually.');

// parse the configuration file, set vars.
config = require(p.join(process.cwd(), '/server/configuration/active.json'));
assets = config.assets || {};
isDev = config.env === 'development';
assetKeys = Object.keys(assets);
viewExt = config.express['view engine'] || 'html';

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
	if(typeof obj === 'string' || obj instanceof String)
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
                    if(ext === 'views')
                        ext = viewExt;
					d += ('/**/*.' + ext);
				}
				if(result.indexOf(d) === -1)
					result.push(d);
			});
		}
	});
	return result;
}
// backup project to external location.
function backup() {
	if(!config.backup) return;
	var src = ['!./node_modules/**/*.*', './**/*.*'],
		bkup = gulp.src(src)
			.pipe(gulp.dest(config.backup));
	return es.concat(bkup);
}
function restore() {
	if(!config.backup) return;
	var src = config.backup,
		rest = gulp.src(src)
			.pipe(gulp.dest('./'));
	return es.concat(rest);
}
// cleans output directories.
function clear() {
	if(!assets.clean) return;
    var sources, exclude;
    exclude = assets.clean.exclude;
    sources = exclude.concat(concatDest(true));
	return gulp.src(sources, {read: false})
		.pipe(clean());
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

// concat files such as AngularJs, Ember, Backbone frameworks etc.
function bundle() {

    if(!assets.bundle) return;

    var bundleKeys = Object.keys(assets.bundle),
        tasks;

    bundleKeys.forEach(function (v){

        var bundle = assets.bundle[v],
            exclude;

        if(!bundle) return;

        exclude = bundle.exclude || [];

        if(!(exclude[0] instanceof Array))
            exclude = [exclude];

        tasks = bundle.src.map(function (globs, idx){

            var dest = bundle.dest[idx] || bundle.dest[0],
                name = bundle.concat[idx] || bundle.concat[0],
                excluded = exclude[idx],
                src = excluded.concat(globs),
                conf = bundle.config || {};

            if(!dest) return;

            if(bundle.strategy === 'concat') {
                if(bundle.minify && !isDev) {
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

            if(bundle.strategy === 'browserify'){
                if(bundle.minify && !isDev) {
                    return gulp.src(src)
                        .pipe(browserify(conf))
                        .pipe(concat(name))
                        .pipe(uglify())
                        .pipe(gulp.dest(dest));

                } else {
                    return gulp.src(src)
                        .pipe(browserify(conf))
                        .pipe(concat(name))
                        .pipe(gulp.dest(dest));
                }
            }

        });

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

function link () {

	// asset linking must be valid object
	// for management dashboard.
	if(!assets.link || (!assets.link.common && !assets.link.application && !assets.link.cdn)) return;
	var layoutRoot, layoutDest, layout, sources, sourcesApp,
		commonConf, appConf;

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

    var bundleKeys;

	// only watch if development.
	if(!isDev) return;

    if(assets.mixin && assets.mixin.watch && assets.mixin.src)
	    gulp.watch(assets.mixin.src, mixin);
    if(assets.minify && assets.minify.watch && assets.minify.src)
        gulp.watch(assets.minify.src, minify);
    if(assets.preprocess && assets.preprocess.watch && assets.preprocess.src)
	    gulp.watch(assets.preprocess.watch, preprocess);
    if(assets.html && assets.html.watch && assets.html.src)
	    gulp.watch(assets.html.src, html);

  if(assets.bundle) {
        bundleKeys = Object.keys(assets.bundle);
        bundleKeys.forEach(function (v) {
            var b = assets.bundle[v];
            if(b && b.watch)           
                gulp.watch(b.src, bundle);            
        });
    }
}
/* DEFINE TASKS
 *****************************************************/
gulp.task('clean', clear);
gulp.task('mixin', ['clean'], mixin);
gulp.task('minify', ['clean', 'mixin'], minify);
gulp.task('preprocess', ['clean', 'mixin', 'minify'], preprocess);
gulp.task('bundle', ['clean', 'mixin', 'minify', 'preprocess'], bundle);
gulp.task('html', ['clean', 'mixin', 'minify', 'preprocess', 'bundle'], html);
gulp.task('watch', ['clean', 'mixin', 'minify', 'preprocess', 'bundle', 'html'], watch);
gulp.task('link', [ 'clean', 'mixin', 'minify', 'preprocess', 'bundle', 'html', 'watch'], link);

/* BUILD & DEV TASKS
 ******************************************************/

// builds the project.
gulp.task('build', ['link']);

// backup application to the location
// specified in your config.
gulp.task('backup', backup);

// restore application from backup location
// specified in your config.
gulp.task('restore', restore);