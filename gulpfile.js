var gulp = require('gulp'),
    bump = require('gulp-bump'),
    git = require('gulp-git'),
    spawn = require('child_process').spawn,
    argv = process.argv.splice(3),
    args = [];
    
// ensure quotes around strings
// with spaces.
argv.forEach(function(arg, idx) {
    if(arg.indexOf(' ') !== -1)
        arg = '"' + arg + '"';
    args.push(arg);
});

// bump package version.
gulp.task('bump', function(){
    gulp.src('./package.json')
        .pipe(bump())
        .pipe(gulp.dest('./'));
});

// commit local.
gulp.task('commit:local', ['bump'], function () {

    if(!args || !args.length)
        args = '-a -m "lazy commit"';
    else
        args = args.join(' ');

    return gulp.src('./*')
        .pipe(git.commit(undefined, {
            args: args,
            disableMessageRequirement: true
        }));

});

// push to repo.
gulp.task('push', function(cb) {
    git.push('origin', 'master', {}, function(err) {
        if(err) throw err;
        cb();
    });
});

// publish to npm.
gulp.task('pub', function (cb) {
    spawn('npm', ['publish'], { stdio: 'inherit' }).on('close', function() {
        cb();
    });
});

// commit and push.
gulp.task('commit', ['commit:local', 'push']);

// commit and publish project.
gulp.task('commit:pub', ['commit:local', 'push', 'pub']);


