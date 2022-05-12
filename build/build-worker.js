const {nodeResolve} = require('@rollup/plugin-node-resolve');
const commonjs = require("@rollup/plugin-commonjs");
const babel = require('@rollup/plugin-babel').babel;
const path = require('path');
const rollup = require('rollup');
const fs = require('fs');
const terser = require("rollup-plugin-terser").terser;
const srcPath = path.resolve(__dirname, "../workers");
const outputPath = path.resolve(__dirname, '../dist/workers')

async function build(file) {
    const bundle = await rollup.rollup({
        input: file,
        plugins: [
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
    });
    const filename = path.basename(file);
    const outputOpts = {
        output: {
            file: path.join(outputPath, filename),
            format: "amd"
        },
    }
    await bundle.generate(outputOpts);
    await bundle.write(outputOpts);
    await bundle.close();
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

const list = readFile(srcPath);
list.forEach(build)
