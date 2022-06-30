const {nodeResolve} = require('@rollup/plugin-node-resolve');
const commonjs = require("@rollup/plugin-commonjs");
const babel = require('@rollup/plugin-babel').babel;
const path = require('path');
const rollup = require('rollup');
const fs = require('fs');
const terser = require("rollup-plugin-terser").terser;
const srcPath = path.resolve(__dirname, "../workers");
const outputPath = path.resolve(__dirname, '../dist/workers')
const testOutPath = path.resolve(__dirname, '../static/workers')
const isDev = process.argv.slice(2).indexOf('--watch') !== -1;

function getConfig(file) {
    const filename = path.basename(file);
    return {
        input: {
            input: file,
            plugins: isDev ? [] : [
                nodeResolve(),
                commonjs(),
                babel({
                    babelrc: false,
                    exclude: ['node_modules/**', 'esri/**'],
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                modules: false,
                                useBuiltIns: "usage",
                                corejs: 3
                            }
                        ]
                    ],
                    babelHelpers: 'bundled'
                }),
                terser()
            ],
            external: id => {
                return /^esri\//.test(id);
            }
        },
        output: {
            output: {
                sourcemap: isDev,
                file: path.join(isDev ? testOutPath : outputPath, filename),
                format: "amd"
            },
        }
    }
}

async function build(file) {
    const config = getConfig(file);
    const bundle = await rollup.rollup(config.input);
    const outputOpts = config.output;
    await bundle.generate(outputOpts);
    await bundle.write(outputOpts);
    await bundle.close();
}

function watchBuildFile(file) {
    const config = getConfig(file);
    const watcher = rollup.watch({
        ...config.input,
        output: [config.output.output]
    });
    watcher.on('event', event => {
        console.log(event)
    })
}

function readFile(root) {
    const list = [];
    const files = fs.readdirSync(root);
    files.forEach(f => {
        const fileUrl = path.join(root, f);
        const stat = fs.statSync(fileUrl);
        if (stat.isFile()) {
            list.push(fileUrl);
        }
    })
    return list;
}

readFile(srcPath).forEach(isDev ? watchBuildFile : build)
