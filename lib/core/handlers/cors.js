'use strict';

module.exports = Cors;

function Cors() {

	var self = this;

	return {

		whitelisted: function (origin, cb) {
			if(!self.origins)
				cb(null, true);
			else
				cb(null, self.origins.indexOf(origin) !== -1);
		}

	}

}