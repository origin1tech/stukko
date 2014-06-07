#Configuration
----

You may create as many configurations as you wish. Often no more than a development, productions and perhaps a local are required.

As the entire configuration is loaded and exposed in middleware you may wish to create custom properties/objects for use in middleware.

For example from within middleware you might do something like:

<pre>
module.exports = function (req, res, next) {
    var myProperty = this.options.myProperty;
    // do something with myProperty.
    // where "this" is the Stukko instance,
    // "options" is the config passed in via development.json for example,
    // and "myProperty" is some property in that config.
};
</pre>

###Session Examples

**NOTE** When defining the database name for session it is best to set this in db.database of your config. Session configurations
will by default use that name which will make things more consistent and easily understood.

**Using MySQL**
The below assumes you are connecting via local host on the default port. You may specify a host/port in the config section. 
You may also specify a database: my_db_name.

See: [https://github.com/nlf/connect-mysql](https://github.com/nlf/connect-mysql)

<pre>
    "session": {
                "use": "express-session",
                "options": {
                    "name": "mysql",
                    "key": "temp.sid",
                    "secret": "725349f4758daa480a74",
                    "storeOptions": {
                        "table": "Session",         
                        "config": {
                            "username": "auth_user",
                            "password": "auth_password"
                        }
                    }
                }
    }
</pre>

