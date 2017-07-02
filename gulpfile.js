const gulp = require('gulp');
const babelify = require('babelify');
const browserify = require('browserify');
const vinylSource = require('vinyl-source-stream');
const es = require('event-stream');
const flatten = require('gulp-flatten');
const glob = require('glob');

gulp.task('copyStaticFiles', () => gulp.src([
  './src/**/*.*',
  '!./src/js/*.js',
])
  .pipe(gulp.dest('./dist')));

gulp.task('build', (done) => {
  glob('./src/js/*.js', (err, files) => {
    if (err) done(err);
    const tasks = files.map(entry => browserify({
      entries: [entry],
    })
      .transform(babelify)
      .bundle()
      .pipe(vinylSource(entry))
      .pipe(flatten())
      .pipe(gulp.dest('./dist/js')));
    es.merge(tasks).on('end', done);
  });
});

gulp.task('default', () => {
  gulp.watch('./src/js/**/*.js', ['build']);
  gulp.watch(['./src/**/*.*', '!./src/js/*.js'], ['copyStaticFiles']);
});
