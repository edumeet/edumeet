'use strict';

/**
 * Tasks:
 *
 * gulp prod
 *   Generates the browser app in production mode.
 *
 * gulp dev
 *   Generates the browser app in development mode.
 *
 * gulp live
 *   Generates the browser app in development mode, opens it and watches
 *   for changes in the source code.
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
const touch = require('gulp-touch');
const rename = require('gulp-rename');
const header = require('gulp-header');
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

// Default environment.
process.env.NODE_ENV = 'development';

function logError(error)
{
	gutil.log(gutil.colors.red(String(error)));

	throw error;
}

function bundle(options)
{
	options = options || {};

	let watch = !!options.watch;
	let bundler = browserify(
		{
			entries      : path.join(__dirname, PKG.main),
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
				plugins : [ 'transform-runtime', 'transform-object-assign' ]
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
			let start = Date.now();

			gutil.log('bundling...');
			rebundle();
			gutil.log('bundle took %sms', (Date.now() - start));
		});
	}

	function rebundle()
	{
		return bundler.bundle()
			.on('error', logError)
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

gulp.task('env:dev', (done) =>
{
	gutil.log('setting "dev" environment');

	process.env.NODE_ENV = 'development';
	done();
});

gulp.task('env:prod', (done) =>
{
	gutil.log('setting "prod" environment');

	process.env.NODE_ENV = 'production';
	done();
});

gulp.task('lint', () =>
{
	let src = [ 'gulpfile.js', 'lib/**/*.js', 'lib/**/*.jsx' ];

	return gulp.src(src)
		.pipe(plumber())
		.pipe(eslint(
			{
				plugins : [ 'react', 'import' ],
				extends : [ 'eslint:recommended', 'plugin:react/recommended' ],
				settings :
				{
					react :
					{
						pragma  : 'React', // Pragma to use, default to 'React'.
						version : '15'     // React version, default to the latest React stable release.
					}
				},
				parserOptions :
				{
					ecmaVersion  : 6,
					sourceType   : 'module',
					ecmaFeatures :
					{
						impliedStrict : true,
						jsx           : true
					}
				},
				envs :
				[
					'browser',
					'es6',
					'node',
					'commonjs'
				],
				'rules' :
				{
					'no-console'                         : 0,
					'no-undef'                           : 2,
					'no-unused-vars'                     : [ 2, { vars: 'all', args: 'after-used' }],
					'no-empty'                           : 0,
					'quotes'                             : [ 2, 'single', { avoidEscape: true } ],
					'semi'                               : [ 2, 'always' ],
					'no-multi-spaces'                    : 0,
					'no-whitespace-before-property'      : 2,
					'space-before-blocks'                : 2,
					'space-before-function-paren'        : [ 2, 'never' ],
					'space-in-parens'                    : [ 2, 'never' ],
					'spaced-comment'                     : [ 2, 'always' ],
					'comma-spacing'                      : [ 2, { before: false, after: true } ],
					'jsx-quotes'                         : [ 2, 'prefer-single' ],
					'react/display-name'                 : [ 2, { ignoreTranspilerName: false } ],
					'react/forbid-prop-types'            : 0,
					'react/jsx-boolean-value'            : 1,
					'react/jsx-closing-bracket-location' : 1,
					'react/jsx-curly-spacing'            : 1,
					'react/jsx-equals-spacing'           : 1,
					'react/jsx-handler-names'            : 1,
					'react/jsx-indent-props'             : [ 2, 'tab' ],
					'react/jsx-indent'                   : [ 2, 'tab' ],
					'react/jsx-key'                      : 1,
					'react/jsx-max-props-per-line'       : 0,
					'react/jsx-no-bind'                  : 0,
					'react/jsx-no-duplicate-props'       : 1,
					'react/jsx-no-literals'              : 0,
					'react/jsx-no-undef'                 : 1,
					'react/jsx-pascal-case'              : 1,
					'react/jsx-sort-prop-types'          : 0,
					'react/jsx-sort-props'               : 0,
					'react/jsx-uses-react'               : 1,
					'react/jsx-uses-vars'                : 1,
					'react/no-danger'                    : 1,
					'react/no-deprecated'                : 1,
					'react/no-did-mount-set-state'       : 1,
					'react/no-did-update-set-state'      : 1,
					'react/no-direct-mutation-state'     : 1,
					'react/no-is-mounted'                : 1,
					'react/no-multi-comp'                : 0,
					'react/no-set-state'                 : 0,
					'react/no-string-refs'               : 0,
					'react/no-unknown-property'          : 1,
					'react/prefer-es6-class'             : 1,
					'react/prop-types'                   : 1,
					'react/react-in-jsx-scope'           : 1,
					'react/self-closing-comp'            : 1,
					'react/sort-comp'                    : 0,
					'react/jsx-wrap-multilines'          : [ 1, { declaration: false, assignment: false, return: true } ],
					'import/extensions'                  : 1
				}
			}))
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
	let dst = path.join(OUTPUT_DIR, 'resources');

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
			open      : 'external',
			host      : config.domain,
			server    :
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
			open      : 'external',
			host      : config.domain,
			server    :
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

gulp.task('prod', gulp.series(
	'env:prod',
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources'
));

gulp.task('dev', gulp.series(
	'env:dev',
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources'
));

gulp.task('live', gulp.series(
	'env:dev',
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
