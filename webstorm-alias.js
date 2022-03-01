module.exports = {
    resolve: {
        extensions: ['.js'],
        alias: {
            '@src': path.resolve(__dirname, './src'),
            '@layer': path.resolve(__dirname, './dist/cjs'),
        }
    }
}
