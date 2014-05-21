#Helpers
----

Helpers are methods/functions that are exposed within your application. 

For example you may functions for formatting strings or perhaps some RegExp utility and so on.

See below for an example of a helper module where the file name/module-name is format.js:

<pre>
    module.exports = {
        
        return {        
           truncate: function (str, len, trail) {
                trail = trail || '...';   
                if(str.length <= len) return str;
                return str.slice(len - trail.length) + trail;
           }        
        };     
        
    };
</pre>

From a controller you would call the above helper like so:

<pre>
    module.exports = {
        profile: function (req, res, next) {                  
            
            var self = this,
                data = {}, // get the user data from your database.
                format = self.helpers.format;
                
            data.url = format.truncate(data.url, 30);
            
        }
    }
</pre>

**NOTE:** wrapping a helper module in a function is not required however you may wish to do so to apply context. 

