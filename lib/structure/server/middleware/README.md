#Middleware
----

Middlware directory contains all of your custom middleware handlers to be added to the Express stack.

There are two ways to configure middleware. The first is what you are probably already familiar with as seen below:

###Standard Middleware

<pre>
    module.exports = function (req, res, next) {
    
        // do something handle request or response.
        if('some condition')
            res.redirect('/login');
        
        // or if meets condition continue down stack.
        else
            next();
    };
</pre>

###Ordered Middleware

In some cases the order of your middleware is quite important. For these use cases Stukko allows you to specify middleware
as an object with an order property.

<pre>
    module.exports = {
    
        enabled: true,
        order: 1,
        use: function (req, res, next) {
              // do something handle request or response.
                    if('some condition')
                        res.redirect('/login');
                    
            // or if meets condition continue down stack.
            else
                next();
        }
    }
</pre>

###Middleware w/ Require

You can also configure your middleware in the same manner that the default options middleware is configured for common modules in Express is.

Simply set the property require: true and for use: 'module-name'. Stukko will automatically search within its own modules as well as the application's.

If it finds the module successfully it is required and any options provided are applied to it.

<pre>
    module.exports = {
    
        enabled: true,
        require: true,
        use: 'module-name',
        options: {} // can be string, object or array, Stukko will sort it out automatically for you.
        
    }
</pre>

