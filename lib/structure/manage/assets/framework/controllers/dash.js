var dash = angular.module('app.controllers.dash', []);
dash.controller('DashCtrl', function ($scope, $http, UtilsFact) {

	var _utils = UtilsFact,
		cpuChart,
		memChart;

	function formatBytes(bytes, append) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i;
		if (bytes == 0) {
			if(append) 
				return '0 bytes';
			return 0;
		}
		i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
		if(append)
			return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
		return Math.round(bytes / Math.pow(1024, i), 2);
	}
	
	function calculate(diag) {	
		var charts = {};
			charts._used = diag.os['used memory'];
			charts._total = diag.os['total memory'];
			charts._free = diag.os['free memory'];
			charts._available =  charts._total - charts._free;
			charts.used =  Math.round((charts._used / charts._total) * 100);
			$scope.charts = charts;
	}

	$scope.pkg = window._pkg;
	$scope.config = window._config;
	$scope.diag = window._diag;
	$scope.refresh = function() {
		$http.get('/manage/dashboard/refresh').then(function(res) {
			calculate(res.data);
		});
	};

	// calculate sizes/percentages.
	calculate(window._diag);

	// create memory chart


	
});