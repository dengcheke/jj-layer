const {nodeResolve} = require('@rollup/plugin-node-resolve');
const babel = require('@rollup/plugin-babel').babel;
const commonjs = require("@rollup/plugin-commonjs");
const path = require('path');
const url = require("@rollup/plugin-url");
const dependencies = require('../package.json').dependencies
const peerDependencies = require('../package.json').peerDependencies
const rollup = require('rollup');
const fs = require('fs');
const srcPath = path.resolve(__dirname, "../src");

const depKeys = [...Object.keys(dependencies),...Object.keys(peerDependencies)]

async function build(file) {
    const bundle = await rollup.rollup({
        input: file,
        plugins: [
            {
                //@src alias and as external
                resolveId(source, importer) {
                    let res = null;
                    if (importer && /@src/.test(source)) {
                        let fullPath = path.resolve(srcPath, source.replace('@src', "./"));
                        const extName = path.extname(fullPath);
                        if (!extName || extName === '.glsl') {
                            res =  {id: fullPath + '.js', external: 'relative'}
                        } else if (['.js', '.mjs'].indexOf(extName) !== -1) {
                            res = {id: fullPath, external: 'relative'}
                        } else {
                            res =  {id: fullPath, external: false}
                        }
                    }

                    return res
                }
            },
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
                            useBuiltIns: "usage",
                            corejs: 3
                        }
                    ]
                ],
                plugins: [
                    ["@babel/plugin-transform-runtime", {
                        corejs: 3,
                        helper: true,
                    }],
                ],
                babelHelpers: 'runtime'
            })
        ],
        external: id => {
            // Rollup will only exclude modules that match strings exactly!
            return !!depKeys.find(depend => id.includes(depend))
        }
    });
    const outputOpts = {
        output: {
            file: file.replace('src', `dist${path.sep}cjs`),
            format: "cjs"
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
            const fileName = path.basename(fileUrl);
            if (['base.js'].indexOf(fileName) !== -1 || path.extname(fileUrl) !== '.js') return
            list.push(fileUrl);
        } else if (stat.isDirectory()) {
            list.push(...readFile(fileUrl))
        }
    })
    return list;
}

const list = readFile(srcPath);

list.forEach(build)
