var fs = require('fs'),
    gulp = require('gulp'),
    clean = require('gulp-clean'),s
    concat = require('gulp-concat'),
    htmlmin = require('gulp-htmlmin'),
    gulpSequence = require('gulp-sequence'),
    stringReplace = require('gulp-string-replace'),
    uglify = require('gulp-uglify'),
    util = require("gulp-util"),
    watch = require('gulp-watch'),
    ts = require("gulp-typescript"),
    tsProject = ts.createProject("tsconfig.json");


gulp.task('default', ['build']);

gulp.task('watch', function () {
    return watch('src/**/*.*', function () {
        gulp.start('devbuild');
    });
});


gulp.task('compile', function () {
    var template = fs.readFileSync('build/template/template.html', 'utf-8', function (err, data) {
        return data.toString()
    });
    return tsProject.src()
        .pipe(tsProject())
        .js
        .pipe(
            stringReplace(
                'REPLACE_WITH_TEMPLATE_HTML',
                template
            )
        )
        .pipe(gulp.dest(""));
});

gulp.task('html', function () {
    return gulp.src('src/*.html')
        .pipe(htmlmin({collapseWhitespace: true}))
        .pipe(gulp.dest('build/template'));
});

gulp.task('minify', function () {

    return gulp.src('build/js/kyc.sdk.js')
        .pipe(uglify())
        .on('error', function (err) {
            util.log(util.colors.red('[Error]'), err.toString());
        })

        .pipe(concat('kyc.sdk.min.js'))
        .pipe(gulp.dest('build/js'));
});

gulp.task('dist', function () {
    return gulp.src('build/js/*.js')
        .pipe(gulp.dest('./dist'))
        ;
});
gulp.task('cleanup', function () {
    return gulp.src('build')
        .pipe(clean({read:false,force: true}))

});
gulp.task('devbuild', function (c) {
    gulpSequence(
        'html',
        'compile',
        'minify',
        'dist',
    )(c);
});
gulp.task('build', function (c) {
    gulpSequence(
        'devbuild',
        'cleanup',
    )(c);
});



