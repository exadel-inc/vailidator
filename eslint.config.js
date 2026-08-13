import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'reports/**']
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
      globals: globals.node,
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
