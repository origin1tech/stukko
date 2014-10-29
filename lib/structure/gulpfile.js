'use strict';

// base requires
var fs = require('fs'),
    p = require('path'),
    es = require('event-stream'),
    del = require('del'),
    order = require('gulp-order'),

// gulp specific modules.
    gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),

// declare vars.
    config,
    assets,
    bundles,
    links,
    cleanPaths;


// Stukko must be build at least once
// before running gulp manually.
if(!fs.existsSync(p.join(process.cwd(), '/server/configuration/active.json')))
    throw new Error('Active configuration not found. Be sure you run ' +
        'your app once before running Gulp manually.');

// parse the active configuration.
config = require(p.join(process.cwd(), '/server/configuration/active.json'));
assets = config.assets;

// make sure we have assets to process.
if(!assets || !assets.enabled)
    return console.warn('Asset building is disabled for this application.');

//viewExt = config.express['view engine'] || 'html';
bundles = assets.bundle || {};
links = assets.link || {};
cleanPaths = [];

// normalizes to any array.
function normalizeArray(obj, alt){
    if(obj instanceof Array) return obj;
    if(typeof obj === 'string' || obj instanceof String)
        return [obj];
    if(typeof obj === 'boolean')
        return normalizeArray(alt);
    return [];
}

// appends string to glob/paths in array.
function appendPath(arr, append) {
    var tmpArr = [];
    append = normalizeArray(append);
    arr.forEach(function (v) {
        append.forEach(function (a) {
            tmpArr.push(v + a);
        });
    });
    return tmpArr;
}

