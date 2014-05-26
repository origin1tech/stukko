'use strict';

var  _ = require('lodash'),
	Chance = require('chance');

module.exports = {

	stringToCase: function stringToCase(str, casing) {

		casing = casing || 'first';
		if(casing == 'title')
			return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
		if(casing == 'first')
			return str.charAt(0).toUpperCase() + str.slice(1);
		if (casing == 'camel') {
			return str.toLowerCase().replace(/-(.)/g, function (match, group1) {
				return group1.toUpperCase();
			});
		}
		if (casing == 'pascal')
			return str.replace(/\w+/g, function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); });

		return str;

	},

	tryParseJson: function tryParseJson(obj, def) {
		def = def || undefined;
		try{
			obj = JSON.parse(obj);
			return obj;
		} catch(ex) {
			return def;
		}
	},

	join: function join(str, value, prepend) {
		if(prepend)
			return value + str;
		return str + value;
	},

	prefixPath: function prefixPath(path, root) {

		var self = this;

		if(!root) return path;

		function recursePaths(obj) {
			_.forEach(obj, function (v, k){
				if(_.isObject(v))
					recusePaths(v);
				else
					obj[k] = self.join(v, root, true);
			});
			return obj;
		}

		if(_.isString(path)){
			if(/%cwd%/.test(path))
				path = path.replace('%cwd%', root);
			else
				path = this.join(path, root, true);
		}

		if(_.isObject(path))
			path = recursePaths(path);


		return path;

	},

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

	compareVersions: function compareVersions(v1, v2, options) {

		var lexicographical = options && options.lexicographical,
			zeroExtend = options && options.zeroExtend,
			v1parts = v1.split('.'),
			v2parts = v2.split('.');

		function isValidPart(x) {
			return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
		}

		if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
			return NaN;
		}

		if (zeroExtend) {
			while (v1parts.length < v2parts.length) v1parts.push("0");
			while (v2parts.length < v1parts.length) v2parts.push("0");
		}

		if (!lexicographical) {
			v1parts = v1parts.map(Number);
			v2parts = v2parts.map(Number);
		}

		for (var i = 0; i < v1parts.length; ++i) {
			if (v2parts.length == i) {
				return 1;
			}
			if (v1parts[i] == v2parts[i]) {

			}
			else if (v1parts[i] > v2parts[i]) {
				return 1;
			}
			else {
				return -1;
			}
		}

		if (v1parts.length != v2parts.length) {
			return -1;
		}

		return 0;
	},

	sameOrigin: function sameOrigin(req) {
		var domain = req.headers.origin.match(/^https?:\/\/([^:]+)(:\d+)?$/)[1];
		return (req.host == domain);
	},

	chance: function chance(method, options) {
		var c = new Chance();
		if(!method) return undefined;
		return c[method](options);
	},

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

	canRequire: function canRequire(module) {
		try{
			require.resolve(module);
			return true;
		}catch(e){
			return false;
		}
	},

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

	}

};