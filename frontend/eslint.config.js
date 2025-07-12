import js from '@eslint/js' // 기본 JS 규칙
import reactHooks from 'eslint-plugin-react-hooks' // React Hooks 규칙
import reactRefresh from 'eslint-plugin-react-refresh' // Hot Reload 지원
import globals from 'globals' // window, document 등 전역 변수 설정
import tseslint from 'typescript-eslint' // TS 지원
import prettier from 'eslint-plugin-prettier' // Prettier 통합
import react from 'eslint-plugin-react' // React 규칙
import jsxA11y from 'eslint-plugin-jsx-a11y' // 접근성 규칙
import importPlugin from 'eslint-plugin-import' // import/export 규칙
import tailwindcss from 'eslint-plugin-tailwindcss' // tailwind CSS 규칙

export default tseslint.config(
  { ignores: ['dist'] }, // 빌드 결과물 폴더 무시
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: {
      react: {
        version: '19.1', 
        runtime: 'automatic'
      },
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.css']
        }
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'prettier': prettier,
      'react': react,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
      'tailwindcss': tailwindcss
    },
    rules: {
      ...js.configs.recommended.rules, // 추천 규칙 적용
      ...reactHooks.configs.recommended.rules, // 추천 규칙 적용
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': 'error', // 규칙 위반시 에러 표시
      'arrow-body-style': 'off', // 화살표 함수 스타일 제한 해제
      'prefer-arrow-callback': 'off',
      'react/jsx-no-target-blank': 'off', // target = "_blank" 시 보안경고 해제
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ],
      'no-unused-vars': 'off', // TS 사용, 기본 미사용 변수 규칙 끄기
      // 미사용 변수 규칙 설정
      '@typescript-eslint/no-unused-vars': ['warn', {
        'varsIgnorePattern': '^_',
        'argsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }],
      // 일치연산자 강제(!==, ===)
      'eqeqeq': ['error', 'always'],
      // tailwindcss 관련 규칙, 클래스명 순서와 커스텀 클래스명 허용
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'off'
    }
  }
)