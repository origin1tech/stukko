#Stukko

##Pre-Release

This is a pre-release. Using in production should be done with caution. Running changes make break your application.

##Express MVC Web Framework.

The following is an overview of the key features in Stukko. Most if not all features have additional configuration 
examples and documentation in their respective application folders. For example to understand how middleware 
can be configured see the /server/middleware/README.md file.

##Getting Started

###Installing Stukko:

```sh
npm install -g stukko
```

###Setting Path:

**NOTE:** Setting path may not be required. If "stukko start" returns "Cannot find module stukko" then set the PATH
environment variable below per your platform and distribution.

**Nix Systems** - your path may be slightly different depending on your distro, please verify. (CentOS shown below).

```sh
export NODE_PATH="/usr/local/lib/node_modules:$NODE_PATH"
```

**Windows 7/8**
```sh
SET PATH=%PATH%;%AppData%\npm\node_modules
```

It is best to install Stukko globally as it exposes create methods to create your application which will run on Stukko.
Stukko also exposes several methods for managing its apps. Uninstall, install, update, diagnostics, kill(kills node
processes for that EADDRINUSE) among others which we'll cover below. if you plan to host your application installing 
locally is just fine.

###To create an application:

From a command prompt or terminal navigate to the parent directory where you'd like your application to be installed.
Stukko will create a sub folder by the name you choose in the create method show below:

```sh
stukko create todos
```

**NOTE** You do note need to run npm install after the application is created. Stukko pragmatically runs npm install
for you. It is important to also note that if you have additional packages you wish to install at the time of creation
you can do this as well. Stukko ships with the **dirty** database module only. You'll likely be needing to install
MongoDB, Mongoose, Sequelize or Redis. Or perhaps you want to install connect-redis, connect-mongo or connect-sequelize,
this can be accomplished in one shot as show here:

###Create application with additional packages:

```sh
stukko create todos --packages sequelize|connect-sequelize
```

**NOTE** You can separate packages using a pipe or comma.

##What is Stukko?

Stukko is merely a wrapper for Express and its common dependency modules. Where Stukko is different than other Express
based frameworks you might have tried is in the way it exposes the expected methods and feel you're used to. Instead
of being opinionated with structure, default modules and so on it attempts to only make wiring up your application 
more simplistic. More succinctly it takes out some of the redundancy of creating a Node/Express application. Stukko is
extremely customizable. Paths and structure can be customized to your liking. Features can be enabled or disabled
rather easily. Middleware is not only added to the Express stack but a mechanism to order the middleware (why this isn't
common is all frameworks is a head scratch-er) is available when sequence is critical.

###Does Stukko have an ORM?

Not really, again the idea behind Stukko is to wire up an app with the common middleware, get you connected to your
database, hook up your sessions and inject some helpers in your request and response objects. **Why didn't we include
an ORM?** Well, we did at one point, however we found that no matter how complete we made it, there was great difficulty
in exposing all the features of the original driver for each database engine. Not to mention keeping up with updates.
Additionally most use a database they are familiar with so changing engines is not as common as you might think.
ORM's are cool but at the end of the day when it comes time to source a fix for a problem its helpful when the
code you find is the same code you can use in your project. More on this below but Stukko makes it easy to connect
to your database using Redis, MongoDB, Mongoose, Dirty or Sequelize. So what's the point then? Stukko exposes some
additional things. It automatically exposes your models via export. It also expose methods to the engine's client, connection,
disconnect method and connection state. Stukko ensures that your database fires up correctly and shutsdown properly as 
well. Because Stukko exposes the client and connection you have full control to let Stukko create your models based on
your configuration or create/define them directly. Either way it just works!

##Paths in Options

In your options or your configuration file (they are one in the same for our discussion) several paths are defined. 
Paths should be specified as: 

"/path/to/directory" 

Note that paths are ALWAYS relative. This is because Stukko will prepend the path with your current working directory. 
Handling paths in this manner
ensures cross platform comparability. Paths that are stored in an array such as those in your assets are not prepended 
within Stukko rather Gulp handles
this process. Hence you'll notice in your default configuration that the paths start with './some/path' or in 
the case of excluding a directory or file '!./some/path'.

In some cases you'll notice {{internal}} this means that Stukko using RegExp will match this and prepend with the path 
to one of its internal modules. You should not change
these instances unless you are certain what you are doing. If you are then have it, tell us why if its cool make a pull 
request so we can include it!

In the future (NOT CURRENTLY IMPLEMENTED) we may change this to where all relative paths become something like 
'{{cwd}}/some/path' where cwd would be your current working directory e.g where the root of your app is located. 
We mention it only because it might make things more clear however we'll maintain fallback to previous versions.

##View Engine Support

Stukko uses consolidate, however currently only supports:

