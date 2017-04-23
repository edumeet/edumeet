'use strict';

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

gulp.task('lint', () =>
{
	let src =
	[
		'gulpfile.js',
		'server.js',
		'config.example.js',
		'config.js',
		'lib/**/*.js'
	];

	return gulp.src(src)
		.pipe(plumber())
		.pipe(eslint(
			{
				extends : [ 'eslint:recommended' ],
				parserOptions :
				{
					ecmaVersion  : 6,
					sourceType   : 'module',
					ecmaFeatures :
					{
						impliedStrict : true
					}
				},
				envs :
				[
					'es6',
					'node',
					'commonjs'
				],
				'rules' :
				{
					'no-console'                    : 0,
					'no-undef'                      : 2,
					'no-unused-vars'                : [ 2, { vars: 'all', args: 'after-used' }],
					'no-empty'                      : 0,
					'quotes'                        : [ 2, 'single', { avoidEscape: true } ],
					'semi'                          : [ 2, 'always' ],
					'no-multi-spaces'               : 0,
					'no-whitespace-before-property' : 2,
					'space-before-blocks'           : 2,
					'space-before-function-paren'   : [ 2, 'never' ],
					'space-in-parens'               : [ 2, 'never' ],
					'spaced-comment'                : [ 2, 'always' ],
				}
			}))
		.pipe(eslint.format());
});

gulp.task('watch', (done) =>
{
	let src = [ 'gulpfile.js', 'server.js', 'config.js', 'lib/**/*.js' ];

	gulp.watch(src, gulp.series(
		'lint'
	));

	done();
});

gulp.task('default', gulp.series('lint', 'watch'));
