var utils = angular.module('app.factories.utils', []);

utils.factory('UtilsFact', function ($location) {

	var factory = {};

	factory.location = $location;
	factory.relativeUrl = $location.path();
	factory.pkg = window._pkg;
	factory.config = window._config;
	factory.diag = window._diag;

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