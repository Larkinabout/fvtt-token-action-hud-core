import commonjs from '@rollup/plugin-commonjs'
import multi from '@rollup/plugin-multi-entry'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'

export default [
    {
        input: {
            include: [
                'scripts/*.js',
                'scripts/*/*.js'
            ],
            exclude: ['scripts/token-action-hud-core.min.js']
        },
        output: {
            format: 'esm',
            file: 'scripts/token-action-hud-core.min.js'
        },
        plugins: [
            commonjs(),
            resolve({ browser: true }),
            terser({ keep_classnames: true, keep_fnames: true }),
            multi()
        ]
    }
]
