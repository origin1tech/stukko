#Handlers
----

An example of a handler would be the default error handler. This handler has errors handed off to it from Stukko.

In the event the handler doesn't exist or there is some error, Stukko will take the default action internally.

##Error Handler

The error handler is called from Stukko internally. This enables the user to define how errors should be displayed.
All four parameters are handed off. The error, request, response and next methods allow you to define whatever
logic is necessary to handle the error.

##Hooks

Hooks are much like middleware, essentially like all things Express they are exactly that. Where hook handlers differ
in Stukko is when they are called. Unlike middleware which is simply called on down the stack, hook handlers are
called at specific times within a given request. The following hooks are supported.

+beforeMiddleware - handled prior to middleware being processed.
+beforeFilters - handled prior to security policy filters.
+beforeActions - handled prior to a controller action being called.

+afterModels - handled after models are defined, not enabled for Sequelize.

**Middlware, Filters, Actions Hook Example**

```js

module.exports = function beforeActions(req, res, next) {

    // do something before for example
    // /user/show/1 calls the controller
    // action user.find

    // otherwise be sure to call next()
    // if you do not call next the route
    // will fail and you'll be given a warning.
    next();

};

```

**DB Model Schema Hook Example**

```js

module.exports = function afterModels(db){

    // "db" param is your connected database object.
    // for example you may access the modelSchema
    // for your mongoose Models creating "toObject"
    // method that converts _id to id then deletes _id.

    _.forEach(db.modelSchemas, function (v,k){

         v.options.toObject = {
            transform: function (doc, ret, options) {
                ret.id = ret._id;
                delete ret._id;
                delete ret.__v;
                return ret;
            }
         };

    });

}

```