'use strict';

var Stukko = require('stukko'),
	stukko;

/**
 * Create the Stukko instance.
 *
 * Stukko Constructor - accepts two params, an object of "options"
 * that can override your loaded config. Great for testing.
 * The second param "config" accepts a path to a specific config.
 * Useful to override the config of options to be applied for this instance.
 *
 */
stukko = new Stukko();

/**
 * Listen - accepts three params. The port, host and a callback.
 * The callback is optional. It is useful in that it returns the
 * instance and context so that you may access any of Stukko's objects or
 * properties.
 */
stukko.listen(function() {

	/* STUKKO VARIABLES
	 ********************************************************************/
	// The examples below are just a few that are available. Check the
	// README.md or visit http://github.com/origin1tech/stukko for
	// additional details.

	/* GLOBAL OBJECTS
	 ********************************************************************/

	// $LOG                                     ex: $LOG.info('my log message') also supports .warn, .error, .verbose
	// $DEBUG                                   ex: $DEBUG('my debug message) shorthand for $LOG.debug
	// $DB                                      ex: $DB.client same as require('my-db-module')
	//                                          ex: $DB.connection your database connection.
	//                                          ex: $DB.destroy() destroys the active database connection.
	// $SERVICES                                ex: exposes custom dev services defined in /server/services.
	// $SETTINGS								ex: $SETTINGS.pkg.name contains package.json & all config options.

	/* INSTANCE OBJECTS
	 *******************************************************************/

	// access express                           ex: this.express.
	// access the express server                ex: this.app.
	// access config options                    ex: this.options.port.
	// access the sessionStore                  ex: this.sessionStore.
	// access your db                           ex: this.db. (or by GLOBAL var DB)
	// access the db connection                 ex: this.db.connection (or by GLOBAL var DB.connection)
	// access the db client/driver              ex  this.db.client (this of it as require('mongoose'));
	// disconnect your db                       ex: this.db.destroy() (this will disconnect your db);
	// access all express server connections    ex: this.connections (returns an array).


});
