#Framework
----

The framework directory is where you would create your client-side framework application.

Client-side frameworks are amazing and really provide feature rich applications for your users. You may want to consider

+ [AngularJs](https://angularjs.org/)
+ [Backbone](http://backbonejs.org/)
+ [Ember](http://emberjs.com/)

###Bundling Client Framework

There are several bundling strategies you can use to compile your framework into a single for production as well
as using browserify or even ES6 to ES5 compiling.

Bundles are created in your configuration file (default: development.json) located in /server/configuration. You'll
notice a key named "assets". Inside assets you will see the default bundles.

The following is an example using ES6 (6to5)

```json
"framework": {
    "strategy": "es6",
    "watch": true,
    "minify": false,
    "clean": true,
    "cleanAppend": "/**/*.js",
    "src": [
        "./web/assets/framework/**/*.js"
    ],
    "dest": "./web/public/js/app",
    "options": {
        "modules": "amd"
    }
},
```