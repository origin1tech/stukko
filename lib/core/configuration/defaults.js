'use strict';

module.exports = function () {

    var self = this;

    return  {

        // base configuration settings for your application.
        // PROPERTIES
        //      version:                        (default: undefined) the version of Stukko requried.
        //      env:                            (default: 'development') the node environment to load.
        //      host:                           (default: see below) the hose the server should listen on.
        //      port:                           (default: see below) the port the server is to listen on.
        //                                                           common env vars are provided remove in
        //                                                           config as desired.
        //      ssl:                            (default: undefined)  ssl is an object consisting of
        //                                                            { '/key: 'path/to/key', cert: '/path/to/cert' }
        //      browser:                        (default: false) when true your default browser is openned on start.    
        env: process.env.NODE_ENV || 'development',
        host: process.env.IP || process.env.HOSTNAME || 'localhost',
        port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,
        ssl: undefined,
     

        // defines what types of status errors to handle.
        // PROPERTIES
        //      handler:                        (default: error) the error handler name.
        //      timeout:                        (default: 1200) the timeout used if user handler fails.
        //      spa:                            (default: false) when true 404 errors are ignored for non-asset
        //                                                       routes. when a defined route is not found the 
        //                                                       the request renders the default layout allowing
        //                                                       client framework to handle not found paths.
        errors: {
            handler: 'error',
            timeout: 1200,
            spa: false
        },

        // db property configures your database and specified which
        // module to be used on init.
        // PROPERTIES
        //      module:                         (default: 'dirty') the database module used for your app.        
        //      modelCase:                      (default: 'capitalize') the casing of the get name options are
        //                                                              'capitalize, upper, lower, camel, pascal'.
        //      globalize:                      (default: true) sets models to GLOBAL namespace ex: $User.
        //      modelPrefix:                    (default: $) models are exposed globally hence a prefix is a good idea.
        //      connect:                        (default: true) when true creates/opens default connection otherwise
        //                                                      only returns db client for custom connections or
        //                                                      multiple connections
        //      load:                           (default: true) when true Models are loaded and exposed globally.
        //                                                      If using Sequelize set to false for migrations.
        //      drop:                           (default: true) applies only to Sequelize, causes models to be
        //                                                      dropped then recreated to apply changes, no effect
        //                                                      when "load" is false.
        //      seed:                           (default: false) applies to Sequelize, when true any seeds in
        //                                                       /server/seeds will be processed, drop/load must be set
        //                                                       to true if using Sequelize.
        db: {
            module: 'dirty',
            load: true,
            drop: true,
            seed: false
        },

        // Stukko uses Express to server up pages.
        // the below configure the Express instance.
        // PROPERTIES
        //      layout:                         (default: 'layout') the default layout name without extension to render.
        //      engine:                         (default: 'hogan') the view engine use to render views.
        //      view engine:                    (default: 'html') seems redundant but isn't, this is the extension for your views.
        //      views:                          (default: '/web/views') the location where your views are located.
        //      jsonp callback name:            (default: 'callback') when jsonp is used this is the callback name.
        express: {
            layout: 'layout',
            engine: 'hogan',
            'view engine': 'html',
            views: '/web/views'
        },
        
        // Modules Filter is a regular expression
        // for the purpose of filtering what files 
        // are processed by Stukko.
        // ex: (.+)\.js$ would include all .js files.
        // default ex: ^[^_](.+)\.js$ would include all .js files
        //      while excluding any that start with _
        modulesFilter: '^[^_](.+)\\.js$',

        // this configures auto generated routing for the application.
        // to use this feature default controllers MUST be defined
        // in your /server/controllers/base directory. See README.md
        // for configuration examples. 
        // PROPERTIES:
        //      lower:                          (default: true) when true forces lower case routes otherwise uses as defined.
        //      models:                         (default: true) when true routes are generated for models.
        //      controllers:                    (default: true) when true routes are generated for controllers. 
        //      crud:                           (default: false) when true crud routes are generated
        //      rest:                           (default: true) when true REST routes are generated.
        //      prefix:                         (default: 'api') the prefix used for rest routes.

        //      filter:                         (default: 'default') the name of the default filter in /security/filters.
        //      policyStrict:                   (default: true) when true policy filters must exist/accessible or application is halted.

        //      generator:                      (default: 'generator') the generator controller name used for generating routes.
        //      generatorActions:               (default: object) these are the keys to lookup within your generator.
        //                                                        these mappings are required to determine REST actions.
        //                                                        if your generator controller contains actions other
        //                                                        than default change these values to match appropriate
        //                                                        action property names.
        //          findAll:                    (default: 'findAll') action name for finding all recrods.
        //          find:                       (default: 'find') action name for finding a specific record.
        //          create:                     (default: 'create') action name for creating a record.
        //          update:                     (default: 'update') action name for updating a record.
        //          destroy:                    (default: 'destroy') action name for destroying a record.
        routing: {
            lower: true,
            models: true,
            controllers: true,
            crud: true,
            rest: true,
            prefix: '/api',
            filter: 'default',
            policyStrict: false,
            generator: 'generator',
        },

        // hooks are called at various stages in the 
        // request. currently the following hooks are 
        // supported beforeMiddleware, beforeFilters
        // and beforeActions.
        //
        // PROPERTIES:
        //      timeout:            (default: 1200) the time at witch to time out in the event a user hook
        //                                          does not handle the request.
        //      routesOnly:         (default: true) when true only your defined/generated routes call hooks.
        //                                          if you need to use a hook when an asset such as an image
        //                                          is requested, set to false to process on all requests.
        //      beforeMiddleware    (default: 'beforeMiddleware') module name for middleware hook.
        //      beforeFilters:      (default: 'beforeFilters') module name for filters hook.
        //      beforeActions:      (default: 'beforeActions') module name for actions hook.
        hooks: {
            timeout: 1200,
            routesOnly: true,
            beforeMiddleware: 'beforeMiddleware',
            beforeFilters: 'beforeFilters',
            beforeActions: 'beforeActions'
        },

        // cli path for wrapping in user defined command line functions.
        // PROPERTIES
        //      cli:                            (default: '/cli') the path where user defined cli methods are defined.
        cli: '/cli',

        // see README.md in "/server/middleware" for detailed
        // explanation on the below middleware and their
        // respective configurations.
        middleware: {
            cookieParser: {	use: 'cookie-parser' },
            session: {
                use: 'express-session', options: {
                    module: 'memory',
                    mongooseConnection: false,                 //(default: false) when true if db.connection exists
                                                               // use it. only valid for connect-mongo && mongoose!
                    resave: true,
                    saveUninitialized: true
                }
            },
            'public': {	use: 'express.static', options: '/web/public' },
            views: { use: 'express.static', options: '/web/views' }      
        },

        // this property defines your application's logging behavior
        // PROPERTIES
        //      path:                   (default: '/logs') the output path for logs.
        //      level:                  (default: 'info') the default logging level.
        //      transports:             (default: undefined) an object containing additional transport configs.
        //      example transport:      { file: { level: 'info', prettyPrint: true } }
        logs: {          
            level: 'info'        
        },

        // locals are rendered in res.locals of express.
        // they are also rendered as strings for accessing in JavaScript.
        // by using dot notation the properties to include can be found
        // so as to be included in res.locals.package & res.locals.config
        // respectively. also created are res.locals.packageStr & res.locals.confgStr
        // to access the strings in your view if using hogan you would do {{&packageStr}}
        // this would result in converting this back to an object.
        // PROPERTIES
        //      package:                    (default: see below) properties to be included in res.locals.package.
        //      config:                     (default: []) properties from this config to be incl. in res.locals.confg
        //      example:                    ['dependencies.stukko'] would result in res.locals.package.dependencies.stukko
        locals: {            
            config: [
                'env'
            ]
        },

        // assets are your support files for your project that are
        // bundled, minified compressed and linked.
        // PROPERTIES
        //      enabled:                    (default: true) when true all asset actions are processed.
        //      livereload:                 (default: false) whether to enable livereload.
        //      livereloadInterval:         (default: 200) watches for bundle task "done".
        //                                                  and asset linking has completed. disabling may
        //                                                  result in an error when using livereload.
        assets: {
            enabled: true,
            livereload: false,
            livereloadInterval: 400,

            // bundles are groups of files that our processed for concatenation,
            // browserify or simply copied to an output destination. these
            // files when applicable can be minified as well based on file type.
            // ALL paths are relative to the root of your application.
            // IMPORTANT "views" must be last bundle.
            // PROPERTIES:
            //      strategy:               (default: undefined) concat, copy, bower, es6(using 6to5), and browserify.
            //                                                   concat: concatenates files and ouputs "as" defined to dest.
            //                                                          concat can also process less and sass files
            //                                                          after concatenation.
            //                                                   copy: simply copies from source to dest no other process.
            //                                                   bower: gets bower main files/outputs to dest.
            //                                                   browserify: client side require utility.
            //                                                   es6: compiles es5 to es5.
            //      minify:                 (default: undefined) valid when using "copy", "concat" or "browserify".
            //      options:                (default: undefined) options that can be specified for browserify and concat.
            //      header:                 (default: undefined) only applies when using concat. the header to be
            //                                                   added to the top of the concatenated file.
            //      footer:                 (default: undefined) only applies when using concat. the footer to be
            //                                                   added to end of concatenated file.
            //      clean:                  (default: undefined) whether or not to clean the destination before processing.
            //                                                   true to use "dest" locations or specify alternate array.
            //      cleanAppend:            (default: undefined) if using dest as clean target you may want to append a
            //                                                   a string such as '/**/*.js'. this would preserve
            //                                                   the dest folder but remove matching files.
            //                                                   you can specify a string or array of strings.
            //                                                   if an array each string will be appended to the
            //                                                   root dest.
            //      filter:                 (default: undefined) this is the glob filter used by the assets builder to simplify
            //                                                   logic. usually only needs to be specified when using concat
            //                                                   or copy or perhaps you're using a different extension for
            //                                                   your html files say .ejs you might set ex: "**/*.ejs"
            //      watch:                  (default: undefined) true to watch src or specify array of globs.
            //      jsonPath:               (default: "bower.json") only used for bower, the path to "bower.json".
            //      componentPath:          (default: "bower_components") only used with bower, the path to bower_components.
            //      preserveStructure:      (default: true) only used with bower, preserves folder structure on output.
            //      src:                    (default: undefined) the sources to include.
            //      as:                     (default: undefined) output as this name, required for concat.
            //      dest:                   (default: undefined) the output directory.
            bundle: {
                framework: {
                    strategy: 'concat',
                    watch: true,
                    minify: false,
                    clean: true,
                    cleanAppend: '/**/*.js',
                    src: ['./web/assets/framework/**/*.js'],
                    as: 'app.js',
                    dest: './web/public/js',
                    options: {}
                },
                scripts: {
                    strategy: 'copy',
                    watch: true,
                    minify: false,
                    clean: true,
                    cleanAppend: '/**/*.js',
                    src: ['./web/assets/scripts/**/*.js'],
                    dest: './web/public/js',
                    options: {}
                },
                styles: {
                    strategy: 'copy',
                    watch: true,
                    minify: false,
                    clean: true,
                    cleanAppend: '/**/*.css',
                    src: ['./web/assets/styles/*.scss'],
                    dest: './web/public/css',
                    options: {}
                }                
            },
            // link is used to automatically attach file references to a view.
            // each configuration below "link" will be processed.
            // see https://github.com/klei/gulp-inject for full options.
            // PROPERTIES:
            //      to:                      (default: undefined) the view to be linked to. if undefined layout from
            //                                                    express is used
            //      src:                     (default: './web/public/css/**/*.css', './web/public/js/**/*.js') the sources to be linked.
            //      dest:                    (default: undefined) the output path, if undefined root of your express views is used.
            //      ignorePath:              (default: '/web/public') paths in resoures that should be ignored/stripped.
            //      starttag:                (default: '<!-- inject:{{ext}} -->') the start tag when linking begins
            //                                         in your html page where {{ext}} matches the extension type of your file.
            //      endtag:                  (default: '<!-- endinject -->') the end tag where linking ends.
            link: {
                layout: {
                    src: ['!./web/public/css/errors.css', './web/public/css/**/*.css', './web/public/js/**/*.js' ],
                    options: {
                        ignorePath: ['/web/public']
                    }
                }
            }
        }
    };
}