#Middleware

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

###Order of Default Middlware

The built in middlware modules are merged with your custom middlware. To assure proper order within
the stack please take note of the default modules ordering. Unless you specify an order in your middleware
it will be sorted after "inject" below. 

NOTE: custom middlware order if not specified increases by 1 whereas default middleware increases by a 
rate of 5 to ensure gaps for inserting custom middleware before/after a default middlware module.

morgan              0
encodedParser       5
jsonParser          10
cookieParser        15
session             20
methodOverride      25
csrf                30
cors                35
i18n                40
public              45
views               50
favicon             55
inject              60

