#Controllers
----

Controllers are used to render data or expose data to your application.

They may do nothing more than return JSON or they may render a view along with a locals object which is parsed when the view is rendered.

See [http://expressjs.com/4x/api.html#res.status](http://expressjs.com/4x/api.html#res.status) for use of the response object.

Example user controller below. 

<pre>
module.exports = {

    // returns json object.
    profile: function (req, res, next) {
        var data = {}; // get data from your database.
        res.json(data); 
    }
     
    // rendering a view with locals.
    profile: function (req, res, next) {
         var data = {}; // get data from your database.
         res.render('profile', data); 
    }      
     
    // using Stukko's dispatcher method.
    profile: function (req, res, next) {
    
         var data = {}; // get data from your database.
         
         // this custom method automatically determines
         // based on the req type what format to return.
         // e.g an html response or json/jsonp.
         res.dispatch([status], view, data, [cb]); 
         
         // example dispatching a view.
         res.dispatch('my_view');
         
         // example dispatching json or jsonp
         res.dispatch(data);
         
         // example dispatching a view with locals along with render callback.
         res.dispatch('my_view', data, function (err, html) {
                if(err)
                    next(err);
                else
                    // do something with the html.
         });
         
         // NOTE: for json only data is required, for html only view is required, 
         // however view defaults to the layout for simplicity when using client-side frameworks and SPA.
    }  
     
};
</pre>