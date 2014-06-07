'use strict';

(function () {

	/* PRIVATE METHODS
	 **********************************************/

	function createId() {
		var d = new Date().getTime(),
			uuid;
		uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		});
		return uuid;
	}

	function isType(value, type) {
		var result = false,
			reqType = new type(),
			parseType;
		type = Object.prototype.toString.call(reqType)
			.replace(/^\[object (.+)\]$/, "$1").toLowerCase();
		parseType = Object.prototype.toString.call(value)
			.replace(/^\[object (.+)\]$/, "$1").toLowerCase();
		reqType = undefined;
		return { valid: parseType === type, parsed: parseType, required: type };
	}

	function isString (value){
		return isType(value, String).valid;
	}

	function isNumber (value){
		return isType(value, Number).valid;
	}

	function isDate (value){
		return isType(value, Date).valid;
	}

	function isArray (value){
		return isType(value, Array).valid;
	}

	function isBoolean (value){
		return isType(value, Boolean).valid;
	}

	function isFunction(value) {
		return isType(value, Function).valid;
	}

	/* MODEL OBJECT
	 **********************************************/

	function Model(collection, model, options, conn){

		// assume no options pass options is connection.
		if(!conn) {
			conn = options;
			options = undefined;
		}

		options = options || {};

		if(!collection)
			throw new Error('Collection name is required.');
		if(!model)
			throw new Error('Model properties are required.');
		if(!conn)
			throw new Error('A database connection is required.');

		// the database connection.
		this.conn = conn;		                // the database connection.
		this.collection = collection;			// the name of the collection.
		this.schema = true; 				    // when true unknown properties are ignored.
		this.uuid = true;						// when true id's will automatically be generated as UUID strings.
		this.model = model;                     // create the model.

		// extend options.
		this.extend(options, this);

		// get the collection.
		this.get();          // the data collection.

		return this;
	}

	Model.prototype.extend = function extend(ext, obj){
		var prop;
		for(prop in obj){
			if(obj.hasOwnProperty(prop)){
				ext[prop] = obj[prop] || ext[prop];
			}
		}
	};

	Model.prototype.get = function get() {
		var coll = this.conn.get(this.collection) || [];
		console.log(coll);
		return coll;
	};

	Model.prototype.find = function find(predicate) {
		var coll = this.get(),
			found;
		if(isFunction(criteria)){
			found = coll.filter(predicate);
		} else {
			found = coll.filter(function(v) {
				return v.id === predicate;
			});
		}
		return found || [];
	};

	Model.prototype.create = function create(obj, cb) {
		var self = this,
			coll = this.get(),
			err;
		if(!isArray(obj)){
			obj = [obj];
		}
		obj.forEach(function (o) {
			err = self.validate(o);
			if(err) {
				if(cb) cb(err);
				else throw err;
			} else {
				o.id = createId();
				coll.push(o);
			}
		});

		this.conn.set(this.collection, coll, function () {
			if(cb) cb(null, coll);
		});
	};

	Model.prototype.update = function update(predicate, models, cb){
		var self = this,
			coll = this.get(),
			found = this.find(predicate),
			errors = [],
			updateModel;
		if(!isArray(models))
			models = [models];
		function filterModel(id) {
			return models.filter(function (v,k) {
				return v.id === id;
			})[0] || undefined;
		}

		found.forEach(function (v,k) {
			updateModel = filterModel(v.id);
			if(!updateModel){
				cb(new Error('Unknown model could not be updated.'));
			} else {
				for(var prop in v) {
					if(v.hasOwnProperty(prop) && updateModel[prop]){
						v[prop] = updateModel[prop];
					}
				}
			}
		});

		this.conn.set(this.collection, coll, function () {
			cb(null, found);
		});

	};

	Model.prototype.destroy = function destroy(predicate, cb){
		var self = this,
			coll = this.get(),
			found;
		if(isFunction(criteria)){
			found = coll.filter(predicate);
		} else {
			found = coll.filter(function(v) {
				return v.id === predicate;
			}) || [];
		}
		if(!found.length){
			var err = new Error('Unable to destroy record with the provided criteria. The record could not be found.');
			cb(err);
		} else {
			found.forEach(function (v,k) {
				coll.splice(coll.indexOf(v), 1);
			});
			this.conn.set(this.collection, coll, function () {
				cb(null, found);
			});
		}
	};

	Model.prototype.destroyAll = function destroyAll(cb) {
		this.conn.rm(this.collection, cb);
	};

	Model.prototype.validate = function validate(obj) {

		var self = this,
			keys = Object.keys(obj),
			errors = [],
			errObj = {},
			isValid = true,
			err,
			type,
			prop;

		keys.forEach(function (k) {
			if(!isValid) return;
			prop = self.model[k] || undefined;
			errObj = {};
			// delete property if schema is required.
			if(!prop && self.schema)
				return delete obj[k];
			type = isType(obj[k], self.model[k]);
			if(!type.valid) {
				errObj[k] = 'The property ' + k + ' expects a type of ' +
					self.model[k] + ' but ' + isType.type + ' was provided.';
				errors.push(errObj);
				isValid = false;
			}
		});

		if(!errors.length) return undefined;

		err = new Error('The ' + this.model + ' could not be validated.');
		err.validations = errors;
		return err;

	};

	module.exports = Model;

})();