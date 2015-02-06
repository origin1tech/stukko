'use strict';

function ErrorHandler(err, req, res, next) {

    if(req.HTML){
        res.render('common/shared/error', err);
    } else {
        res.status(err.status || 500)[req.JSON_TYPE](err);
    }

}

module.exports = ErrorHandler;