#Change Log

###June 21, 2014
- Removed support for MySQL directly in favor of succint solution using [Sequelize](http://sequelizejs.com/)
- Add connect-session-sequelize for supporting sessions.
- Removed regexp from inject.js which was improperly filtering certain routes, need to revisit. Caused errors not to be handled correctly.
- Change Gulp logging to only report "Finished" tasks only showing start also was merely taking up console space with little benefit.
- Remove connect-mongo, connect-redis, connect-mysql and connect-sequelize. Must be installed by user in project.