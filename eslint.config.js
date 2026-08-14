import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'dist-ui/**', 'node_modules/**', 'reports/**', 'public/**', 'src/client/**/*.js']
  },
  {
    files: ['webpack.config.cjs'],
    languageOptions: {
      globals: globals.node
    }
  },
  eslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ...tseslint.configs.recommendedTypeChecked[0]
  },
  {
    files: ['src/**/*.ts'],
    ...tseslint.configs.recommendedTypeChecked[1]
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'preserve-caught-error': 'off',
      'no-unused-vars': 'off'
    }
  }
)
