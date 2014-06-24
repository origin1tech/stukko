'use strict';
var _ = require('lodash');
module.exports = Dispatch;
function Dispatch(req, res) {
	var self = this;
	return function dispatch(status, view, data, cb) {
		if(req.HTML){
			// if not a number status is omitted.
			if(!_.isNumber(status)){
				cb = data || undefined;
				data = view || {};
				view = status || self.options.express.layout;
				status = 200;
			}
			// render response with view, locals and callback.
			res.status(status).render(view, data, cb);
		} else {
			// if not a number status is omitted.
			if(!_.isNumber(status)) {
				data = status;
				status = 200;
			} else {
				data = view;
			}
			if(req.JSONP)
				res.status(status).jsonp(data);
			 else
				res.status(status).json(data);
		}
	};
}