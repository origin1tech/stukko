var dash = angular.module('app.controllers.dash', []);
dash.controller('DashCtrl', function ($scope, $http) {

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
		var memory = {},
			memoryFormat = {};
			
			memory.used = diag.os['used memory'];
			memory.total = diag.os['total memory'];
			memory.free = diag.os['free memory'];
			memory.available =  ((memory.total - memory.free) / memory.total) * 100			
			$scope.memory = memory;	
			
			memoryFormat.used = formatBytes(diag.os['used memory'], true);
			memoryFormat.total = formatBytes(diag.os['total memory'], true);
			memoryFormat.free = formatBytes(diag.os['free memory'], true);
			memoryFormat.available =  ((memory.total - memory.free) / memory.total) * 100 + '%';		
			$scope.memoryFormat = memoryFormat;
	}

	$http.get('/manage/dashboard').then(function(res) {
		$scope.pkg = window._pkg;
		$scope.config = window._config;
		$scope.diag = window._diag;
		calculate(window._diag);
	});
	
	$scope.refresh = function() {
		$http.get('/manage/dashboard/refresh').then(function(res) {
			calculate(res.data);
		});
	};
	
});