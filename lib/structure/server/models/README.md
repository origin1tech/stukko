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

Creating a model for Mongoose is quite simple and rather similar if not the same as you might have in the past.
The current connection is made available and is injected as a dependency. "db" as you see below is your connection
to mongoose/mongodb. You can also access the client, connections and so on from the $$DB global variable.

```js   
    
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
        
        return db.model('User', User);
    }
    
    /* Using Global $$DB Object
    ****************************/
        
    var User = new $$DB.Schema({
        firstName: String,
        lastName: String,
        email: String
    });
        
    module.exports = $$DB.model('User', User);
    
```

###Sequelize Example

Sequelize is an ORM for MySQL, MariaDB, PostgreSQL and SQLite. After specifying your connection options in your configuration
along with your dialect, use the below example to create your models.

```js        
    
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
    
    
    /* Using Global $$DB Object
    ****************************/
    
    module.exports = function () {
            
        var Model, db, types;
        
        db = $$DB.connection;
        types = $$DB.client;
        
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
    
```

###MongoDB Example

As with the mongoose example you can either export the collection directly or you can wrap in a function to access context. 

```js   

    /* With Context & Injection
    *****************************/

    module.exports = function (db) {
  
        // create a new collection.
        var User = db.collection('User');
        
        // from here you may want to configure indexes & other features.
  
        return User;
    }    
    
    // yep it could be this simple, just a simple collection.
    module.exports = $$DB.connection.collection('User');
  
    
```

###Dirty Example

Dirty is just that a down and dirty key value in process database. It performs rather well and great for early development
of your application. You can reliably use it in production for simple applications. The stukko-dirty module adds Model
instance functionality to a Dirty.js database. The feel is very similar to Mongoose. In fact many of the same filtering
criteria are used. Such as '$gt', '$lt', '$regex', '$ne', '$in', '$nin', '$and' as well as a few others. Essentially
we implemented the most commonly used. Feel free to PR to add additional filters following the mongoose convention 
and we'll gladly merge them in!

```js   

    /* With Context & Injection
    *****************************/

    module.exports = function (db) {
        
        var schema = db.Schema({
        
           firstName: String,
           lastName: String,
           email: String,
           
           // virtual properties.
           fullName: function () {
              return this.firstName + ' ' + this.lastName;
           }
           
        });
        
        return db.model('User', schema);
    }    
  
    
```



