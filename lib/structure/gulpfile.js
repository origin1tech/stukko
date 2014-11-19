'use strict';

    // base requires
var p = require('path'),
    es = require('event-stream'),
    del = require('del'),

    // gulp specific modules.
	gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    loaded = false,
    bundled = false,

    // declare vars.
    config,
	assets,
    bundles,
    links,
    cleanDests;

function requireModule(path) {
    try {
        return require(path);
    } catch(e) {
        console.log(e);
        return false;
    }
}

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
function unique(arr, excludes) {
    var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
    excludes = excludes || false;
    return arr.filter(function(item) {
        var type = typeof item;
        if(excludes && item.charAt(0) === '!') return false;
        if(type in prims)
            return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
        else
            return objs.indexOf(item) >= 0 ? false : objs.push(item);
    });
}

// iterates bundles and prepares cleaning paths.
function getCleanDests() {
    var bundleKeys = Object.keys(bundles),
        globs = [];
    bundleKeys.forEach(function (k) {
        var bundle = bundles[k],
            arr;
        if(bundle && bundle.clean) {
            arr = normalizeArray(bundle.clean, bundle.dest);
            if(bundle.cleanAppend)
                arr = appendPath(arr, bundle.cleanAppend);
            globs = globs.concat(arr);
        }
    });
    return unique(globs);
}

function getBowerMains(jsonPath, compPath, preserve) {
    var deps, arr;
    arr = [];
    jsonPath = jsonPath || 'bower.json';
    compPath = compPath || 'bower_components';
    preserve = preserve === true ? '**' : '';
    function normalizePath(path) {
        return path.replace(/\\/g, '/');
    }
    // if object assume dependencies passed.
    if((jsonPath instanceof Array)) {
        deps = jsonPath;
    } else {
        jsonPath = p.join(process.cwd(), jsonPath);
        var json = requireModule(jsonPath);
        if(!json || !json.dependencies)
            throw new Error('Unable to load bower dependencies using path ' + jsonPath);
        deps = Object.keys(json.dependencies);
    }
    // iterate and run the paths.
    deps.forEach(function (v) {
        var bowerModule = p.join(process.cwd(), compPath, v, 'bower.json'),
            moduleMain;
        moduleMain = requireModule(bowerModule).main;
        if((moduleMain instanceof Array)){
            var tmpArr = [];
            moduleMain.forEach(function (m) {
               tmpArr.push('./' + normalizePath(p.join(compPath, preserve, v, m)));
            });
            arr = arr.concat(tmpArr);
        } else {
           arr.push('./' + normalizePath(p.join(compPath, preserve, v, moduleMain)));
        }
    });
    return arr;
}

// Stukko must be run at least once
// before running gulp manually.
// parse the active configuration.
// must have config to continue.
config = requireModule(p.join(process.cwd(), '/server/configuration/active.json'));
if(!config)
    throw new Error('Active configuration not found. Be sure you run ' +
                    'your app once before running Gulp manually.');
// set assets to var
assets = config.assets;

// make sure we have assets to process.
if(!assets || !assets.enabled)
    return console.warn('Asset building is disabled for this application.');

//viewExt = config.express['view engine'] || 'html';
bundles = assets.bundle || {};
links = assets.link || {};

// bug make sure filter exists.
if(!plugins.filter)
    plugins.filter = require('gulp-filter');

// set clean locations
cleanDests = getCleanDests();

// cleans output paths prior to bundling.
gulp.task('clean', function (cb) {
    // prevent cleaning of main layout.
    var layout = '!.' + config.express.views + '/' +	config.express.layout +
        '.' + config.express['view engine'];
    cleanDests = [layout].concat(cleanDests);
    del(cleanDests, cb);
});

// bundles various assets for application.
gulp.task('bundle', ['clean'], function () {

    var keys = Object.keys(bundles),
        tasks = [];

    // nothing to process.
    if(!keys.length) return;

    // iterate keys and run tasks.
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
        jsFilter    =  plugins.filter (bundle.filter || '**/*.js');
        cssFilter   =  plugins.filter (bundle.filter || '**/*.css');
        lessFilter  =  plugins.filter (bundle.filter || '**/*.less');
        sassFilter  =  plugins.filter (bundle.filter || '**/*.scss');
        htmlFilter  =  plugins.filter (bundle.filter || '**/*.html');

        // copy action.
        if(bundle.strategy === 'copy' || bundle.strategy === 'bower') {

            if(bundle.strategy === 'bower'){
                // preserve orig. src.
                var origSrc = bundle.src || [],
                    mains;
                bundle.preserveStructure = bundle.preserveStructure !== false;
                mains = getBowerMains(bundle.jsonPath, bundle.componentPath, bundle.preserveStructure);
                bundle.src = origSrc.concat(mains || []);
            }

            if(bundle.minify) {

                // ensures that html is minified.
                bundle.options.env = bundle.options.env || 'production';

                task = gulp.src(normalizeArray(bundle.src))

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

                task = gulp.src(normalizeArray(bundle.src))

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

                task = gulp.src(normalizeArray(bundle.src))

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

                task = gulp.src(normalizeArray(bundle.src))
                    .pipe(plugins.concat(bundle.as, bundle.options))
                    .pipe(gulp.dest(bundle.dest));
            }
        }

        // browserify action.
        if(bundle.strategy === 'browserify'){

            if(bundle.minify){

                task = gulp.src(normalizeArray(bundle.src))
                    .pipe(plugins.browserify(bundle.options))
                    .pipe(plugins.uglify())
                    .pipe(gulp.dest(bundle.dest));

            } else {

                task = gulp.src(normalizeArray(bundle.src))
                    .pipe(plugins.browserify(bundle.options))
                    .pipe(gulp.dest(bundle.dest));

            }
        }

        // add the tasks to the collection.
        if(task){
            tasks.push(task);
        }

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

    // iterate keys and run tasks.
    keys.forEach(function(k) {

        var link = links[k],
            task,
            layoutRoot,
            layoutDest,
            layout;

        layoutRoot = '.' + config.express.views + '/' +	config.express.layout;

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
            .pipe(plugins.inject(gulp.src(normalizeArray(link.src), { read: false }), link.options))
            .pipe(gulp.dest(link.dest));

        tasks.push(task);

    });

    this.doneCallback = function doneCallback() {
        bundled = true;
    };

    // concat the event stream and return.
    return es.concat.apply(null, tasks);

});

// primary run task
gulp.task('build', ['clean', 'bundle', 'link'], function () {

    // add watches.
    var keys = Object.keys(bundles);
    if(assets.livereload)
        plugins.livereload.listen();
    loaded = true;

    keys.forEach(function (k) {
        var bundle = bundles[k],
            globs;
        if(bundle && bundle.watch){
            // just use src if true.
            if(typeof bundle.watch === 'boolean')
                globs = normalizeArray(bundle.src);
            // if string or array normalize and use it.
            if(typeof bundle.watch === 'string' || (bundle.watch instanceof Array))
                globs = normalizeArray(bundle.watch);
            // make sure we actually have globs to be safe.
            if(globs){
               var watcher = gulp.watch(
                    globs,
                    {debounceDelay: 200},
                    ['clean', 'bundle', 'link']
                );

                if(assets.livereload)
                    watcher.on('change', function () {
                        // start interval only if loaded.
                        if(loaded)
                            var interval = setInterval(function () {
                                if(gulp.tasks.bundle.done){
                                    clearInterval(interval);
                                    plugins.livereload.changed();
                                }
                            },assets.livereloadInterval || 200);
                    });
            }
        }
    });
});

