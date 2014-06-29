'use strict';

module.exports = function () {

	var self = this;

	return  {
		version: undefined,
		env: process.env.NODE_ENV || 'development',                     // the environment to load.
		browser: false,                                                 // on start/listen opens browser.
		host: process.env.IP || process.env.HOSTNAME || 'localhost',    // the host for the server. some common env vars are provided remove in config as desired.
		port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,    // the port the server is to listen on. some common env vars are provided remove in config as desired.
		ssl: undefined,                                                 // ssl is an object consisting of { '/key: 'path/to/key', cert: '/path/to/cert' }
		statusErrors: true,                                             // when true handlers are added to the stack to catch errors that are thrown and catch 404 when pages not found.
		backup: undefined,                                              // set to path to enable backup location.
		db: {
			module: 'dirty',                                            // the module to use for database.
			modelCase: 'capitalize',                                    // the casing of the get name options are 'capitalize, upper, lower, camel, pascal'.
			connect: true                                               // when true creates/opens default connection otherwise only returns db client for custom connections or multiple connections.
		},
		express: {
			layout: 'layout',                                           // the directory of the default html layout, usually 'layout' or 'index'.
			engine: 'hogan',                                            // the consolidate engine to use for rendering.
			'view engine': 'html',                                      // the engine extension for views.
			views: '/web/views',                                        // location for views.
			'jsonp callback name': 'callback'                           // the directory for jsonp callbacks.
		},
		modules: {
			security: '/server/security',
			middleware: '/server/middleware',
			handlers: '/server/handlers',
			models: '/server/models',
			controllers: '/server/controllers',
			routes: '/server/routes',
			services: '/server/services'
		},
		middleware: {
			logger: {
				use: 'morgan'
			},
			encodedParser: {
				use: '{{internal}}/middleware/encodedParser'
			},
			jsonParser: {
				use: '{{internal}}/middleware/jsonParser'
			},
			cookieParser: {
				use: 'cookie-parser'
			},
			session: {
				use: 'express-session', options: {
					name: 'memory'
				}
			},
			methodOverride: {
				use: 'method-override'
			},
			csrf: {
				use: 'csurf', enabled: false
			},
			cors: {
				use: 'cors', enabled: false
			},
			i18n: {
				use: 'i18n', enabled: false
			},
			"public": {
				use: 'express.static', options: '/web/public'        // NOTE: changing path will require changing asset paths above to match!!
			},
			views: {
				use: 'express.static', options: '/web/views'
			},
			favicon: {
				enabled: false,                                      // NOTE: serve favicon will throw an error if .ico is missing.
				use: 'serve-favicon',
				options: '/web/public/img/shared/favicon.ico'
			},
			inject: {
				use: '{{internal}}/middleware/inject'
			}
		},
		assets: {                                                       // if defined manages assets, compiles less, concat, minify etc.
			clean: {                                                    // cleans destination directories prior to build.
				exclude: []
			},
			watch: true,                                                // enables watching files for rebuild.
			html: {                                                     // set to false to disable. set to object with options see:https://www.npmjs.org/package/html-minifier
				exclude: [                                              // markup wrapped with <!-- htmlmin:ignore --> will be ignored by html minification.
				],
				src: ['./web/assets/views/**/*.html'],
				dest: './web/views',
				ignorePath: [],
				collapseWhitespace: true
			},
			link: {                                                     // see https://github.com/klei/gulp-inject for full options including starttag, endtag & transform if not using.
				common: {
					exclude: [
						"!./web/public/css/errors.css",
						"!./web/public/css/default.css",
						"!./web/public/js/app.js"
					],
					ignorePath: [
						"/web/public"
					],
					files: [
						"./web/public/css/mixin.css",
						"./web/public/js/mixin.js",
						"./web/public/css/**/*.css",
						"./web/public/js/**/*.js"
					],
					starttag: "<!-- inject:common:{{ext}} -->",
					endtag: "<!-- endinject -->"
				},
				application: {
					exclude: [],
					ignorePath: [
						"/web/public"
					],
					files: [
						"./web/public/css/default.css",
						"./web/public/js/app.js"
					],
					starttag: "<!-- inject:application:{{ext}} -->",
					endtag: "<!-- endinject -->"
				}
			},
			mixin: {
				src: ['./web/assets/mixin/**/*.css', './web/assets/mixin/**/*.js'],
				concat: ['mixin.css', 'mixin.js'],
				dest: ['./web/public/css', './web/public/js']
			},
			minify: {
				src: ['./web/assets/minify/**/*.css', './web/assets/minify/**/*.js'],
				dest: ['./web/public/css', './web/public/js']
			},
			preprocess: {
				src: ['./web/assets/preprocess/*.less', './web/assets/preprocess/*.sass'],
				dest: ['./web/public/css', './web/public/css']
			},
			framework: {
				src: ['./web/assets/framework/**/*.js'],
				concat: ['app.js'],
				dest: ['./web/public/js'],
				minify: false
			}
		},
		logs: {
			path: '/logs',                                              // the directory for logs
			level: 'info',                                              // the default level for logging.
			transports: undefined                                       // transports are passed as object ex: file: { level: 'info', prettyPrint: true }.
		}
	};
}