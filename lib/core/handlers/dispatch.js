'use strict';

module.exports = Dispatch;

/**
 * Helper that determines the correct
 * the correct response based on request.
 * @param req
 * @param res
 * @returns {dispatch}
 */
function Dispatch(req, res, next) {

	var self = this;

    /**
     * Dispatches response for HTML View or JSON dynamically
     * 
     * View Examples
     * res.dispatch(200, 'view/path', { some: data }, callback_function)
     * res.dispatch('view/path', { some: data })
     * res.dispatch('view/path')
     * 
     * JSON Examples
     * res.dispatch(200, { some: data })
     * res.dispatch({ some: data }) 
     *  
     * @param [status] - the HTTP status (default: 200)
     * @param view - the HTML view to render or locals/object to render as JSON.
     * @param [locals] - the locals for rending HTML view.
     * @param [cb] - a callback when upon rendering view.
     * @private
     */
	function dispatch(status, view, locals, cb) {
		if(req.HTML){
			// if not a number status is omitted.
			if(!_.isNumber(status)){
				cb = locals || undefined;
				locals = view || {};
				view = status || self.options.express.layout;
				status = 200;
			}
			// render response with view, locals and callback.
			res.status(status).render(view, locals, cb);
		} else {
			// if not a number status is omitted.
			if(!_.isNumber(status)) {
				locals = status;
				status = 200;
			} else {
				locals = view;
			}
            res.status(status)[req.JSON_TYPE](locals);
		}
	};
    
    return dispatch;
}