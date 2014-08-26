'use strict';

module.exports = function () {

	var self = this;

	return  {
		version: undefined,
		env: process.env.NODE_ENV || 'development',                     // the environment to load.
		host: process.env.IP || process.env.HOSTNAME || 'localhost',    // the host for the server. some common env vars are provided remove in config as desired.
		port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,    // the port the server is to listen on. some common env vars are provided remove in config as desired.
		ssl: undefined,                                                 // ssl is an object consisting of { '/key: 'path/to/key', cert: '/path/to/cert' }
		statusErrors: true,                                             // when true handlers are added to the stack to catch errors that are thrown and catch 404 when pages not found.
		logo: true,                                                     // when true display the Stukko logo when booting.
        logs: {
            level: 'info',                                              // the default level for logging.
        },
        db: {
			module: 'dirty',                                            // the module to use for database.
			modelCase: 'capitalize',                                    // the casing of the get name options are 'capitalize, upper, lower, camel, pascal'.
		    load: true,                                                 // when true Models are loaded and exposed globally. If using Sequelize set to false for migrations.
        },
		express: {
			layout: 'layout',                                           // the directory of the default html layout, usually 'layout' or 'index'.
			engine: 'hogan',                                            // the consolidate engine to use for rendering.
			'view engine': 'html',                                      // the engine extension for views.
			views: '/web/views'                                         // location for views.
		},
		middleware: {
			morgan: {
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
					module: 'memory',
                    resave: true,
                    saveUninitialized: true
				}
			},
			methodOverride: {
				use: 'method-override'
			},
			csrf: {
				use: 'csurf', enabled: false
			},
			cors: {
				use: 'cors',
                enabled: false                
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
			enabled: true,                                              // when true asset building using gulp is enabled.
			watch: true,                                                // enables watching files for rebuild.
			html: {                                                     // set to false to disable. set to object with options see:https://www.npmjs.org/package/html-minifier
				exclude: [                                              // markup wrapped with <!-- htmlmin:ignore --> will be ignored by html minification.
				],
				src: ['./web/assets/views/**/*.html'],
				dest: './web/views',
				ignorePath: [],
				collapseWhitespace: true
			}
		}
	};
}