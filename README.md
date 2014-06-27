#Stukko

##Pre-Release

This is a pre-release. Using in production should be done with caution.

##Express MVC Web Framework.

The following is an overview of the key features in Stukko. Most if not all features have additional configuration 
examples and documentation in their respective application folders. For example to understand how middleware 
can be configured see the /server/middleware/README.md file.

##Getting Started

###To install Stukko from a command prompt or terminal:

````
npm install -g stukko
````

It is best to install Stukko globally as it exposes create methods to create your application which will run on Stukko.
Stukko also exposes several methods for managing its apps. Uninstall, install, update, diagnostics, kill(kills node
processes for that EADDRINUSE) among others which we'll cover below. if you plan to host your application installing 
locally is just fine.

###To create an application:

From a command prompt or terminal navigate to the parent directory where you'd like your application to be installed.
Stukko will create a sub folder by the name you choose in the create method show below:

````
stukko create todos
````

**NOTE** You do note need to run npm install after the application is created. Stukko programatically runs npm install
for you. It is important to also note that if you have additional packages you wish to install at the time of creation
you can do this as well. Stukko ships with the **dirty** database module only. You'll likely be needing to install
MongoDB, Mongoose, Sequelize or Redis. Or perhaps you want to install connect-redis, connect-mongo or connect-sequelize,
this can be accomplished in one shot as show here:

###Create application with additional packages:

````
stukko create todos --packages sequelize|connect-sequelize
````

**NOTE** You can separate packages using a pipe or comma.

##What is Stukko?

Stukko is merely a wrapper for Express and its common dependency modules. Where Stukko is different than other Express
based frameworks you might have tried is in the way it exposes the expected methods and feel you're used to. Instead
of being opinionated with structure, default modules and so on it attempts to only make wiring up your application 
more simplistic. More succinctly it takes out some of the redundancy of creating a Node/Express application. Stukko is
extremely customizable. Paths and structure can be customized to your liking. Features can be enabled or disabled
rather easily. Middleware is not only added to the Express stack but a mechanism to order the middleware (why this isn't
common is all frameworks is a head scratcher) is available when sequence is critical.

###Does Stukko have an ORM?

Not really, again the idea behind Stukko is to wire up an app with the common middleware, get you connected to your
database, hook up your sessions and inject some helpers in your request and response objects. **Why didn't we include
an ORM?** Well, we did at one point, however we found that no matter how complete we made it, there was great difficulty
in exposing all the features of the original driver for each database engine. Additionally most use a database they
are familiar with so changing engines is not as common as you might think. ORM's are cool but at the end of the day
when it comes time to source a fix for a problem its helpful when the code you find is the same code you can use in 
your project. More on this below but Stukko makes it easy to connect to your database using Redis, MongoDB, Mongoose,
Dirty or Sequelize. So what's the point then? Stukko exposes some additional things. It automatically exposes your
models and creates them based on the engine you're using. It also expose methods to the engine's client, connection,
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
MySQL, PostgreSQL, SQLite, MariaDB (connect-session-sequelize). Sequelize is a SQL Orm which enables connections to 
the fore mentioned SQL engines.

It is important to note that connect-mongo (when using mongoose ONLY) and connect-session-sequelize support 
connecting using existing database connections if you have defined them. For example in your config if 
you have the following: 

````
db: {
    module: 'mongoose',
    options: {
        // your connection options here.
    }
}
````

and are using mongodb for your database connection, Stukko will automatically used this connection. You need only
to specify your config with no "storeOptions" specified.

````
session (under middleware): { 
    use: 'express-session', 
    options: { 
        name: 'mongo' // only need to specify the connect type. keep in mind "mongo" is the connect session 
                     // module name where your db module may be "mongoose".
    }
} 
````

Conversely if you were specify a separate connection you would configure 

````
session: { 
    use: 'express-session', 
    options: { 
        name: 'mongo', 
        storeOptions: { // my connection options here } 
    } 
}
````

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

````
module.exports = function(req, res, next) {
    // do something
    next();
};
````

**Middlware with Context**

````
module.exports = function(req, res, next) {
    // do something with context
    // this is the host you specified in your development.json file for example.
    var host = this.options.host; 
    next();
};
````

**Advanced Middleware Object**

````
module.exports = {
    enabled: true,
    order: 99, // add me to the end of the middlware stack. NOTE: bodyParser, logger(morgan), csurf, cors and 
              // all the default middlware in the core Stukko.js middleware will be first in the order as they must 
              // be first in the stack.
    use: function(req, res, next) { // note this could simply be the string name of a module or 
                                    // package to require as well cool right? 
    }
};
````

##Assets & Linking

**Bundling Assets**

Stukko will bundle your assets in the defined folders to be watched. The properties of the assets object within your
options configuration are explained below. Assets are generally output to /web/public followed by the extension name
of the file. For example mixins that are javascript will be output to /web/public/js.

+ **clean** + when true cleans your public directory before building the application, typically in /web/public.

+ **watch** + when true your /web/assets directory is watched live for changed and will re+process or re+build your
        application when a change is detected. NOTE files that are added or deleted currently do not get built. You'll
        need to manually restart for those instances. Additionally we've decided not to link assets that are newly created. 
        You'll need to reload your project manually. There are sound reasons not to do this. We may revisit this in the 
        future.
        
+ **backup** + when true you will notice the /web/public directory is backed up prior to building and will be located in 
         /.backup.
         
+ **link** + see below

+ **mixin** + Concatenates all files and files within sub folders to a single file by the name you define in the concat
        property. This is good for common things, utilities and the like that don't need to be in separate directories.
        
+ **minify** + This folder when output maintains the defined file structure when output to /web/public/js or /web/public/css
         respectively. NOTE that when in development mode these files will merely be copied to the output location.
         This is because debugging unminified files makes more sense when developing. When you run your project in 
         "production" mode these files will be automatically minified as you'd expect.
         
+ **preprocess** + Processes less and sass files. Only the root files are processessed. All dependency files should be imported
             into your root theme file.

+ **framework** + This defines how to watch/build your client+side frameworks such as AngularJS, Backbone, Ember and the like.
            all files in this directory will be concatenated into a single file by the name you define in the concat
            property.



**Asset Linking**

Asset linking is one of the more cool features of Stukko. Using Gulp we minify, concat and preprocess your less/sass 
files automatically. This is invaluable and prevents the need to restart your application over and over as these files
are also watched live.

You shouldn't need to modify these settings in your options unless you are changing paths. However one of the key
things to consider is how it is structured. You have two main configurations. The "Common" object and the "Application"
object. Common is as you'd expect, they are files that are more or less dependencies your application needs to run. 
The Application object would be assets that **MUST** be included in your layout file after the common assets.

You'll notice in "layout.html" that there are sections for styles and javascript that look like:

````
<!-- inject:common:js-->
<!-- endinject -->
````

Of course the above only applies if you are using a view engine that uses the .html extension or more specifically uses
pure html markup for its rendering. Such as EJS, Hogan and so on. The default engine in Stukko is 
[Hogan](http://twitter.github.io/hogan.js/). The very engine created by [Twitter](https://dev.twitter.com/).

If you wish to use a view engine that does not use html for its markup such as [Jade](http://jade-lang.com/), your
start and end tags withing "common" or "application" would look like the below:

````
{
      starttag: '// inject:css',
      endtag: '// endinject',
      css: 'link(rel="stylesheet", href="{{file}}")',
      js: 'script(src='/js/app.js')'
}
````

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







