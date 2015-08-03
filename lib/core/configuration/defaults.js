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
            views: '/app'
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
            compression:    { use: 'compression', enabled: false, options: {} },
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
            level: 'info',
            colorize: undefined    
        },

        locals: {            
            config: [
                'env'
            ]
        },
        bundler: {
            enabled: undefined,
            livereload: undefined,
            livereloadInterval: 300,
            nowait: undefined,
            bundles: {
                "common": {
                    "strategy": "copy",
                    "clean": false,
                    "cleanAppend": "/**/*.js",
                    "watch": [
                        "./app/**/*.{css,scss,less,js}"
                    ],
                    "src": [
                        "./app/assets/sass/*.{scss,less,css}"
                    ],
                    "dest": "./app/assets/css"
                }
            },
            link: {
                layout: {
                    src: [
                        './app/assets/css/**/*.css',
                        './app/assets/js/**/*.js'
                    ],
                    options: {
                        ignorePath: [],
                        starttag: '<!-- inject:{{ext}} -->',
                        endtag: '<!-- endinject -->'
                    }
                }
            }
        }
    };
}