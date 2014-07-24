'use strict';
var Chance = require('chance'),
	p = require('path'),
	helpers;

helpers = {

	/**
	 * Transforms string to requested casing.
	 * @param {string} str - the string to transform.
	 * @param {string} casing - the case to transform to.
	 * @returns {string}
	 */
	stringToCase: function stringToCase(str, casing) {
		casing = casing|| 'cap';
		casing = casing.toLowerCase();
		casing = casing === 'first' || casing === 'capitalize' ? 'cap' : casing;
		if(casing == 'title')
			return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
		if(casing == 'cap')
			return str.charAt(0).toUpperCase() + str.slice(1);
		if (casing == 'camel') {
			return str.toLowerCase().replace(/-(.)/g, function (match, group1) {
				return group1.toUpperCase();
			});
		}
		if (casing == 'pascal')
			return str.replace(/\w+/g, function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); });
		if(casing === 'upper')
			return string.toUpperCase();
		return str;
	},

	/**
	 * Converts JSON to object using try/catch.
	 * @param {object} obj - the object to parse.
	 * @param {*} def - the default value to return.
	 * @returns {*}
	 */
	tryParseJson: function tryParseJson(obj, def) {
		def = def || undefined;
		try{
			obj = JSON.parse(obj);
			return obj;
		} catch(ex) {
			return def;
		}
	},

	/**
	 * Prefix path or paths within object.
	 * @param {string|object} path - the path or object to recurse.
	 * @param {string} prefix - the path to prefix.
	 * @returns {*}
	 */
	prefixPath: function prefixPath(path, prefix) {
		var self = this;
		if(!prefix) return path;
		function recursePaths(obj) {
			_.forEach(obj, function (v, k){
				if(_.isObject(v))
					recusePaths(v);
				else
					obj[k] = self.join(v, prefix, true);
			});
			return obj;
		}
		if(_.isString(path)){
			if(/%cwd%/.test(path))
				path = path.replace('%cwd%', prefix);
			else
				path = this.join(path, prefix, true);
		}
		if(_.isObject(path))
			path = recursePaths(path);
		return path;
	},

	/**
	 * Find property within object using string dot notation.
	 * @param {object} obj - the object to parse.
	 * @param {string} prop - the dot notated string.
	 * @param {boolean} strict - if strict much match casing.
	 * @returns {*}
	 */
	findByNotation: function findByNotation(obj, prop, strict){
		var props = prop.split('.');
		strict = strict || false;
		while (props.length && obj) {
			var comp = props.shift(),
				match;
			if(!strict)
				match = new RegExp('(.+)\\[([0-9]*)\\]', 'i').exec(comp);
			else
				match = new RegExp('(.+)\\[([0-9]*)\\]').exec(comp);
			if ((match !== null) && (match.length == 3)) {
				var arrayData = { arrName: match[1], arrIndex: match[2] };
				if (obj[arrayData.arrName] != undefined) {
					obj = obj[arrayData.arrName][arrayData.arrIndex];
				} else {
					obj = undefined;
				}
			} else {
				obj = obj[comp];
			}
		}
		return obj;
	},


	/**
	 * Sorts an array with optional primers.
	 * @param {array} arr - the array to sort.
	 * @param {string} properties - the properties to sort by.
	 */
	sort: function sort (arr, properties /*, primers*/) {
		var primers = arguments[2] || {};
		properties = properties.split(/\s*,\s*/).map(function(prop) {
			prop = prop.match(/^([^\s]+)(\s*desc)?/i);
			if( prop[2] && prop[2].toLowerCase() === 'desc' ) {
				return [prop[1] , -1];
			} else {
				return [prop[1] , 1];
			}
		});
		function compareValue(x, y) {
			return x > y ? 1 : x < y ? -1 : 0;
		}
		function compare(a, b) {
			var arr1 = [], arr2 = [];
			properties.forEach(function(prop) {
				var aValue = a[prop[0]],
					bValue = b[prop[0]];
				if( typeof primers[prop[0]] != 'undefined' ) {
					aValue = primers[prop[0]](aValue);
					bValue = primers[prop[0]](bValue);
				}
				arr1.push( prop[1] * compareValue(aValue, bValue) );
				arr2.push( prop[1] * compareValue(bValue, aValue) );
			});
			return arr1 < arr2 ? -1 : 1;
		}

		arr.sort(function(a, b) {
			return compare(a, b);
		});
	},

    /**
     * Compares two version numbers by comparator.
     * @param {string} v1 - the first version number.
     * @param {string} v2 - the second version number.
     * @param {string} comparator - the comparator for comparing the two versions. ex: '=='
     * @returns {Object}
     */
    compareVersions: function compareVersions(v1, v2, comparator){

        comparator = comparator || '==';

        var v1parts = v1.split('.'), v2parts = v2.split('.'),
            maxLen = Math.max(v1parts.length, v2parts.length),
            part1, part2,
            cmp = 0;

        for(var i = 0; i < maxLen && !cmp; i++) {
            part1 = parseInt(v1parts[i], 10) || 0;
            part2 = parseInt(v2parts[i], 10) || 0;
            if(part1 < part2)
                cmp = 1;
            if(part1 > part2)
                cmp = -1;
        }

        return eval('0' + comparator + cmp);

    },


	/**
	 * Verifies that request is of the same origin.
	 * @param {object} req - the Express request object.
	 * @returns {boolean}
	 */
	sameOrigin: function sameOrigin(req) {
		var domain = req.headers.origin.match(/^https?:\/\/([^:]+)(:\d+)?$/)[1];
		return (req.host == domain);
	},

	/**
	 * Wrapper to expose the Chance lib.
	 * @param {string} method - the method to call.
	 * @param {object} options - options to pass to the method.
	 * @returns {*}
	 */
	chance: function chance(method, options) {
		var chance = new Chance();
        return chance;
	},

	/**
	 * Concats a regular expression from an array.
	 * @param {array} arr - the array to parse.
	 * @param {string} options - RegExp option flags.
	 * @param {string} prefix - prefix added to each value.
	 * @param {string} suffix - suffix added to each value.
	 * @returns {RegExp}
	 */
	joinRegex: function joinRegex(arr, options, prefix, suffix) {
		var regex, tmp;
		_.forEach(arr, function (v, k) {
			tmp = prefix || '';
			tmp += v;
			tmp += suffix || '';
			arr[k] = tmp;
		});
		return new RegExp('(' + arr.join('|') + ')', options);
	},

	/**
	 * A try/catch to test if a module can be required.
	 * @param {string} module - the module name.
	 * @returns {boolean}
	 */
	canRequire: function canRequire(module) {
		try{
			require.resolve(module);
			return true;
		}catch(e){
			return false;
		}
	},

	/**
	 * Gets the signature of a method.
	 * Returning array of arguments.
	 * @param {function} fn
	 * @returns {array}
	 */
	getSignature: function getSignature(fn) {

		var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
		var ARGUMENT_NAMES = /([^\s,]+)/g;
		function get(func) {
			var fnStr = func.toString().replace(STRIP_COMMENTS, '');
			var result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
			if(result === null)
				result = [];
			return result
		}
		return get(fn);
	},

	/**
	 * Formats string by passing string as first argument
	 * followed by arguments for replacing or key/value object for replacing.
	 * @returns {object}
	 */
	format: function format(str /*, replacements*/) {
		var args = [].slice.call(arguments);
		args.splice(0,1);

		if(_.isObject(args[0])){
			_.forEach(args[0], function (v,k) {
				str = str.replace('{' + k + '}', v);
			});
		} else {
			for(var i = 0; i < args.length; i++){
				str = str.replace(/{\d}/, args[i]);
			}
		}
		return str;
	},

	/**
	 * Finds the index of a given character in a string.
	 * @param {string} str - the string to search.
	 * @param {string} chr - the character to lookup.
	 * @param {number} [instance] - the instance of the char. default is 1. also accepts last for last instance of char.
	 * @returns {*}
	 */
	findIndex: function findIndex(str, chr, instance) {
		var ctr = 1,
			result,
			last;
		for(var i = 0; i < str.length; i++) {
			if(result) return;
			if(str.charAt(i) === chr){
				if(ctr === idx)
					result = i;
				else
					ctr += 1;
				last = i;
			}
		}
		if(instance === 'last')
			result = last;
		return result;
	},

	/**
	 * Gets package version number.
	 * @param {string} str
	 * @returns {string}
	 */
	getVersion: function getVersion(str) {
		var match;
		if(/(https|git|ssh)/.test(str)){
			if(/master/g.test(str))
				return 'master';
			match = str.match(/[0-9]\.[0-9]\.[0-9]/g);
			if(match && match[0])
				return match[0];
		}
		return undefined;
	},

	/**
	 * Attempts to resolve a module within
	 * Stukko or the application. If not found
	 * will throw an error.
	 * @param {string} module - the module to resolve.
	 * @returns {module}
	 */
	resolveModule: function resolveModule(module) {
		var io = require('./io'),
			modulePath;
		if(helpers.canRequire(module))
			return require(module);
		modulePath = io.resolve('./node_modules/' + module);
		if(helpers.canRequire(modulePath))
			return require(modulePath);
		return undefined;
	},

	/**
	 * Checks if path is relative.
	 * @param {string} path - the string to check if relative.
	 * @returns {boolean}
	 */
	relativePath: function relativePath(path) {
		var normal = p.normalize(path),
			absolute = p.resolve(path);
		return normal !== absolute;
	},

	/**
	 * Check if a path contains a directory.
	 * @param {string} path - the path to inspect.
	 * @param {string} dir - the directory to test.
	 * @returns {boolean}
	 */
	containsDirectory: function containsDirectory(path, dir) {
		var arr = path.split(p.sep);
		return _.contains(arr, dir);
	},

	/**
	 * Wrapper to path.resolve() see Node documentation.
	 * @param {string} path - the path to resolve to absolute.
	 * @returns {string}
	 */
	pathToAbsolute: function pathToAbsolute(path) {
		return p.resolve(path);
	},

    /**
     * Compares two paths returning the difference.
     * @param {string} path
     * @param {string} compare
     * @returns {array}
     */
	comparePaths: function comparePaths(path, compare) {
		if(path === compare) return true;
		var pathArr = path.split(p.sep),
			compare = compare.split(p.sep);
		return _.difference(pathArr, compareArr);
	},

	/**
	 * Converts an object of package.json dependencies to array of "dependency@version"
	 * @param {object} obj - the dependencies object.
	 * @returns {array}
	 */
	dependenciesToArray: function dependenciesToArray(obj) {
		return _.map(obj, function(v, k) {
			return k + '@' + v;
		});
	},

	/**
	 * Merges compare dependencies into primary dependencies if version is greater.
	 * Returns an object containing the result dependencies and
	 * whether or not there have been any package versions updated.
	 * @param {object} primary - the primary dependencies object.
	 * @param {object} compare - the dependencies object to compare/check for greater version from.
	 * @returns {object}
	 */
	mergeDependencies: function mergeDependencies(primary, compare) {
		var merged = false,
			pVer, cVer;
		_.forEach(primary, function (v,k) {
			pVer = v;
			cVer = compare[k] || undefined;
			if(cVer){
				var diff = helpers.compareVersions(pVer, cVer);
				// only update if compare version is
				// greater than the primary.
				if(diff > 0)
					merged = true;
					primary[k] = cVer;
			}
		});
		return { dependencies: primary, merged: merged };
	},

    /**
     * Deletes properties in object by key name.
     * @param {object} obj - the object to parse.
     * @param {string|array} keys - a comma separated string or array of keys.
     * @returns {object}
     */
    deleteKeys: function deleteKeys(obj, keys) {
        var result;
        // clone the original obj;
        result = _.clone(obj);
        if (arguments.length !== 2)
            throw new Error('Please provide an object and keys to delete.');
        if (typeof result === 'undefined' || _.isEmpty(obj))
            throw new Error('Unable to delete keys object is not valid or empty.');
        if (!_.isArray(keys) && !_.isString(keys))
            throw new Error('Keys must be an array, string or comma separated string.');
        // convert string to array.
        if (_.isString(keys))
            keys = keys.split(',');
        keys.forEach(function (k) {
            for (var prop in result) {
                if (result.hasOwnProperty(prop)) {
                    if (k === prop) {
                        delete result[prop];
                    } else {
                        if (_.isObject(result[prop]) && !_.isArray(result[prop])) {
                            result[prop] = helpers.deleteKeys(result[prop], keys);
                        }
                    }
                }
            }
        });
        return result;
    },

    /**
     * Normalize an object recursively converting
     * string values of undefined, null, true, false
     * etc to valid types.
     * @param {object} obj - the object to recurse.
     * @param {object [map] - optional map to compare.
     */
    stringToType: function stringToType(obj, map) {
        var keys;
        map = map || {
            false: false,
            null: null,
            undefined: undefined,
            true: true
        };
        keys = Object.keys(map);
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop)){
                var val = obj[prop];
                // if is object recurse.
                if(_.isObject(val)){
                    helpers.stringToType(val);
                } else {
                    // if false, true, undefined, null convert.
                    if(_.contains(keys, val))
                        obj[prop] = map[val];
                    // if map contains prop convert to specified type.
                    if(_.contains(keys, prop) && _.isFunction(map[prop])){
                        obj[prop] = map[prop](val);
                    }
                }
            }
        }
        return obj;
    }
};

module.exports = helpers;