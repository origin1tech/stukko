'use strict';

module.exports = ErrorHandler;

function ErrorHandler(err, req, res, next) {

	if(req.HTML){
		res.render('shared/error', { err: err });
	} else {
		if(req.JSONP)
			res.status(500).jsonp({ err: err });
		else
			res.status(err.status || 500).json({ err: err });
	}	

}