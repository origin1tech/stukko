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
		version: undefined,
		env: process.env.NODE_ENV || 'development',
		host: process.env.IP || process.env.HOSTNAME || 'localhost',
		port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,		ssl: undefined,

        browser: false,

        // defines what types of status errors to handle.
        // PROPERTIES
        //      handler:                        (default: error) the error handler name.
        //      timeout:                        (default: 1200) the timeout used if user handler fails.
        //      spa:                            (default: false) when true 404 errors are ignored for non-asset
        //                                                       routes. when a defined route is not found the 
        //                                                       the request renders the default layout allowing
        //                                                       client framework to handle not found paths.
        //      consoleTrace:                   (default: true) when true stack trace is shown in console. otherwise
        //                                                      it is surpressed but output to the log file for ref.
        errors: {
            handler: 'error',
            timeout: 1200,
            spa: false,
            consoleTrace: undefined
        },

        // PROPERTIES      
        //      logo:                           (default: true) when true display the Stukko logo when booting.
		logo: undefined,

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
        //      options:                        (default: object) the options to be passed to database connection
        //                                                        see connecg
        db: {
			module: 'dirty',          
			modelCase: 'capitalize',
            globalize: undefined,
            modelPrefix: '$',
            connect: undefined,
		    load: undefined,
            drop: false,
            seed: false,
            options: {
                database: undefined
            }
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
			views: '/web/views',
			'jsonp callback name': 'callback'
		},

        // Modules are the paths that Stukko relies on to initialize your app.
        // see README.md in each path below for
        // specific use of these directories.
		modules: {
            services: '/server/services',
            models: '/server/models',
            seeds: '/server/seeds',
			policies: '/server/security/policies',
            filters: '/server/security/filters',
			middleware: '/server/middleware',
			handlers: '/server/handlers',
			controllers: '/server/controllers',
            locales: '/server/locales',
			routes: '/server/routes'
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
        //      routers:                        (default: { mount: '/', options: {}}) define additional routers
        //                                                including mount path and router options.
        //                                                    { myRouter: '/mount/path' }.
        //      lower:                          (default: true) when true forces lowercase routes or uses as defined.
        //      models:                         (default: true) when true routes are generated for models.
        //      controllers:                    (default: true) when true routes are generated for controllers.
        //      crud:                           (default: true) when true crud routes are generated
        //      rest:                           (default: true) when true REST routes are generated.
        //      prefix:                         (default: 'api') the prefix used for rest routes.
     
        //      filter:                         (default: 'default') the name of the default filter in /security/filters.
        //      policyStrict:                   (default: false) when true policy filters must exist/accessible or
        //                                                       application is halted.
        
        //      generator:                      (default: 'generator') the generator controller used for generating routes.
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
            routers: {
                default: { mount: '/', options: {}}
            },
            lower: undefined,
            models: undefined,
            controllers: undefined,
            crud: undefined,
            rest: undefined,
            prefix: '/api',      
            filter: 'default',          
            policyStrict: undefined,
            generator: 'generator',
            generatorActions: {
                findAll: 'findAll',
                find: 'find',
                create: 'create',
                update: 'update',
                destroy: 'destroy'               
            }
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
        //      afterModels:        (default: 'afterModels') hook for globally updating model schemas.
        //                                                   NOT supported for Sequelize.
        hooks: {
            timeout: 1200,
            routesOnly: undefined,
            beforeMiddleware: 'beforeMiddleware',
            beforeFilters: 'beforeFilters',
            beforeActions: 'beforeActions',
            afterModels: 'afterModels'
        },

        // cli path for wrapping in user defined command line functions.
        // PROPERTIES
        //      cli:                            (default: '/cli') the path where user defined cli methods are defined.
        cli: '/cli',

        // see README.md in "/server/middleware" for detailed
        // explanation on the below middleware and their
        // respective configurations.
		middleware: {
			logger: { use: 'morgan', options: 'short' },
			encodedParser: { use: '{{internal}}/middleware/encodedParser' },
			jsonParser: { use: '{{internal}}/middleware/jsonParser'	},
			cookieParser: {	use: 'cookie-parser' },
			session: {
				use: 'express-session',
                options: {
					module: 'memory',
                    mongooseConnection: undefined,             //(default: undefined) when true use db.connection exists
                    resave: undefined,
                    saveUninitialized: undefined
				}
			},
			methodOverride: { use: 'method-override' },
			csrf: {	use: 'csurf', enabled: false },
			cors: {	use: 'cors', enabled: false },
			i18n: {	use: 'i18n', enabled: false	},
			web: {	use: 'express.static', options: '/web' },
			//views: { use: 'express.static', options: '/web/views' },
			favicon: {
				enabled: false,
				use: 'serve-favicon',
				options: '/web/public/img/shared/favicon.ico'
			},
			inject: { use: '{{internal}}/middleware/inject'	}
		},

        // this property defines your application's logging behavior
        // PROPERTIES
        //      path:                   (default: '/logs') the output path for logs.
        //      level:                  (default: 'info') the default logging level.
        //      transports:             (default: undefined) an object containing additional transport configs.
        //      example transport:      { file: { level: 'info', prettyPrint: true } }
        logs: {
            path: '/logs',
            level: 'info',
            transports: undefined
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
            'package': [
                'name',
                'description',
                'version',
                'copyright',
                'displayName'
            ],
            config: [
                'env'
            ]
        },

        // assets are your support files for your project that are
        // bundled, minified compressed and linked.
        // PROPERTIES
        //      enabled:                    (default: undefined) when true/undefined all asset actions are processed.
        //      livereload:                 (default: undefined) when true/undefined enable livereload.
        //      livereloadInterval:         (default: 300) watches for bundle task "done".
        //                                                  and asset linking has completed. disabling may
        //                                                  result in an error when using livereload.
        src: {
            //enabled: undefined,
            //livereload: undefined,
            //livereloadInterval: 300,
            // bundles are groups of files that our processed for concatenation,
            // browserify or simply copied to an output destination. these
            // files when applicable can be minified as well based on file type.
            // ALL paths are relative to the root of your application.
            // IMPORTANT "views" must be last bundle.
            // PROPERTIES:
            //      strategy:               (default: undefined) concat, copy, bower, babel, traceur, and browserify.
            //                                                   concat: concatenates files and ouputs "as" defined to dest.
            //                                                          concat can also process less and sass files
            //                                                          after concatenation.
            //                                                   copy: simply copies from source to dest no other process.
            //                                                   bower: gets bower main files/outputs to dest.
            //                                                   browserify: client side require utility.
            //                                                   babel: compiles es6 to es5.
            //                                                   traceur: compiles es6 to es5.
            //                                                   systemjs: uses systemjs-builder as used in jspm.
            //      minify:                 valid when using "copy", "concat" or "browserify".
            //      soucemaps:              valid when js files "minify" "concat" or "browserify" specify path to save
            //                                  map files or set false to disable. undefined saves maps inline.
            //      options:                options that are passed to the plugin. sass, browserify, concat, babel, traceur, cssmin
            //                                  less, html.
            //      header:                 only applies when using concat. the header to be
            //                                  added to the top of the concatenated file.
            //      footer:                 only applies when using concat. the footer to be
            //                                  added to end of concatenated file.
            //      clean:                  whether or not to clean the destination before processing.
            //                                  true to use "dest" locations or specify alternate array.
            //      cleanAppend:            if using dest as clean target you may want to append a
            //                                  a string such as '/**/*.js'. this would preserve
            //                                  the dest folder but remove matching files.
            //                                  you can specify a string or array of strings.
            //                                  if an array each string will be appended to the
            //                                  root dest.
            //      filter:                 this is the glob filter used by the assets builder to simplify
            //                                   logic. usually only needs to be specified when using concat
            //                                   or copy or perhaps you're using a different extension for
            //                                   your html files say .ejs you might set ex: "**/*.ejs"
            //      watch:                  true to watch src or specify array of globs.
            //      bowerPath:              only used for bower, the path to "bower.json".
            //      bowerComponentsPath:    only used with bower, the path to bower_components.
            //      preserveStructure:      only used with bower, preserves folder structure on output.
            //      transform:              only used with browserify, accepts "babel" or "traceur" where gulp-traceur
            //                                  or gulp-babel are installed. use bundle.options above for passing in
            //                                  transform options. if any browserify options are specified they will
            //                                  be ignored by the transform compiler.
            //      systemjsPath:           valid only for "systemjs" strategy. specifies the path to your config file.
            //      src:                    the sources to include.
            //      as:                     output as this name, required for concat.
            //      dest:                   the output directory.
            bundle: {
                //scripts: {                              // directory for misc scripts, helpers & mixins
                //    strategy: 'copy',                   // this is useful for when you wish to have scripts
                //    watch: undefined,                   // that are not part of your app but are required
                //    minify: undefined,                  // for features your app uses.
                //    clean: undefined,
                //    cleanAppend: '/**/*.js',
                //    src: ['./src/scripts/**/*.js'],
                //    dest: './web/js',
                //    options: {}
                //},
                //styles: {                               // directory containing css, scss and/or less.
                //    strategy: 'copy',                   // by default only top level files are processed.
                //    watch: undefined,                   // this prevents directories containing support
                //    minify: undefined,                  // files for less/sass from being output.
                //    clean: undefined,
                //    cleanAppend: '/**/*.css',
                //    src: ['./src/styles/*.scss',
                //          './src/styles/*.less',
                //          './src/styles/*.css'],
                //    dest: './web/css',
                //    options: {}
                //},
                //views: {                                // by default this is a directory containing
                //    strategy: 'copy',                   // all your views and partials. Some may prefer
                //    watch: undefined,                   // these views reside in own folder
                //    clean: undefined,                   // this can be obtained by changing ./src/**/app**/*.html
                //    cleanAppend: '/**/*.html',          // to ./src/**/views/**/*.html. the key thing to remember
                //    src: ['./src/layout.html',          // with views is that any part of the path you don't
                //          './src/**/views/**/*.html'
                //         ],
                //    dest: './web/views',                // want output should be specified in the options.ignorePath
                //    options: {                          // this prevents ending up with web/views/views for example.
                //        ignorePath: ['/app', '/views'],
                //        collapseWhitespace: undefined,
                //        env: 'development'
                //    }
                //}
            },

            // link is used to automatically attach file references to a view.
            // each configuration below "link" will be processed.
            // in some cases the order of files is important. Asset linking
            // respect the order you provide. That in mind it is common to
            // instead use RequireJs or SystemJs to handing lazy loading of
            // these files. When using either of the above your linking
            // may contain only one or two globs whereas the module loader
            // handles the rest.
            // PROPERTIES:
            //      to:                      (default: undefined) the view to be processed. if undefined layout from
            //                                                    express is used..
            //      src:                     (default: './web/public/css/**/*.css', './web/public/js/**/*.js') the sources to be linked.
            //      dest:                    (default: undefined) the output path, if undefined root of your express views is used.
            //      ignorePath:              (default: '/web/public') paths in resoures that should be ignored/stripped.
            //      starttag:                (default: '<!-- inject:{{ext}} -->') the start tag when linking begins
            //                                         in your html page where {{ext}} matches the extension type of your file.
            //      endtag:                  (default: '<!-- endinject -->') the end tag where linking ends.
            link: {
                //layout: {
                //    to: undefined,
                //    src: ['./web/css/**/*.css', './web/js/**/*.js'],
                //    dest: undefined,
                //    options: {
                //        ignorePath: ['/web'],
                //        starttag: '<!-- inject:{{ext}} -->',
                //        endtag: '<!-- endinject -->'
                //    }
                //}
            }
		}


	};
};