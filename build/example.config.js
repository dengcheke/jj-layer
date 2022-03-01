const path = require('path');
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const isProd = process.env.NODE_ENV === 'production';
const staticHome = path.resolve(__dirname, '../static');
module.exports = {
    mode: process.env.NODE_ENV,
    entry: path.resolve(__dirname, "../example/main.js"),
    output: {
        path: path.resolve(__dirname, "../docs"),
        filename: "[name].[contenthash:8].js",
        publicPath: isProd? 'https://dengcheke.github.io/cjj-layer/' : "/",
    },
    resolve: {
        extensions: ['.js', '.vue', '.json', '.jsx'],
        alias: {
            '@src': path.resolve(__dirname, '../src'),
            '@layer': path.resolve(__dirname, '../dist/esm'),
        }
    },
    devtool: isProd ? false : 'source-map',
    devServer: {
        open: true,
        port: 10086,
        contentBase: staticHome,
        historyApiFallback: true
    },
    module: {
        rules: [
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                    compilerOptions: {
                        preserveWhitespace: false
                    }
                }
            },
            {
                test: /\.m?jsx?$/,
                include: [
                    path.resolve(__dirname, '../src'),
                    path.resolve(__dirname, '../example'),
                    path.resolve(__dirname, '../node_modules/three/examples'),
                ],
                loader: 'babel-loader',
                options: {
                    "presets": [
                        [
                            "@babel/preset-env",
                            {
                                targets:{
                                    chrome:85,
                                },
                            }
                        ]
                    ],
                    "plugins": [
                        "@vue/babel-plugin-transform-vue-jsx",
                        [
                            "@babel/plugin-transform-runtime",
                            {
                                corejs: 3,
                                helpers: true,
                            }
                        ]
                    ],
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.less$/,
                use: ['style-loader', 'css-loader', 'less-loader'],
            },
            {
                test: /\.(svg|otf|ttf|woff2?|eot|gif|png|jpe?g)(\?\S*)?$/,
                use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 4096,
                    }
                }],
            }
        ]
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            automaticNameDelimiter: '-',
            minSize: 10000,
            maxInitialRequests: 5,
            maxAsyncRequests: 5,
            cacheGroups: {
                customLayer: {
                    name: 'custom-layer',
                    minChunks: 1,
                    test: function (module) {
                        return module.resource && /arcgis-layers[\\/]dist[\\/]/.test(module.resource)
                    },
                    priority: 3,
                },
                vendors: {
                    name: 'vendor',
                    minChunks: 2,
                    test: /[\\/]node_modules[\\/]/,
                    priority: -10,
                    reuseExistingChunk: true,
                },
                default: {
                    test: function () {
                        return false
                    },
                    minChunks: 2,
                    priority: -20,
                }
            }
        }
    },
    plugins: [
        new webpack.DefinePlugin({
            STATIC_URL: JSON.stringify(isProd ? 'https://github.com/dengcheke/cjj-layer/raw/main/static/' : '/'),
            PROCESS_ENV: JSON.stringify(process.env.NODE_ENV)
        }),
        new VueLoaderPlugin(),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, "../docs/index.html"),
            template: path.resolve(__dirname, '../static/index.html'),
            title: 'clj-layer'
        }),
    ].filter(Boolean)
}
