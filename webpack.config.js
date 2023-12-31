const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');
let mode = 'development';

if (process.env.NODE_ENV === 'production') {
    mode = 'production';
}

module.exports = {
    mode: mode,
    entry: {
        bundle: path.resolve(__dirname, 'src/js/index.js'),
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].[contenthash].js',
        publicPath: '/',
        clean: true,
        assetModuleFilename: '[name][ext]',
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'dist'),
        },
        port: 3000,
        open: true,
        hot: true,
        compress: true,
        historyApiFallback: true,
    },
    devtool: false,
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'postcss-loader',
                    'sass-loader',
                ],
            },
            {
                test: /\.js$/,
                exclude: /node_module/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.(svg|png)$/i,
                type: 'asset/resource',
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
            },
        ],
    },
    plugins: [
        new WebpackPwaManifest({
            name: 'ChromaPairs',
            short_name: 'CP',
            description: 'Try to guess!',
            theme_color: '#ffffff',
            background_color: '#000000',
            display: 'standalone',

            crossorigin: 'use-credentials',
            icons: [
                {
                    src: path.resolve('src/assets/icons/icon-512x512.png'),
                    sizes: [96, 128, 192, 256, 384, 512],
                },
            ],
        }),
        new HtmlWebpackPlugin({
            title: 'Webpack App',
            filename: 'index.html',
            template: 'src/template.html',
            favicon: 'src/assets/icons/icon-128x128.png',
        }),
        new WorkboxPlugin.GenerateSW({
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
                {
                    urlPattern: /https:\/\/kit\.fontawesome\.com\/.*/,
                    handler: 'StaleWhileRevalidate',
                    options: {
                        cacheName: 'font-awesome',
                    },
                },
            ],
        }),
    ],
};
