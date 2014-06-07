#Models
----

Models are used to expose your models/collections to your controllers and so on. Models can be created in several ways.
With that said creating a model/collection is done exactly the same as the database engine driver specifies.

You should be aware that models when exported in this manner are named by the file name for which they are contained. If you have a file named user.js.
The globally exposed model name would be "User". you can set the casing type for naming the model in your server/configuration/config_name.json file.
The property to set is db.modelCase. Valid options are undefined (will leave as you've named the file), capitalize (caps the first letter and is the default), uppercase,
camel, lower or pascal.

**NOTE**: Dirty and MySQL do not directly support models. However you can easily create classes using prototype methods for common tasks. See the examples folders for concepts you may wish to implement.

MongoDB     -   [https://github.com/mongodb/node-mongodb-native](https://github.com/mongodb/node-mongodb-native)

MySQL       -   [https://github.com/felixge/node-mysql](https://github.com/felixge/node-mysql)

Mongoose    -   [https://github.com/LearnBoost/mongoose](https://github.com/LearnBoost/mongoose)

Dirty       -   [https://github.com/felixge/node-dirty](https://github.com/felixge/node-dirty)

###Mongoose Example

There are two was you can create a model. First you can simply export the model directly as you might have done in the past or you can return the model from a function so as to access Stukko's context.

<pre>
    
    /* Default
    ***********/
    
    var User = new DB.Schema({
        firstName: String,
        lastName: String,
        email: String
    });
    
    module.exports = DB.model('User', User);
    
    /* With Context
    ****************/
    
    module.exports = function () {
    
        // access the Stukko context and perhaps
        // grap some value from your app's package.json.
        
        var version = this.pkgapp.version;
        
        // do something with the version.
 
         var User = new DB.Schema({
            firstName: String,
            lastName: String,
            email: String
        });
            
        return DB.model('User', User);
        
    };
    
</pre>

###MongoDB Example

As with the mongoose example you can either export the collection directly or you can wrap in a function to access context. 
You should also note that since MongoDB collections are rather simple and without schema you could also name your Model file simply "Models". 
Then within the file create each collection then return the collections. You would then access your models as Models.User, Models.Blog and so on.

<pre>

    /* Default
    ****************/
    
    // yep it could be this simple.
    module.exports = DB.connection.collection('User');

    /* With Context
    ****************/

    module.exports = function () {
    
        var conn, collection;
            
        // get the MongoDB connection.
        conn = DB.connection;
        
        // create a new collection.
        collection = conn.collection('User');
        
        // from here you may want to configure indexes
        // or you may want to drop a collection using a promise then return etc.
    
        return collection;
    }
    
    /* Multiple Collections
    ************************/
    
    module.exports = function () {
    
        var conn, collections;
            
        // get the MongoDB connection.
        conn = DB.connection;
        
        collections = {};
        
        // create a new collection.
        collections.User = conn.collection('User');
        collections.Note = conn.collection('Note');
        
        // the above collections would be accessed as 
        // Model.User and Models.Note if the file they are contained
        // in is named "models.js".  
    
        return collections;
    }    
    
</pre>





