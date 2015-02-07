#Services
----

Services are helper methods that are accessible in the context of your application. The can be accessed via "this"
context within middleware, filters, seeds, handlers, controllers or model creation.

```js

module.exports = {

    // example controller action
    find: function (req, res, next) {
    
        // access the service.
        var srv = this.modules.services['my_service_name']
        
        // do something with the service.        
        var val = srv.myfunc(req.body.value);
        
        // NOTE: you can also reference services
        //       using the global variable.
        var val = $$SERVICES.myfunc(req.body.value);
        
    }

}

```