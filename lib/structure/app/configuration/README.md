#Configuration
----

You may create as many configurations as you wish. Often no more than a development, productions and perhaps a local are required.

As the entire configuration is loaded and exposed in middleware you may wish to create custom properties/objects for use in middleware.

For example from within middleware you might do something like:

<pre>
module.exports = function (req, res, next) {
    var myProperty = this.options.myProperty;
    // do something with myProperty.
};
</pre>