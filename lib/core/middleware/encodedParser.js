'use strict';
var bodyParser = require('body-parser');
function encodedParser() {
	return bodyParser.urlencoded({extended: true });
}
module.exports = encodedParser;