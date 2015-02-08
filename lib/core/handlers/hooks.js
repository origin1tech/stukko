'use strict';

/**
 * Handles middleware lifecycle hooks.
 * @returns handlers 
 */
function Hooks() {
    
    var self = this,
        hooksConf = this.options.hooks,
        usrHandlers,
        middlewareHook,
        actionsHook,
        filtersHook,
        timeout;
    
    usrHandlers = self.modules.handlers;
    middlewareHook = usrHandlers[hooksConf.beforeMiddleware];
    filtersHook = usrHandlers[hooksConf.beforeFilters];
    actionsHook = usrHandlers[hooksConf.beforeActions];
    timeout = hooksConf.timeout;
    

    /**
     * Handles timeout when user defined hook fails. 
     * @param name
     * @param res
     * @param next
     * @private 
     */
    function hookTimeout(name, res, next) {
        res.setTimeout(hooksConf.timeout, function () {
            $$LOG.warn('Hook ' + name + ' timeout warning, ensure hook exists.');
            next();
        });
    }
    
    function hookable(url) {
        // check if hooks should be
        // process on all requests.
        if(hooksConf.routesOnly === false) 
            return true;
        $$DEBUG('Checking if path ' + url + ' is hookable.');
        var match = url.match(/\.([0-9a-z]+)(?:[\?#]|$)/i)
        if(!match)
            return true;
        return /\.(json|jsonp)$/.test(match[0]);
    }
    
    var handlers = {

        /**
         * Hook for handling requests before middleware is processed. 
         * @param req
         * @param res
         * @param next
         */
        beforeMiddleware: function beforeMiddleware(req, res, next) {
            if(!hookable(req.url))
                return next();
            $$DEBUG('Handling hook beforeMiddleware');
            if(!middlewareHook){
                next();                
            } else {
                middlewareHook.apply(self, arguments);
                hookTimeout('beforeMiddleware', res, next);
            }         
        },

        /**
         * Hook for handling requests before policy filters are applied.
         * @param req
         * @param res
         * @param next
         */
        beforeFilters: function beforeFilters(req, res, next) {
            if(!hookable(req.url))
                return next();
            $$DEBUG('Handling hook beforeFilters');
            if(!filtersHook){
                next();
            } else {
                filtersHook.apply(self, arguments);
                hookTimeout('beforeFilters', res, next);
            }
        },

        /**
         * Hook for handling requests prior to controller action calls. 
         * @param req
         * @param res
         * @param next
         */
        beforeActions: function beforeActions(req, res, next) {
            if(!hookable(req.url))
                return next();
            $$DEBUG('Handling hook beforeActions');
            if(!actionsHook){
                next();
            } else {
                actionsHook.apply(self, arguments);
                hookTimeout('beforeActions', res, next);
            }
        }       
        
        
    };
    
    return handlers;
}

module.exports = Hooks;

