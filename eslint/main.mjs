import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslint from '@eslint/js'
import neslint from 'eslint-plugin-n'
import tseslint from 'typescript-eslint'
import jestPlugin from 'eslint-plugin-jest'
import sofiePlugin from '@sofie-automation/eslint-plugin'

/**
 *
 * @template T
 * @param {Record<string, T | null | undefined>} obj
 * @returns {Record<string, T>}
 */
function compactObj(obj) {
	/** @type {Record<string, T>} */
	const result = {}

	for (const [key, value] of Object.entries(obj)) {
		if (value) result[key] = value
	}

	return result
}

/**
 * @param {{ ignores?: string[], tsconfigName?: string | string[], disableNodeRules?: boolean }} options
 * @returns {Promise<import('eslint').Linter.FlatConfig[]>}
 */
export async function generateEslintConfig(options) {
	return [
		{
			// Setup the parser for js/ts
			languageOptions: {
				parser: tseslint.parser,
				parserOptions: {
					project: options.tsconfigName || true,
				},
			},
		},

		...tseslint.configs.recommendedTypeChecked.map((conf) => ({
			...conf,
			// Only apply these rules to TypeScript files
			files: ['**/*.ts', '**/*.cts', '**/*.mts', '**/*.tsx'],
		})),
		{
			// Disable type-aware linting on JS files
			files: ['**/*.js', '**/*.cjs', '**/*.mjs', '**/*.jsx'],
			...tseslint.configs.disableTypeChecked,
			rules: {
				...tseslint.configs.disableTypeChecked.rules,
				'no-unused-vars': [
					'error',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_(.+)', caughtErrorsIgnorePattern: '^_' },
				],
			},
		},

		!options.disableNodeRules ? neslint.configs['flat/recommended-script'] : undefined,

		{
			settings: {
				n: {
					tryExtensions: ['.js', '.cjs', '.mjs', '.json', '.node', '.ts', '.cts', '.mts', '.d.ts', '.tsx'],
				},
			},
			// extends: commonExtends,
			// @ts-expect-error tseslint type mismatch
			plugins: compactObj({
				jest: jestPlugin,
				'@typescript-eslint': tseslint.plugin,
				'@sofie-automation': sofiePlugin,
			}),
			rules: {
				// Default rules to be applied everywhere
				'prettier/prettier': 'error',

				...eslint.configs.recommended.rules,

				'no-extra-semi': 'off',
				// 'n/no-unsupported-features/es-syntax': ['error', { ignores: ['modules'] }],
				'no-use-before-define': 'off',
				'no-warning-comments': ['error', { terms: ['nocommit', '@nocommit', '@no-commit'] }],
				// 'jest/no-mocks-import': 'off',
			},
		},

		{
			files: ['**/*.ts', '**/*.cts', '**/*.mts', '**/*.tsx'],
			rules: {
				// These clash with ts rules
				'no-unused-vars': 'off',
				'no-redeclare': 'off',
				'no-undef': 'off',
				'no-dupe-class-members': 'off',

				...sofiePlugin.configs.all.rules,

				// Custom rules
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/interface-name-prefix': 'off',
				'@typescript-eslint/no-unused-vars': [
					'error',
					{ argsIgnorePattern: '^_', varsIgnorePattern: '^_(.+)', caughtErrorsIgnorePattern: '^_' },
				],
				'@typescript-eslint/no-floating-promises': 'error',
				'@typescript-eslint/explicit-module-boundary-types': ['error'],
				'@typescript-eslint/promise-function-async': 'error',
				'@typescript-eslint/require-await': 'off', // conflicts with 'promise-function-async'
				'@typescript-eslint/no-duplicate-enum-values': 'error',
				'@typescript-eslint/no-require-imports': [
					'error',
					{
						allow: ['\\.json$'],
						// allowAsImport: true,
					},
				],

				/** Disable some annoyingly strict rules from the 'recommended-requiring-type-checking' pack */
				'@typescript-eslint/no-unsafe-assignment': 0,
				'@typescript-eslint/no-unsafe-member-access': 0,
				'@typescript-eslint/no-unsafe-argument': 0,
				'@typescript-eslint/no-unsafe-return': 0,
				'@typescript-eslint/no-unsafe-call': 0,
				'@typescript-eslint/restrict-template-expressions': 0,
				'@typescript-eslint/restrict-plus-operands': 0,
				'@typescript-eslint/no-redundant-type-constituents': 0,
				/** End 'recommended-requiring-type-checking' overrides */
			},
		},
		jestPlugin
			? {
					// enable jest rules on test files
					files: ['**/__tests__/**/*', 'test/**/*'],
					...jestPlugin.configs['flat/recommended'],
					rules: {
						...jestPlugin.configs['flat/recommended'].rules,
						'jest/no-mocks-import': 'off',
					},
				}
			: null,
		{
			files: ['**/__tests__/**/*', 'test/**/*'],
			rules: {
				'@typescript-eslint/ban-ts-ignore': 'off',
				'@typescript-eslint/ban-ts-comment': 'off',
			},
		},
		!options.disableNodeRules
			? {
					files: ['**/__tests__/**/*', 'test/**/*'],
					rules: {
						'n/no-unpublished-import': [
							'error',
							{
								allowModules: [
									'jest-mock-extended',
									'type-fest',
									'@testing-library/jest-dom',
									'@testing-library/react',
									'@testing-library/user-event',
								],
							},
						],
					},
				}
			: null,
		{
			// disable type-aware linting on JS files
			files: [
				'examples/**/*.js',
				'examples/**/*.cjs',
				'examples/**/*.mjs',
				'examples/**/*.ts',
				'examples/**/*.cts',
				'examples/**/*.mts',
			],
			rules: {
				'no-process-exit': 'off',
				'n/no-missing-import': 'off',
			},
		},

		!options.disableNodeRules
			? {
					files: ['eslint.config.*'],
					rules: {
						'n/no-extraneous-import': 'off',
					},
				}
			: null,

		// Add prettier at the end to give it final say on formatting
		eslintPluginPrettierRecommended,
		{
			// But lastly, ensure that we ignore certain paths
			ignores: [
				'.yarn/*',
				'**/dist/*',
				'**/coverage/*',
				'**/scratch/*',
				'/dist',
				'**/docs/*',
				'**/generated/*',
				...(options.ignores || []),
			],
		},
	].filter((v) => !!v)
}
