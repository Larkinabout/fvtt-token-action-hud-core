import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

export default [
  {
    input: "module/main.mjs",
    plugins: [
      commonjs(),
      resolve({ browser: true })
    ],
    output: {
      format: "esm",
      file: "dist/token-action-hud-core.min.mjs",
      generatedCode: { constBindings: true },
      plugins: [
        terser({
          compress: {
            collapse_vars: false,
            reduce_vars: false
          },
          keep_classnames: true,
          keep_fnames: true
        })
      ],
      sourcemap: true
    }
  }
];
