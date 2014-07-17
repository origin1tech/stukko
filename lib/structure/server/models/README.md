#Models

Models are used to expose your models/collections to your controllers and so on. Models can be created in several ways.
With that said creating a model/collection is done exactly the same as the database engine driver specifies.

You should be aware that models when exported in this manner are named by the file name for which they are contained. If you have a file named user.js.
The globally exposed model name would be "User". you can set the casing type for naming the model in your server/configuration/config_name.json file.
The property to set is db.modelCase. Valid options are undefined (will leave as you've named the file), capitalize (caps the first letter and is the default), uppercase,
camel, lower or pascal.

**NOTE**: Dirty and MySQL do not directly support models. However you can easily create classes using prototype methods for common tasks. See the examples folders for concepts you may wish to implement.

MongoDB     -   [https://github.com/mongodb/node-mongodb-native](https://github.com/mongodb/node-mongodb-native)

Sequelize   -   [https://github.com/sequelize/sequelize](https://github.com/sequelize/sequelize)

Mongoose    -   [https://github.com/LearnBoost/mongoose](https://github.com/LearnBoost/mongoose)

Dirty       -   [https://github.com/felixge/node-dirty](https://github.com/felixge/node-dirty)

###Mongoose Example

There are two ways you can create a model. First you can simply export the model directly as you might have done in the past or you can return the model from a function so as to access Stukko's context.

<pre>   
    
    /* With Context & Injection
    *****************************/
    
    module.exports = function(db) {

        var Schema = db.Schema,
            User;
            
        User = new Schema({
            firstName: String,
            lastName: String,
            email: String
        });
        
        return Model('User', User);
    }
    
    /* Using Global $DB Object
    ****************************/
        
    var User = new $DB.Schema({
        firstName: String,
        lastName: String,
        email: String
    });
        
    module.exports = $DB.model('User', User);
    
</pre>

###Sequelize Example

Sequelize is an ORM for MySQL, MariaDB, PostgreSQL and SQLite. After specifying your connection options in your configuration
along with your dialect, use the below example to create your models.

<pre>        
    
    /* With Context & Injection
    *****************************/
    
    module.exports = function (db, types) {
        
        var Model;
        
        Model = db.define('User', {
    
            first_name: { type: types.STRING },
            last_name: { type: types.STRING },
            email: { type: types.STRING }
    
        },
    
        {
  
            // Defines associations.
            associate: function (models){
                Model.belongsTo(models.Group);
            }
    
            // Defines getters for model properties.
            //getterMethods: {},
    
            // Defines setters for model properties.
            //setterMethods: {},
    
            // Defines associations and class methods.
            //classMethods: { associate: function (models) { } },
    
            // Defines methods for "this" instance of the model.
            //instanceMethods: {},
    
            // Defines before/after hooks for a model.
            // NOTE the below hooks all have "Bulk" counter parts
            // Hooks: beforeCreate, afterCreate, beforeUpdate, afterUpdate,
            //        beforeValidate, afterValidate, beforeDestroy, afterDestroy
            //hooks: {}
    
        });
    
        return Model;
        
    };
    
    
    /* Using Global $DB Object
    ****************************/
    
    module.exports = function () {
            
        var Model, db, types;
        
        db = $DB.connection;
        types = $DB.client;
        
        Model = db.define('User', {
    
            first_name: { type: types.STRING },
            last_name: { type: types.STRING },
            email: { type: types.STRING }
    
        },
    
        {
  
            // Defines associations.
            associate: function (models){
                Model.belongsTo(models.Group);
            }
    
            // Defines getters for model properties.
            //getterMethods: {},
    
            // Defines setters for model properties.
            //setterMethods: {},
    
            // Defines associations and class methods.
            //classMethods: { associate: function (models) { } },
    
            // Defines methods for "this" instance of the model.
            //instanceMethods: {},
    
            // Defines before/after hooks for a model.
            // NOTE the below hooks all have "Bulk" counter parts
            // Hooks: beforeCreate, afterCreate, beforeUpdate, afterUpdate,
            //        beforeValidate, afterValidate, beforeDestroy, afterDestroy
            //hooks: {}
    
        });
    
        return Model;
        
    };
    
</pre>

###MongoDB Example

As with the mongoose example you can either export the collection directly or you can wrap in a function to access context. 

<pre>   

    /* With Context & Injection
    *****************************/

    module.exports = function (db) {
  
        // create a new collection.
        var User = db.collection('User');
        
        // from here you may want to configure indexes & other features.
  
        return User;
    }    
    
     /* Using Global $DB Object
     ****************************/
        
    // yep it could be this simple, just a simple collection.
    module.exports = $DB.connection.collection('User');
  
    
</pre>

###Dirty Example

Dirty is just that a down and dirty key value in process database. It performs rather well and great for early development
of your application. You can reliably use it in production for simple applications. With dirty there is no model or
collection structure. You'll need to create your own but you might do something like the below just to give an idea.
When using this type of database client you also may just want to simply set/get things in your controller using the
Global $DB Object.

<pre>   

    /* With Context & Injection
    *****************************/

    module.exports = function (db) {
    
        // this class would likely be required obviously
        // so as to be reusable but you get the idea.        
        function Model(name, properties) {
            // NOTE: Stukko will look for this property if provided.
            // if not available it will use the filename when Stukko
            // iterates your models.
            this.name 
            this.id = 1; // maybe use a Stukko service and generate a guid or something here.
            this.properties = properties;
           
            // add methods here to do things like getting and setting etc.
        }
  
        // create a new model.
        // use standard JavaScript types.
        var User = new Model('User', {
            firstName: String,
            lastName: String,
            email: String
        });
  
        return User;
    }    
  
    
</pre>



