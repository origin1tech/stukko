var utils = angular.module('app.factories.utils', []);

utils.factory('UtilsFact', function () {
	var factory = {};
	factory.find = function (query, element) {
		element = element || document;
		element = element.querySelector(query) || undefined;
		if(element)
			return angular.element(element);
		return undefined;
	};
	factory.findAll = function (query, element) {
		element = element || document;
		element = element.querySelectorAll(query);
		if(element)
			return angular.element(element);
		return undefined;
	};
	return factory;
});