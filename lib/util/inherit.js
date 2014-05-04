'use strict';

module.exports = Inherit;

var create = Object.create;

if (!_.isFunction(create)) {
	create = function(obj) {
		function F() {}

		F.prototype = obj;
		return new F();
	};
}

function Inherit(SubClass, SuperClass) {
	var superCopy = create(SuperClass.prototype);
	superCopy.constructor = SubClass;

	SubClass.prototype = superCopy;
}