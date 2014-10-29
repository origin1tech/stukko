'use strict';


/**
 * Extension to enable multiple view
 * locations for express by looking
 * up path defined in array.
 * @param app
 */
function MultiView(app){

	var proxy = app.get('view').prototype.lookup;
	app.get('view').prototype.lookup = function lookup(view){
		var ctx, match;
		if (this.root instanceof Array) {
			for (var i = 0; i < this.root.length; i++) {
				ctx = { root: this.root[i] };
				match = proxy.call(ctx, view);
				if (match)
					return match;
			}
			return null;
		}
		return proxy.call(this, view);
	};

}

module.exports = MultiView;