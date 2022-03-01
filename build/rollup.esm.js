import {nodeResolve} from '@rollup/plugin-node-resolve';
import {babel} from '@rollup/plugin-babel';
import commonjs from "@rollup/plugin-commonjs";
import path from 'path'
import alias from "@rollup/plugin-alias";
import url from "@rollup/plugin-url";
import {dependencies} from '../package.json'

const srcPath = path.resolve(__dirname, "../src");

export default [
    {
        input: path.resolve(__dirname, '../src/index.js'),
        plugins: [
            alias({
                entries: {
                    '@src': srcPath
                }
            }),
            url({
                limit: 4096,
                fileName: '[dirname][name][extname]',
                sourceDir: srcPath,
                destDir: path.resolve(__dirname, '../dist')
            }),
            nodeResolve(),
            commonjs(),
            babel({
                babelrc: false,
                exclude: 'node_modules/**',
                presets: [
                    [
                        "@babel/preset-env",
                        {
                            modules: false,
                        }
                    ]
                ],
                plugins: [
                    ["@babel/plugin-transform-runtime", {
                        corejs: 3,
                        helper: true
                    }],
                ],
                babelHelpers: 'runtime'
            }),
        ],
        output: {
            dir: path.resolve(__dirname, '../dist/esm'),
            format: "esm",
        },
        external: id => {
            // Rollup will only exclude modules that match strings exactly!
            return !!Object.keys(dependencies).find(depend => id.includes(depend))
        }
    },
]
