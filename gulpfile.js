var gulp = require('gulp'),
  tsc = require('gulp-typescript'),
  sourcemaps = require('gulp-sourcemaps'),
  tsProject = tsc.createProject('tsconfig.json');

/**
 * Compile TypeScript 
 */
gulp.task('typescript', function () {
  var sourceTsFiles = ['./**.ts',                //path to typescript files
    '_references.d.ts']; //reference to library .d.ts files


  var tsResult = gulp.src(sourceTsFiles)
    .pipe(sourcemaps.init())
    .pipe(tsc(tsProject));

  tsResult.dts.pipe(gulp.dest('./'));
  return tsResult.js
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist'));
});


gulp.task('static', function () {
  gulp.src('package.json')
    .pipe(gulp.dest('./dist'));
  gulp.src('bluetooth.d.ts')
    .pipe(gulp.dest('./dist'));
  gulp.src('base64.js')
    .pipe(gulp.dest('./dist'));
  gulp.src('bluetooth.android.ts')
    .pipe(gulp.dest('./dist'));
  gulp.src('bluetooth.ios.ts')
    .pipe(gulp.dest('./dist'));
  gulp.src('bluetooth-common.ts')
    .pipe(gulp.dest('./dist'));
});


gulp.task('default', [
  'typescript',
  'static'
]);
