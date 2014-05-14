'use strict';


module.exports = Inherit;

var create = Object.create;

// shim.
if (typeof(create) != 'function') {
	create = function(obj) {
		function F() {}
		F.prototype = obj;
		return new F();
	};
}

/**
 * Class inheritance.
 * @param SubClass
 * @param SuperClass
 * @constructor
 */
function Inherit(SubClass, SuperClass) {
	var superCopy = create(SuperClass.prototype);
	superCopy.constructor = SubClass;
	SubClass.prototype = superCopy;
}