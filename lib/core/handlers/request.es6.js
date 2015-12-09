'use strict';

var http = require('http'),
    req = http.IncomingMessage.prototype,
    utils = require('../../utils');

function request() {

    /**
     * Normalizes params, converts to JSON when present.
     *
     * @private
     * @param obj
     * @returns {Object}
     */
    function normalizeParams(obj){
        for(var p in o){
            if(o.hasOwnProperty(p)){
                var val = o[p];
                if(_.isArray(val)){
                    var tmpArr = [];
                    for(var i = 0; i < val.length; i++){
                        if(_.isString(val[i])){
                            tmpArr.push(utils.helpers.tryParseJson(val[i]))
                        } else {
                            tmpArr.push(normalizeParams(val[i]))
                        }
                    }
                    o[p] = tmpArr;
                }
                else if(_.isPlainObject(val)) {
                    normalizeParams(val);
                } else {
                    if(_.isString(val) && /{/g.test(val)){
                        o[p] = utils.helpers.tryParseJson(val);
                    }
                }
            }
        }
        return o;
    }

    req._params = function _params(){
        let tmp = req.query || {};
        tmp = normalizeParams(tmp);
    };

    req.isHTML = ()=>{
        return (req.get('accept') || '').indexOf('html') !== -1;
    }

    req.isJSON = ()=>{
        return req.is('json') || req.is('application/json') || /application\/json/.test(req.get('accept'))
            || /application\/json/.test(req.get('content-type'));
    }

    req.isJSONP = (callback_name)=>{
        let regexp = new RegExp(callback_name + '=');
        return regexp.test(req.url);
    }

    req.isAJAX = ()=>{
        return req.xhr || req.isJSON() || req.isJSONP();
    }

    req.JSON_TYPE = (callback_name)=>{
        return req.JSONP(callback_name) ? 'jsonp' : 'json';
    }

    // get request type.
    req.HTML = (req.get('accept') || '').indexOf('html') !== -1;
    
    // check if is JSON.
    req.JSON = req.is('json') || req.is('application/json') || /application\/json/.test(req.get('accept'))
        || /application\/json/.test(req.get('content-type'));
    
    // check if is JSONP
    req.JSONP = /callback=/.test(req.url);

}

module.exports = request;