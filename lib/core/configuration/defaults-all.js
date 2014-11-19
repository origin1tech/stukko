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
		port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,
		ssl: undefined,
        browser: false,

        // defines what types of status errors to handle.
        // PROPERTIES
        //      404:                            (default: true) usually true, set to false when using a SPA
        //                                                      and handling routes client side. probably want to
        //                                                      set catchAll to "true" also.
        //      500:                            (default: true) almost always true, handles typical/unknown exceptions.
        statusErrors: {
            404: true,
            500: true
        },

        // PROPERTIES
        //      catchAll:                       (default: false) when true a catch all route that resolves
        //                                                       layout is used. used to not throw 404 when valid
        //                                                       client side routes exists in a SPA.
        //      logo:                           (default: true) when true display the Stukko logo when booting.
        catchAll: false,
		logo: true,

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
        //                                                       /server/seeds will be processed, drop must be set
        //                                                       to true.
        db: {
			module: 'dirty',
			modelCase: 'capitalize',
            globalize: true,
            modelPrefix: '$',
            connect: true,
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
			security: '/server/security',
			middleware: '/server/middleware',
			handlers: '/server/handlers',
			controllers: '/server/controllers',
			routes: '/server/routes'
		},

        // paths where user cli files and user defined
        // templates are located when using sequelize-cmd
        // migrations for sequelize. see README.md.
        // PROPERTIES
        //      cli:                            (default: '/cli') the path where user defined cli methods are defined.
        //      templates:                      (default: '/templates') the path where user defined templates
        //                                                              for migrations are stored.
        cli: '/cli',
        templates: '/templates',

        // see README.md in "/server/middleware" for detailed
        // explanation on the below middleware and their
        // respective configurations.
		middleware: {
			morgan: { use: 'morgan'	},
			encodedParser: { use: '{{internal}}/middleware/encodedParser' },
			jsonParser: { use: '{{internal}}/middleware/jsonParser'	},
			cookieParser: {	use: 'cookie-parser' },
			session: {
				use: 'express-session', options: {
					module: 'memory',
                    resave: true,
                    saveUninitialized: true
				}
			},
			methodOverride: { use: 'method-override' },
			csrf: {	use: 'csurf', enabled: false },
			cors: {	use: 'cors', enabled: false },
			i18n: {	use: 'i18n', enabled: false	},
			"public": {	use: 'express.static', options: '/web/public' },
			views: { use: 'express.static', options: '/web/views' },
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
        //      enabled:                    (default: true) when true all asset actions are processed.
        //      livereload:                 (default: false) whether to enable livereload.
        //      livereloadInterval:         (default: 200) watches for bundle task "done".
        //                                                  and asset linking has completed. disabling may
        //                                                  result in an error when using livereload.
        assets: {
			enabled: true,
            livereload: false,
            livereloadInterval: 200,

            // bundles are groups of files that our processed for concatenation,
            // browserify or simply copied to an output destination. these
            // files when applicable can be minified as well based on file type.
            // ALL paths are relative to the root of your application.
            // IMPORTANT "views" must be last bundle.
            // PROPERTIES:
            //      strategy:               (default: undefined) concat, copy, bower, and browserify.
            //                                                   concat: concatenates files and ouputs "as" defined to dest.
            //                                                          concat can also process less and sass files
            //                                                          after concatenation.
            //                                                   copy: simply copies from source to dest no other process.
            //                                                   bower: gets bower main files/outputs to dest.
            //                                                   browserify: client side require utility.
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
                },
                views: {
                    strategy: 'copy',
                    watch: true,
                    clean: true,
                    cleanAppend: '/**/*.html',
                    src: ['./web/assets/framework/**/views/**/*.html'],
                    dest: './web/views',
                    options: {
                        ignorePath: ['/views'],
                        collapseWhitespace: true,
                        env: 'development'
                    }
                }
            },

            // link is used to automatically attach file references to a view.
            // each configuration below "link" will be processed.
            // see https://github.com/klei/gulp-inject for full options.
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
                layout: {
                    to: undefined,
                    src: ['!./web/public/css/errors.css', './web/public/css/**/*.css', './web/public/js/**/*.js' ],
                    dest: undefined,
                    options: {
                        ignorePath: ['/web/public'],
                        starttag: '<!-- inject:{{ext}} -->',
                        endtag: '<!-- endinject -->'
                    }
                }
            }
		}
	};
}