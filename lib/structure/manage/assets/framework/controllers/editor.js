var editor = angular.module('app.controllers.editor', []);

editor.controller('EditorCtrl', function ($scope, $http, UtilsFact) {

	var _utils = UtilsFact,
		editor, session;

	require("ace/ext/spellcheck");

	editor = ace.edit("editor", {});
	editor.setTheme("ace/theme/chrome");
	session = editor.getSession();
	session.setMode("ace/mode/json");

	$http.get('/manage/editor/show').then(function(res) {
		var data = JSON.stringify(res.data || {}, null, '\t');
		session.setValue(data);
	});


});