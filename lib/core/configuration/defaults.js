'use strict';

module.exports = function () {

    var self = this;

    return  {

        env: process.env.NODE_ENV || 'development',
        host: process.env.IP || process.env.HOSTNAME || 'localhost',
        port: process.env.PORT || process.env.VCAP_APP_PORT || 1337,
        ssl: undefined,

        errors: {
            spa: false
        },

        db: {
            module: 'dirty',
            globalize: true
        },

        express: {
            layout: 'layout',
            engine: 'hogan',
            'view engine': 'html',
            views: '/web/views'
        },

        modulesFilter: '^[^_](.+)\\.js$',

        routing: {
            models: true,
            controllers: true,
            crud: true,
            rest: true,
            prefix: '/api'
        },

        hooks: {
            routesOnly: true,
        },

        middleware: {
            "logger": {
                "use": "morgan"
            },
            cookieParser: {	use: 'cookie-parser' },
            session: {
                use: 'express-session',
                options: {
                    module: 'memory'
                }
            },
            'public': {	use: 'express.static', options: '/web/public' },
            views: { use: 'express.static', options: '/web/views' }      
        },

        logs: {          
            level: 'info'        
        },

        locals: {            
            config: [
                'env'
            ]
        },

        assets: {
            enabled: true,
            livereload: false,
            livereloadTimeout: 350,

            bundle: {
                app: {                                  // folder for client side frameworks such as Angular, Ember etc.
                    strategy: 'concat',                 // the folder structure within app is entire up to the developer
                    watch: undefined,                   // depending on what strategy that's used folder structures
                    minify: undefined,                  // will vary.
                    clean: undefined,
                    cleanAppend: '/**/*.js',
                    src: ['./assets/app/**/*.js'],
                    as: 'app.js',
                    dest: './web/js',
                    options: {}
                },
                scripts: {                              // directory for misc scripts, helpers & mixins
                    strategy: 'copy',                   // this is useful for when you wish to have scripts
                    watch: undefined,                   // that are not part of your app but are required
                    minify: undefined,                  // for features your app uses.
                    clean: undefined,
                    cleanAppend: '/**/*.js',
                    src: ['./assets/scripts/**/*.js'],
                    dest: './web/js',
                    options: {}
                },
                styles: {                               // directory containing css, scss and/or less.
                    strategy: 'copy',                   // by default only top level files are processed.
                    watch: undefined,                   // this prevents directories containing support
                    minify: undefined,                  // files for less/sass from being output.
                    clean: undefined,
                    cleanAppend: '/**/*.css',
                    src: ['./assets/styles/*.scss',
                        './assets/styles/*.less',
                        './assets/styles/*.css'],
                    dest: './web/css',
                    options: {}
                },
                views: {                                // by default this is a directory containing
                    strategy: 'copy',                   // all your views and partials. Some may prefer
                    watch: undefined,                   // these views reside in own folder
                    clean: undefined,                   // this can be obtained by changing ./assets/**/app**/*.html
                    cleanAppend: '/**/*.html',          // to ./assets/**/views/**/*.html. the key thing to remember
                    src: ['./assets/**/app/**/*.html'], // with views is that any part of the path you don't
                    dest: './web/views',                // want output should be specified in the options.ignorePath
                    options: {                          // this prevents ending up with web/views/views for example.
                        ignorePath: ['/views'],
                        collapseWhitespace: undefined,
                        env: 'development'
                    }
                }
            },

            link: {
                layout: {
                    src: ['./web/css/**/*.css',
                          './web/js/**/*.js' ],
                    options: {
                        ignorePath: ['/web']
                    }
                }
            }
        }
    };
}