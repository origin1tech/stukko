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
            layout: 'index',
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
            logger:         { use: 'morgan', options: 'short' },
            encodedParser:  { use: '{{internal}}/middleware/encodedParser' },
            jsonParser:     { use: '{{internal}}/middleware/jsonParser'	},
            cookieParser:   { use: 'cookie-parser' },
            session:        { use: 'express-session', options: { module: 'memory'} },
            methodOverride: { use: 'method-override' },
            csrf:           { use: 'csurf', enabled: false },
            cors:           { use: 'cors', enabled: false },
            i18n:           { enabled: false },
            web:            { use: 'express.static', options: '/web' },
            favicon:        { enabled: false },
            inject:         { use: '{{internal}}/middleware/inject' },
        },

        logs: {          
            level: 'info'        
        },

        locals: {            
            config: [
                'env'
            ]
        },

        src: {
            enabled: undefined,
            livereload: undefined,
            livereloadInterval: 300,
            bundle: {
                scripts: {                                   // directory for misc scripts, helpers & mixins
                    strategy: 'copy',                   // this is useful for when you wish to have scripts
                    watch: undefined,                   // that are not part of your app but are required
                    minify: undefined,                  // for features your app uses.
                    clean: undefined,
                    cleanAppend: '/**/*.js',
                    src: ['./src/scripts/**/*.js'],
                    dest: './web/js',
                    options: {}
                },
                styles: {                                  // directory containing css, scss and/or less.
                    strategy: 'copy',                   // by default only top level files are processed.
                    watch: undefined,                   // this prevents directories containing support
                    minify: undefined,                  // files for less/sass from being output.
                    clean: undefined,
                    cleanAppend: '/**/*.css',
                    src: ['./src/styles/*.scss',
                        './src/styles/*.less',
                        './src/styles/*.css'],
                    dest: './web/css',
                    options: {}
                },
                views: {                                // by default this is a directory containing
                    strategy: 'copy',                   // all your views and partials. Some may prefer
                    watch: undefined,                   // these views reside in own folder
                    clean: undefined,                   // this can be obtained by changing ./src/**/app**/*.html
                    cleanAppend: '/**/*.html',          // to ./src/**/views/**/*.html. the key thing to remember
                    src: ['./src/layout.html',          // with views is that any part of the path you don't
                        './src/**/views/**/*.html'
                    ],
                    dest: './web/views',                // want output should be specified in the options.ignorePath
                    options: {                          // this prevents ending up with web/views/views for example.
                        ignorePath: ['/app', '/views'],
                        collapseWhitespace: undefined,
                        env: 'development'
                    }
                }
            },

            link: {
                layout: {
                    to: undefined,
                    src: ['./web/css/**/*.css', './web/js/**/*.js'],
                    dest: undefined,
                    options: {
                        ignorePath: ['/web'],
                        starttag: '<!-- inject:{{ext}} -->',
                        endtag: '<!-- endinject -->'
                    }
                }
            }
        }
    };
}