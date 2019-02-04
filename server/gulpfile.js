/**
 * Tasks:
 *
 * gulp lint
 *   Checks source code
 *
 * gulp watch
 *   Observes changes in the code
 *
 * gulp
 *   Invokes both `lint` and `watch` tasks
 */

const gulp = require('gulp');
const plumber = require('gulp-plumber');
const eslint = require('gulp-eslint');

const LINTING_FILES =
[
	'gulpfile.js',
	'server.js',
	'config/config.example.js',
	'lib/**/*.js'
];

gulp.task('lint', () =>
{

	return gulp.src(LINTING_FILES)
		.pipe(plumber())
		.pipe(eslint())
		.pipe(eslint.format());
});

gulp.task('lint-fix', function() 
{
	return gulp.src(LINTING_FILES)
		.pipe(plumber())
		.pipe(eslint({ fix: true }))
		.pipe(eslint.format())
		.pipe(gulp.dest((file) => file.base));
});

gulp.task('default', gulp.series('lint'));
