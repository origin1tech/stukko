'use strict';

var fs = require('fs'),
	gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	concat = require ('gulp-concat'),
	cssmin = require('gulp-cssmin'),
	watcher = require('gulp-watch'),
	less = require('gulp-less'),
	sass = require('gulp-sass'),
	gulpif = require('gulp-if'),
	clean = require('gulp-clean'),
	inject = require('gulp-inject'),
	argv = require('yargs').argv,
	config = argv.config || 'development',
	options = argv.options || undefined,
	es = require('event-stream'),
	syncDest,
	isdev,
	assets,
	assetKeys,
	syncPaths;

// make sure we have a valid config file.
if(!fs.existsSync('./server/configuration/' + config + '.json'))
	throw new Error('Unable to build assets. The configuration could not be found.');

// parse the configuration file, set vars.
config = require('./server/configuration/' + config + '.json');
assets = config.assets || {};
isdev = config.env === 'development';
assetKeys = Object.keys(assets);
syncDest = config.sync.dest; // NOTE: syncTo path is relative to the cwd.
syncPaths = config.sync.paths;

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

// backup css and js dirs before processing.
// this is good if you temporarily add some files
// to your public dir then rebuild and whamo they're gone!
// I'll let you figure out why I added this feature..lol.
function backup() {
	if(!assets.backup) return;
	var web, manage;
	web = gulp.src('./web/public/**/*.*')
			.pipe(gulp.dest('./.backup/web/public'));
	manage = gulp.src('./manage/public/**/*.*')
		.pipe(gulp.dest('./.backup/manage/public'));
	return es.concat(web, manage);
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

/**
 * TODO consider splitting up manage and app linking function.
 * @returns {*}
 */
function link () {

	// asset linking must be valid object
	// for management dashboard.
	if(!assets.link) return;

	var layout, sources, sourcesApp, commonAppSrc, commonManageSrc, appSrc, manageSrc,
		appLink, manageLink, commonAppConf, appConf, commonManageConf, manageConf;

	// clone confs even though they are similar
	// otherwise we could end up with unwanted prefixing.
	// hacky clone but don't want to require lodash/underscore.
	commonAppConf = JSON.parse(JSON.stringify(assets.link.common));
	commonManageConf = JSON.parse(JSON.stringify(assets.link.common));
	appConf = JSON.parse(JSON.stringify(assets.link.application));
	manageConf = JSON.parse(JSON.stringify(assets.link.application));

	layout = '.' + config.express.views + '/' +
			 config.express.layout + '.' +
			 config.express['view engine'];

	// build common globs
	if(assets.link.common) {
		// iterate app files make sure excluded from common.
		if(assets.link.application){
			assets.link.application.files.forEach(function(glob) {
				if(assets.link.common.exclude.indexOf(glob) === -1)
					assets.link.common.exclude.push('!' + glob);
			});
		}
		sources = assets.link.common.exclude.concat(assets.link.common.files);
		commonAppSrc = [];
		commonManageSrc = [];
		sources.forEach(function(glob) {
			if(/manage/gi.test(glob))
				commonManageSrc.push(glob);
			else
				commonAppSrc.push(glob);
		});
	}

	// build app globs.
	sourcesApp = assets.link.application.exclude.concat(assets.link.application.files);
	appSrc = [];
	manageSrc = [];
	sourcesApp.forEach(function(glob) {
		if(/manage/gi.test(glob))
			manageSrc.push(glob);
		else
			appSrc.push(glob);
	});

	appLink = gulp.src(layout)
		.pipe(inject(gulp.src(commonAppSrc, { read: false }), commonAppConf))
		.pipe(inject(gulp.src(appSrc, { read: false }), appConf))
		.pipe(gulp.dest('.' + config.express.views));

	commonManageConf.addPrefix = '/manage';
	manageConf.addPrefix = '/manage';
	// TODO: disable management build, move to own method.
//	manageLink = gulp.src('./manage/views/manage.html')
//		.pipe(inject(gulp.src(commonManageSrc, { read: false }), commonManageConf))
//		.pipe(inject(gulp.src(manageSrc, { read: false }), manageConf))
//		.pipe(gulp.dest('./manage/views'));

	//return es.concat(appLink, manageLink);
	return es.concat(appLink);

}

// used in dev of Stukko sync template project
// to main stukko project src.
// if you wish to use this feature set sync.dest
// to the destination path. set sync.paths to
// the globs you wish to sync to the destination.
function sync() {
	gulp.src(syncPaths, { base: './'})
		.pipe(gulp.dest(syncDest));
}

function watch() {
	var mix, min, pre, frame;
	// only watch if development.
	if(!isdev) return;
	mix = watcher({ name: 'mixin', glob: assets.mixin.src }, mixin);
	min = watcher({ name: 'minify', glob: assets.minify.src }, minify);
	pre = watcher({ name: 'preprocess', glob: ['./web/assets/preprocess/**/*.sass', './manage/assets/preprocess/**/*.less'] }, preprocess);
	frame = watcher({ name: 'framework', glob: assets.framework.src }, framework);
}


/* DEFINE TASKS
 *****************************************************/
gulp.task('backup', backup);
gulp.task('clean', ['backup'], clear);
gulp.task('mixin', ['backup', 'clean'], mixin);
gulp.task('minify', ['backup', 'clean', 'mixin'], minify);
gulp.task('preprocess', ['backup', 'clean', 'minify'], preprocess);
gulp.task('framework', ['backup', 'clean', 'preprocess'], framework);
gulp.task('watch', ['mixin', 'minify', 'preprocess', 'framework'], watch);
gulp.task('link', ['watch'], link);
gulp.task('sync', sync);
 
gulp.task('build', ['link']);






