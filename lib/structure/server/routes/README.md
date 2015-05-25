#Routes
----

Routes are extremely powerful. You can route to a controller, redirect a url, render a view directly and 
even specify security policies to validate against along the way.

It's **important** to note that unlike Controllers, Helpers and Security modules, Route modules are merged into one 
single object. The purpose of not defining a single file to store routes is to make it easier to maintain and group. 
With that said for simple applications you may choose to use only one route file.

Some example routes:

```js

module.exports = {

    // not implemented future feature.
    router: 'router_name',
    
    // routes default to GET method if no method is specified.
    // in this example the route would call the "user" controller and the "profile" action.
    '/user/profile': 'user.profile',
    
    // in this example the authenticated security policy is checked first
    // before finally routing to the "user" controller and the "profile" action.
    '/user/profile': ['auth.authenticated', 'user.profile'],
    
    // this example would directly render the "profile.html" view located in the /views/user directory.
    // keep in mind the above assumes you are using the .html extension and your views directory is 
    // the default /views.
    // you may also use "render" or "view" interchangeably.
    'view /user/profile': 'user/profile',
    
    // this may not seem that useful but can be handy during development
    // as well as provide a nice way to temporarily redirect users
    // when decommissioning a controller or action etc.
    'redirect /user/profile': 'user.profileNew'
    
    // it is possible to route directly to a function as well.
    // doing so however is not recommended, better to maintain separation and make use of a controller.
    // with that said it can be useful during development.
    '/user/profile: function (req, res, next) {
        res.render('user/profile');
    }
    
}

```