module.exports =
{
	env :
	{
		'browser'  : true,
		'es6'      : true,
		'node'     : true,
		'commonjs' : true
	},
	plugins :
	[
		'react',
		'import'
	],
	extends :
	[
		'eslint:recommended',
		'plugin:react/recommended'
	],
	settings :
	{
		react :
		{
			pragma  : 'React',
			version : '15'
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
	rules :
	{
		'no-console'                         : 0,
		'no-undef'                           : 2,
		'no-unused-vars'                     : [ 1, { vars: 'all', args: 'after-used' }],
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
		'react/jsx-wrap-multilines'          :
		[
			1,
			{ declaration: false, assignment: false, return: true }
		],
		'import/extensions'                  : 1
	}
};
