#Security
----

Security modules are nothing more than middleware really. The only difference is they are merged
with controllers for the purpose exposing them to routes.

Typically we find it best to keep these modules very light. Meaning they should only handle security related
task that pertain to a user or entity. If you need to do heavier lifting its best in our experience to do so
in standard middleware.

Example security policy below:

<pre>
    exports.auth = {
    
        anonymous: function (req, res, next) {
           if(!req.session.user) 
                    next();
            else
                res.error() // user is already authenticated respond with error or perhaps redirect etc.
        },
        
        authenticated: function (req, res, next) {
            // check if user is authenticated.
            if(req.session.user) 
                next();
            else
                res.denied(); // if not authenticated send to denied response handler.
        }
        
    };
</pre>
