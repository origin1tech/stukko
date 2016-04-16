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
        modelsHook,
        timeout;

    usrHandlers = self.modules.handlers;
    middlewareHook = usrHandlers[hooksConf.beforeMiddleware];
    filtersHook = usrHandlers[hooksConf.beforeFilters];
    actionsHook = usrHandlers[hooksConf.beforeActions];
    modelsHook = usrHandlers[hooksConf.afterModels];
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

    function hookable(req) {
        var url = req.url;
        var hasQuery = Object.keys(req.query || {}).length;
        // check if hooks should be
        // process on all requests.
        // or if has query string it is
        // not a static asset.
        if(hooksConf.routesOnly === false || hasQuery)
            return true;

        $$DEBUG('Checking if path ' + url + ' is hookable.');
        var match = url.match(/\.([0-9a-z]+)(?:[\?#]|$)/i)
        if(!match)
            return true;
        return /\.(json|jsonp)$/.test(match[0]);
    }

    var handlers = {

        /////////////////////////
        // middleware hooks
        /////////////////////////

        /**
         * Hook for handling requests before middleware is processed.
         * @param req
         * @param res
         * @param next
         */
        beforeMiddleware: function beforeMiddleware(req, res, next) {
            if(!hookable(req))
                return next();
            $$DEBUG('Handling hook beforeMiddleware');
            if(!_.isFunction(middlewareHook)){
                next();
            } else {
                middlewareHook.apply(self, arguments);
                //hookTimeout('beforeMiddleware', res, next);
            }
        },

        /**
         * Hook for handling requests before policy filters are applied.
         * @param req
         * @param res
         * @param next
         */
        beforeFilters: function beforeFilters(req, res, next) {
            if(!hookable(req))
                return next();
            $$DEBUG('Handling hook beforeFilters');
            if(!_.isFunction(filtersHook)){
                next();
            } else {
                filtersHook.apply(self, arguments);
                //hookTimeout('beforeFilters', res, next);
            }
        },

        /**
         * Hook for handling requests prior to controller action calls.
         * @param req
         * @param res
         * @param next
         */
        beforeActions: function beforeActions(req, res, next) {

            if(!hookable(req))
                return next();
            $$DEBUG('Handling hook beforeActions');
            if(!_.isFunction(actionsHook)){
                next();
            } else {
                actionsHook.apply(self, arguments);
                //hookTimeout('beforeActions', res, next);
            }
        },

        /////////////////////////
        // db hooks
        /////////////////////////

        afterModels: function afterModels(db){
            if(!_.isFunction(modelsHook))
                return;
            modelsHook.apply(self, arguments);
        }

    };

    return handlers;
}

module.exports = Hooks;
