/**
 * Tasks:
 *
 * gulp dist
 *   Generates the browser app in development mode (unless NODE_ENV is set
 *   to 'production').
 *
 * gulp live
 *   Generates the browser app in development mode (unless NODE_ENV is set
 *   to 'production'), opens it and watches for changes in the source code.
 *
 * gulp
 *   Alias for `gulp live`.
 */

const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const header = require('gulp-header');
const touch = require('gulp-touch-cmd');
const browserify = require('browserify');
const watchify = require('watchify');
const envify = require('envify/custom');
const uglify = require('gulp-uglify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const del = require('del');
const mkdirp = require('mkdirp');
const ncp = require('ncp');
const eslint = require('gulp-eslint');
const stylus = require('gulp-stylus');
const cssBase64 = require('gulp-css-base64');
const nib = require('nib');
const browserSync = require('browser-sync');

const PKG = require('./package.json');
const BANNER = fs.readFileSync('banner.txt').toString();
const BANNER_OPTIONS =
{
	pkg         : PKG,
	currentYear : (new Date()).getFullYear()
};
const OUTPUT_DIR = '../server/public';

// Set Node 'development' environment (unless externally set).
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

gutil.log(`NODE_ENV: ${process.env.NODE_ENV}`);

function logError(error)
{
	gutil.log(gutil.colors.red(error.stack));
}

function bundle(options)
{
	options = options || {};

	const watch = Boolean(options.watch);

	let bundler = browserify(
		{
			entries      : PKG.main,
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
				presets : [ 'es2015', 'react' ],
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
			.pipe(source(`${PKG.name}.js`))
			.pipe(buffer())
			.pipe(rename(`${PKG.name}.js`))
			.pipe(gulpif(process.env.NODE_ENV === 'production',
				uglify()
			))
			.pipe(header(BANNER, BANNER_OPTIONS))
			.pipe(gulp.dest(OUTPUT_DIR));
	}

	return rebundle();
}

gulp.task('clean', () => del(OUTPUT_DIR, { force: true }));

gulp.task('lint', () =>
{
	const src =
	[
		'gulpfile.js',
		'lib/**/*.js',
		'lib/**/*.jsx'
	];

	return gulp.src(src)
		.pipe(plumber())
		.pipe(eslint())
		.pipe(eslint.format());
});

gulp.task('css', () =>
{
	return gulp.src('stylus/index.styl')
		.pipe(plumber())
		.pipe(stylus(
			{
				use      : nib(),
				compress : process.env.NODE_ENV === 'production'
			}))
		.on('error', logError)
		.pipe(cssBase64(
			{
				baseDir           : '.',
				maxWeightResource : 50000 // So big ttf fonts are not included, nice.
			}))
		.pipe(rename(`${PKG.name}.css`))
		.pipe(gulp.dest(OUTPUT_DIR))
		.pipe(touch());
});

gulp.task('html', () =>
{
	return gulp.src('index.html')
		.pipe(gulp.dest(OUTPUT_DIR));
});

gulp.task('resources', (done) =>
{
	const dst = path.join(OUTPUT_DIR, 'resources');

	mkdirp.sync(dst);
	ncp('resources', dst, { stopOnErr: true }, (error) =>
	{
		if (error && error[0].code !== 'ENOENT')
			throw new Error(`resources copy failed: ${error}`);

		done();
	});
});

gulp.task('bundle', () =>
{
	return bundle({ watch: false });
});

gulp.task('bundle:watch', () =>
{
	return bundle({ watch: true });
});

gulp.task('livebrowser', (done) =>
{
	const config = require('../server/config');

	browserSync(
		{
			open   : 'external',
			host   : config.domain,
			server :
			{
				baseDir : OUTPUT_DIR
			},
			https     : config.tls,
			ghostMode : false,
			files     : path.join(OUTPUT_DIR, '**', '*')
		});

	done();
});

gulp.task('browser', (done) =>
{
	const config = require('../server/config');

	browserSync(
		{
			open   : 'external',
			host   : config.domain,
			server :
			{
				baseDir : OUTPUT_DIR
			},
			https     : config.tls,
			ghostMode : false
		});

	done();
});

gulp.task('watch', (done) =>
{
	// Watch changes in HTML.
	gulp.watch([ 'index.html' ], gulp.series(
		'html'
	));

	// Watch changes in Stylus files.
	gulp.watch([ 'stylus/**/*.styl' ], gulp.series(
		'css'
	));

	// Watch changes in resources.
	gulp.watch([ 'resources/**/*' ], gulp.series(
		'resources', 'css'
	));

	// Watch changes in JS files.
	gulp.watch([ 'gulpfile.js', 'lib/**/*.js', 'lib/**/*.jsx' ], gulp.series(
		'lint'
	));

	done();
});

gulp.task('dist', gulp.series(
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources'
));

gulp.task('live', gulp.series(
	'clean',
	'lint',
	'bundle:watch',
	'html',
	'css',
	'resources',
	'watch',
	'livebrowser'
));

gulp.task('open', gulp.series('browser'));

gulp.task('default', gulp.series('live'));