// iterates array of elements
// removing any duplicates.
function unique(arr) {
    var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
    return arr.filter(function(item) {
        var type = typeof item;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}

// iterates bundles and prepares cleaning paths.
for (var prop in bundles){
    if(bundles.hasOwnProperty(prop)){
        var bundle = bundles[prop],
            arr;
        if(bundle.clean){
            arr = normalizeArray(bundle.clean, bundle.dest);
            if(bundle.cleanAppend)
                arr = appendPath(arr, bundle.cleanAppend);
            cleanPaths = cleanPaths.concat(arr);
        }
    }
}
cleanPaths = unique(cleanPaths);

// cleans output paths prior to bundling.
gulp.task('clean', function (cb) {
    del(cleanPaths, cb);
});

// bundles various assets for application.
gulp.task('bundle', ['clean'], function () {

    var keys = Object.keys(bundles),
        tasks = [];

    // nothing to process.
    if(!keys.length) return;

    // iterate keys and build tasks.
    keys.forEach(function(k) {
        var bundle = bundles[k],
            jsFilter,
            cssFilter,
            lessFilter,
            sassFilter,
            htmlFilter,
            task;

        // strategy is required.
        if(!bundle.strategy) return;

        // set some defaults.
        bundle.options = bundle.options || {};

        // predefined filters.
        jsFilter = plugins.filter(bundle.filter || '**/*.js');
        cssFilter = plugins.filter(bundle.filter || '**/*.css');
        lessFilter = plugins.filter(bundle.filter || '**/*.less');
        sassFilter = plugins.filter(bundle.filter || '**/*.scss');
        htmlFilter = plugins.filter(bundle.filter || '**/*.html');

        // copy action.
        if(bundle.strategy === 'copy'){

            if(bundle.minify) {

                // ensures that html is minified.
                bundle.options.env = bundle.options.env || 'production';

                task = gulp.src(bundle.src)

                    // js
                    .pipe(jsFilter)
                    .pipe(plugins.uglify(bundle.options))
                    .pipe(jsFilter.restore())

                    // css
                    .pipe(cssFilter)
                    .pipe(plugins.cssmin(bundle.options))
                    .pipe(cssFilter.restore())

                    // less
                    .pipe(lessFilter)
                    .pipe(plugins.less(bundle.options))
                    .pipe(plugins.cssmin(bundle.options))
                    .pipe(lessFilter.restore())

                    // sass
                    .pipe(sassFilter)
                    .pipe(plugins.sass(bundle.options))
                    .pipe(plugins.cssmin(bundle.options))
                    .pipe(sassFilter.restore())

                    // html
                    .pipe(htmlFilter)
                    .pipe(plugins.htmlMinifier(bundle.options))
                    .pipe(htmlFilter.restore())

                    .pipe(gulp.dest(bundle.dest));

            } else {

                task = gulp.src(bundle.src)

                    // less
                    .pipe(lessFilter)
                    .pipe(plugins.less(bundle.options))
                    .pipe(lessFilter.restore())

                    // sass
                    .pipe(sassFilter)
                    .pipe(plugins.sass(bundle.options))
                    .pipe(sassFilter.restore())

                    // html
                    .pipe(htmlFilter)
                    .pipe(plugins.htmlMinifier(bundle.options))
                    .pipe(htmlFilter.restore())

                    .pipe(gulp.dest(bundle.dest));

            }


        }

        // concat action.
        if(bundle.strategy === 'concat'){

            // minification only supported by
            // css and js.
            if(bundle.minify) {

                task = gulp.src(bundle.src)

                    .pipe(plugins.concat(bundle.as, bundle.options))

                    // css.
                    .pipe(cssFilter)
                    .pipe(plugins.cssmin(bundle.options))
                    .pipe(cssFilter.restore())

                    // js.
                    .pipe(jsFilter)
                    .pipe(plugins.uglify(bundle.options))
                    .pipe(jsFilter.restore())

                    .pipe(gulp.dest(bundle.dest));
            } else {

                task = gulp.src(bundle.src)
                    .pipe(plugins.concat(bundle.as, bundle.options))
                    .pipe(gulp.dest(bundle.dest));
            }
        }

        // browserify action.
        if(bundle.strategy === 'browserify'){

            if(bundle.minify){

                task = gulp.src(bundle.src)
                    .pipe(plugins.browserify(bundle.options))
                    .pipe(plugins.uglify())
                    .pipe(gulp.dest(bundle.dest));

            } else {

                task = gulp.src(bundle.src)
                    .pipe(plugins.browserify(bundle.options))
                    .pipe(gulp.dest(bundle.dest));

            }
        }

        // add the tasks to the collection.
        tasks.push(task);

    });

    // concat the event stream and return.
    return es.concat.apply(null, tasks);

});

// links assets after bundling.
gulp.task('link', ['clean', 'bundle'], function () {

    var keys = Object.keys(links),
        tasks = [];

    // nothing to process.
    if(!keys.length) return;

    // iterate keys and build tasks.
    keys.forEach(function(k) {

        var link = links[k],
            orderSrc = [],
            task,
            layoutRoot,
            layoutDest,
            layout;

        layoutRoot = '.' + config.express.views + '/' +	config.express.layout;
        link.src.forEach(function (v) {
            v = v.replace('./', '').replace('!', '');
            orderSrc.push(v);
        });

        // when to is not specified
        // defaults to layout defined is Express.
        if(!link.to){
            layout = layoutRoot +  '.' + config.express['view engine'];
            link.to = layout;
        }

        // when is not specified specified
        // defaults to views default from Express.
        if(!link.dest){
            layoutDest = layoutRoot.split('/');
            layoutDest = layoutDest.splice(0, layoutDest.length - 1).join('/');
            link.dest = layoutDest;
        }

        // create the task.
        task = gulp.src(link.to)
            .pipe(plugins.inject(
                gulp.src(link.src, { read: false })
                    .pipe(order(orderSrc)), link.options))
            .pipe(gulp.dest(link.dest));

        tasks.push(task);
    });

    // concat the event stream and return.
    return es.concat.apply(null, tasks);

});

// primary build task
gulp.task('build', ['clean', 'bundle', 'link'], function () {

    // add watches.
    var keys = Object.keys(bundles);

    keys.forEach(function (k) {
        var bundle = bundles[k],
            globs;
        if(bundle && bundle.watch){
            // just use src if true.
            if(typeof bundle.watch === 'boolean')
                globs = bundle.src;
            // if string or array normalize and use it.
            if(typeof bundle.watch === 'string' || (bundle.watch instanceof Array))
                globs = normalizeArray(bundle.watch);
            // make sure we actually have globs to be safe.
            if(globs){
                gulp.watch(
                    globs,
                    {debounceDelay: 400},
                    ['clean', 'bundle', 'link']
                );
            }
        }
    });

});