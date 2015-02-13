'use strict';
var fs = require('fs-extra'),
	p = require('path'),
	io;

io = {

	exists: function exists(path, cb){
		if(cb) {
			fs.exists(path, cb);
		} else {
			return fs.existsSync(path);
		}
	},

	resolve: function resolve(path) {
		return p.resolve(path);
	},

	read: function read(path, options, cb) {
		if(!path || !this.exists(path))
			throw new Error ('The requested path could not be found.');
		if(_.isFunction(options)){
			cb = options;
			options = undefined;
		}
		options = options || 'utf8';
		if(cb) {
			fs.readFile(path, options, cb);
		} else {
			return fs.readFileSync(path, options);
		}
	},

	write: function write (path, data, options, cb){
		if(_.isFunction(options)){
			cb = options;
			options = undefined;
		}
		options = options || 'utf8';
		if(cb) {
			fs.writeFile(path, data, options, cb);
		} else {
			fs.writeFileSync(path, data, options);
			return true;
		}
	},

	copy: function copy(path, dest, filter, cb) {
		if(_.isFunction(filter)){
			cb = filter;
			filter = undefined;
		}
		if(cb){
			fs.copy(path, dest, filter, cb);
		} else {
			fs.writeFileSync(dest, fs.readFileSync(path));
		}
	},

	mkdir: function mkdir(path, mode, cb) {
		if(_.isFunction(mode)){
			cb = mode;
			mode = undefined;
		}
		mode = mode || '0777';
		if(cb) {
			fs.mkdirs(path, mode, cb);
		} else {
			fs.mkdirsSync(path, mode);
			return true;
		}
	},

	rename: function rename(path, dest, cb){
		if(cb) {
			fs.rename(path, dest, cb);
		} else {
			fs.rename(path, dest);
			return true;
		}
	},

	require: function require(obj, options) {
		var result = {};
		options = options || {};
		if(_.isString(obj)){
			options.dirname = obj;
			return reqeach(options);
		}
		_.forEach(obj, function(v, k){
			if(_.isString(v)){
				v = dir + v;
				options.dirname = v;
				result[k] = reqeach(options);
			}
		});
		return result;
	},

	remove: function remove(path, cb) {
		if(cb) {
			fs.remove(path, function(err) {
				if(err) cb(err);
				else cb(null, true);
			});
		} else {
			fs.removeSync(path);
			return true;
		}
	},

	removeFiles: function removeFiles(dirPath) {
		try { var files = fs.readdirSync(dirPath); }
		catch(e) { return; }
		if (files.length > 0)
			for (var i = 0; i < files.length; i++) {
				var filePath = dirPath + '/' + files[i];
				if (fs.statSync(filePath).isFile())
					fs.unlinkSync(filePath);
				else
					io.removeFiles(filePath);
			}
		try{ fs.rmdirSync(dirPath);	}
		catch(e) { return e;}
	},

    stat: function stat(path, cb) {
        if(cb){
            fs.stat(path, cb);
        } else {
            return fs.statSync(path);
        }

    }
};

module.exports = io;