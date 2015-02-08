'use strict';

function ErrorHandler(err, req, res, next) {

    if(req.HTML){
        res.render('shared/error', { err: err });
    } else {
        res.status(err.status || 500)[req.JSON_TYPE]({err: err});
    }

}

module.exports = ErrorHandler;