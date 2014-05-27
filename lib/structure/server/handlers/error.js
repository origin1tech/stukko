'use strict';

module.exports = ErrorHandler;

function ErrorHandler(err, req, res, next) {

	if(req.HTML)  {
		res.render('shared/error', { err: err });
	} else {
		if(req.JSONP)
			res.jsonp(err.status || 500, { err: err });
		else
			res.json(err.status || 500, { err: err });
	}

}