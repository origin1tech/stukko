'use strict';
var bodyParser = require('body-parser');
function jsonParser() {
	return bodyParser.json();
}
module.exports = jsonParser;