- [haml](https://github.com/creationix/haml-js)
- [hogan](http://twitter.github.io/hogan.js/)
- [ejs](https://github.com/visionmedia/ejs)
- [jade](https://github.com/visionmedia/jade)

##Session Configuration

Stukko supports 3 main types of session connections, Redis(connect-redis), MongoDB(connect-mongo), and 
MySQL, PostgreSQL, SQLite, MariaDB (connect-sequelize). Sequelize is a SQL Orm which enables connections to 
the fore mentioned SQL engines.

It is important to note that connect-sequelize can use the existing db connection if Sequelize is your defined db.
This means that you need only specify it as the module to use. Stukko will use your db connection that's already defined.

For example if you have:

```json
"db": {
    "module": "sequelize",
    "options": {
        // your connection options here.
    }
}
```

Stukko will automatically used this connection. You need only
to specify your config/module with no "storeOptions".

```json
"session": { 
    "use": "express-session", 
    "options": { 
       "module": "connect-sequelize" // only need to specify the connect type. keep in mind "mongo" is the connect session
                                    // module name where your db module may be "mongoose".
    }
} 
```

Conversely if you were to specify a separate connection you would do:

```json
"session": { 
    "use": "express-session", 
    "options": { 
        "module": "mongo",
        "storeOptions": { // my connection options here } 
    } 
}
```

All connect-session modules support their native settings created by the original developers. Hence you need merely 
to set the "options" property in the "session" property with the options defined in their readme files. 
You can find those below:

[connect-redis](https://github.com/visionmedia/connect-redis)
[connect-mongo](https://github.com/kcbanner/connect-mongo)
[connect-session-sequelize](https://github.com/mweibel/connect-session-sequelize)

##Middlware Configuration

Middleware can be configured several ways. You can return the middleware from within a constructor thereby ensuring 
the Stukko context will be available, you can create a simple middleware signature much like you'd do in express and 
lastly you can create middleware as an object much like Stukko does internaly so as to control the order of the 
middleware.

**Basic Middleware**

```js
module.exports = function(req, res, next) {
    // do something
    next();
};
```

**Middlware with Context**

```js
module.exports = function(req, res, next) {
    // do something with context
    // this is the host you specified in your development.json file for example.
    var host = this.options.host; 
    next();
};
```

**Advanced Middleware Object**

```js
module.exports = {
    enabled: true,
    order: 99, // add me to the end of the middlware stack. NOTE: bodyParser, logger(morgan), csurf, cors and 
              // all the default middlware in the core Stukko.js middleware will be first in the order as they must 
              // be first in the stack.
    use: function(req, res, next) { // note this could simply be the string name of a module or 
                                    // package to require as well cool right? 
    }
};
```

##Assets & Linking

**Bundling Assets**

Stukko will bundle your assets in the defined folders to be watched/cleaned. The properties of the assets object within your
options configuration are explained below. Assets are generally output to /web/public followed by the extension name
of the file. For example scripts that are javascript will be output to /web/public/js.

Bundling is somewhat agnostic in that you can define as many bundling tasks as you wish. By default the following
tasks are predefined:

+*styles*       - bundles css stylesheets
+*scripts*      - bundles scripts.
+*framework*    - bundles your framework logic.
+*views*        - bundles views for html minification.

There are several options for bundling some common configurations, see configuration options for more details.

```json
"styles": {
    "strategy": "copy",
    "watch": "./web/assets/styles/**/*.scss",
    "minify": false,
    "clean": true,
    "cleanAppend": "/**/*.css",
    "src": [
        "./web/assets/styles/*.scss"
    ],
    "dest": "./web/public/css",
    "options": {}
},
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
"scripts": {
    "strategy": "copy",
    "watch": true,
    "minify": false,
    "clean": true,
    "cleanAppend": "/**/*.js",
    "src": [
        "!./web/assets/scripts/mixins/**/*.js",
        "./web/assets/scripts/**/*.js"
    ],
    "dest": "./web/public/js",
    "options": {}
},
"scripts-mixins": {
    "strategy": "concat",
    "watch": true,
    "minify": false,
    "clean": true,
    "cleanAppend": "/**/*.js",
    "as": "mixins.js",
    "src": [
        "./web/assets/scripts/mixins/**/*.js"
    ],
    "dest": "./web/public/js/app",
    "options": {}
},
"bower-components": {
    "strategy": "bower",
    "watch": false,
    "minify": false,
    "clean": true,
    "cleanAppend": "/**/*.*",
    "componentPath": "./web/assets/bower_components",
    "preserveStructure": true,
    "src": [],
    "dest": "./web/public/js/vendor",
    "options": {}
}
```

**Asset Linking**

Asset linking is one of the more cool features of Stukko. Using Gulp we minify, concat and preprocess your less/sass 
files automatically. This is invaluable and prevents the need to restart your application over and over as these files
are also watched live.

You shouldn't need to modify these settings in your options unless you are changing paths. However one of the key
things to consider is how it is structured. 

You'll notice in "layout.html" that there are sections for styles and javascript that look like:

```html
<!-- inject:js-->
<!-- endinject -->
```

Of course the above only applies if you are using a view engine that uses the .html extension or more specifically uses
pure html markup for its rendering. Such as EJS, Hogan and so on. The default engine in Stukko is 
[Hogan](http://twitter.github.io/hogan.js/). The very engine created by [Twitter](https://dev.twitter.com/).

If you wish to use a view engine that does not use html for its markup such as [Jade](http://jade-lang.com/), your
start and end tags would look like the below:

```json
{
      "starttag": "// inject:css",
      "endtag": "// endinject",
      "css": "link(rel='stylesheet', href='{{file}}')",
      "js": "script(src='/js/app.js')"
}
```

An easy way to get the correct syntax for your language is to use a convert. You can find one for just about any lang.
Here are a few where you can copy/past the HTML representation and have it converted to your view engine of choice.

[Jade Converter](http://html2jade.aaron-powell.com/)

[Haml Converter](http://html2haml.heroku.com/)

##Database Support

Currently Stukko supports the following database engines:

- [dirty](https://github.com/felixge/node-dirty)
- [MongoDB](https://github.com/mongodb/node-mongodb-native/)
- [Mongoose](https://github.com/LearnBoost/mongoose)
- [Sequelize](https://github.com/sequelize/sequelize)
- [Redis](https://github.com/mranney/node_redis)

See "Models" folder readme for connection documentation.

**Configuration Options**

See [Full Configration Options](/lib/structure/server/configuration#configuration)

The below would start a project using the "laptop.json" config withing /server/configuration. You might use a config
such as this to support remote connection settings to your database.

```sh
$ stukko start --config laptop
```









