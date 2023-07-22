import commonjs from '@rollup/plugin-commonjs'
import multi from '@rollup/plugin-multi-entry'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default [
    {
        input: 'scripts/init.js',
        plugins: [
            commonjs(),
            resolve({ browser: true }),
            terser({ keep_classnames: true, keep_fnames: true }),
            multi()
        ],
        output: {
            format: 'esm',
            file: 'dist/token-action-hud-core.min.js',
            generatedCode: { constBindings: true },
            sourcemap: true
        }
    }
]
