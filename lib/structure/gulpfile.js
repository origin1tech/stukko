'use strict';

var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	concat = require ('gulp-concat'),
	cssmin = require('gulp-cssmin'),
	less = require('gulp-less'),
	sass = require('gulp-sass'),
	paths;

paths = {
	mixin: undefined,
	minify: undefined,
	less: undefined,
	sass: undefined
};

gulp.task('mixin', function () {
	if(!paths.mixin) return;
});

gulp.task('minify', function () {
	if(!paths.minify) return;
});

gulp.task('less', function () {
	if(!paths.less) return;
});

gulp.task('sass', function () {
	if(!paths.sass) return;
});


gulp.task('watch', function () {
	gulp.watch(paths.mixin, ['mixin']);
	gulp.watch(paths.minify, ['minify']);
	gulp.watch(paths.less, ['less']);
	gulp.watch(paths.sass, ['sass']);
});

gulp.task('default', ['mixin', 'minify', 'less', 'sass', 'watch']);