const path = require('path');
const gulp = require('gulp');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const browserify = require('browserify');
const watchify = require('watchify');
const envify = require('envify/custom');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const eslint = require('gulp-eslint');
const browserSync = require('browser-sync');

const OUTPUT_DIR = 'output';
const APP_NAME = 'mediasoup-client-test';

// Node environment.
process.env.NODE_ENV = 'development';

function logError(error)
{
	gutil.log(gutil.colors.red(error.stack));
}

gulp.task('lint', () =>
{
	const src =
	[
		'gulpfile.js',
		'**/*.js',
		'**/*.jsx'
	];

	return gulp.src(src)
		.pipe(plumber())
		.pipe(eslint())
		.pipe(eslint.format());
});

gulp.task('html', () =>
{
	return gulp.src('index.html')
		.pipe(gulp.dest(OUTPUT_DIR));
});

gulp.task('bundle', () =>
{
	const watch = true;

	let bundler = browserify(
		{
			entries      : 'index.jsx',
			extensions   : [ '.js', '.jsx' ],
			// required for sourcemaps (must be false otherwise).
			debug        : process.env.NODE_ENV === 'development',
			// required for watchify.
			cache        : {},
			// required for watchify.
			packageCache : {},
			// required to be true only for watchify.
			fullPaths    : watch
		})
		.transform('babelify',
			{
				presets : [ 'es2015', 'es2017', 'react' ],
				plugins :
				[
					'transform-runtime',
					'transform-object-assign',
					'transform-object-rest-spread'
				]
			})
		.transform(envify(
			{
				NODE_ENV : process.env.NODE_ENV,
				_        : 'purge'
			}));

	if (watch)
	{
		bundler = watchify(bundler);

		bundler.on('update', () =>
		{
			const start = Date.now();

			gutil.log('bundling...');
			rebundle();
			gutil.log('bundle took %sms', (Date.now() - start));
		});
	}

	function rebundle()
	{
		return bundler.bundle()
			.on('error', logError)
			.pipe(plumber())
			.pipe(source(`${APP_NAME}.js`))
			.pipe(buffer())
			.pipe(rename(`${APP_NAME}.js`))
			.pipe(gulp.dest(OUTPUT_DIR));
	}

	return rebundle();
});

gulp.task('livebrowser', (done) =>
{
	browserSync(
		{
			server :
			{
				baseDir : OUTPUT_DIR
			},
			ghostMode : false,
			files     : path.join(OUTPUT_DIR, '**', '*')
		});

	done();
});

gulp.task('watch', (done) =>
{
	// Watch changes in HTML.
	gulp.watch([ 'index.html' ], gulp.series(
		'html'
	));

	// Watch changes in JS files.
	gulp.watch([ 'gulpfile.js', '**/*.js', '**/*.jsx' ], gulp.series(
		'lint'
	));

	done();
});

gulp.task('live', gulp.series(
	'lint',
	'html',
	'bundle',
	'watch',
	'livebrowser'
));

gulp.task('default', gulp.series('live'));
