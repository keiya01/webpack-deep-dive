# Webpack Deep Dive

- [About](#About)
- [Code Splitting について](#Code-Splitting-について)
  -[Bundle Splitting](#Bundle-Splitting)
    - [なぜコードを分割するのか](#なぜコードを分割するのか)
    - [コードの重複を防ぐ](#コードの重複を防ぐ)
    - [デフォルトの無駄な設定](#デフォルトの無駄な設定)
    - [モジュールの分割する](#モジュールの分割する)
    - [Example](#Example)
  - [Code Splitting](#Code-Splitting)
    - [よくない方法](#よくない方法)
    - [ダイナミックインポート](#ダイナミックインポート)
- [Minify](#Minify)
- [Tree Shaking](#Tree-Shaking)
- [Cache](#Cache)
  - [ブラウザ Cache について](#ブラウザ-Cache-について)
  - [strategy](#strategy)
    - [optimization.runtimeChunk](#optimization.runtimeChunk)
    - [optimization.cacheGroups.vendor](#optimization.cacheGroups.vendor)
- [Bundle Size の調査](#Bundle-Size-の調査)

# About
このリポジトリはwebpackについて深く学ぶために、いろいろな設定やbuildプロセスを確認するためのものです。  
各ディレクトリのREADMEに詳細な説明を加えていきたい

# webpackの最適化
> 巨大なJS(+最近は in JS された各種SVGやCSS)はダウンロードだけではなく、UIスレッドのCPUをブロックする。
これはとくにCPUが貧弱な端末で体験が悪化する。そしてビルド時間で開発者体験を阻害する。
できれば webpack 推奨の 144kb 以内にしたい…が現実的に難しいので、 せめて 350kb ぐらいに抑えたい。  
SPAなら (ローディングスピナーなどのアニメーションを出した上で) 1.5MB ぐらいに抑えたい。    
ビルドサイズが 3MB 超えたあたりで、日本の一般的な 4G 環境では使い物にならなくなる。

**参考**  
Webpack チャンク最適 テクニック - Qiita ... https://qiita.com/mizchi/items/418be9abee5f785696f0

# Code Splitting について

Code Splittingには`Bundle Splitting`と`Code Splitting`の２種類ある。

- `Bundle Splitting`はキャッシュを行いやすいようにモジュールを小さく分けて、キャッシュの恩恵をフルに受けられるようにバンドルするもの。
- `Code Splitting`はユーザーの要求に合わせて、モジュールをリクエストするように設定するもので、いわゆるダイナミックインポートでの読み込みのこと。

最も重要なのは`Bundle Splitting`を理解し、コードをできる限り小さく設定するようにすることである。小さく分割することで、リクエストは増えるが`HTTP2`で通信を行えば、コードの量はボトルネックにはならない(数百ほどにもなると流石に遅延する、、)。
  
`HTTP2`の対応状況についてもそこまで気にする必要はないし、サポート外のブラウザを使っているようなユーザーはページの読み込み速度をそこまで気にしないようである。

> If you’re wondering, support for HTTP/2 goes back to IE 11 on Windows 10. I’ve done an exhaustive survey of everyone using an older setup than that and they unanimously assured me that they don’t care how quickly websites load.
出典: https://medium.com/hackernoon/the-100-correct-way-to-split-your-chunks-with-webpack-f8a9df5b7758

## Bundle Splitting

### コードの重複を防ぐ
コードの重複を防ぐには、`optimization.splitChunks.chunks`を`all`に設定する。しかし、`optimization.splitChunks.chunks`に直接`all`を指定すると、`splitChunks`の設定をみたす全てのコードが分割されてしまうことで頻繁に内容が更新されるコードも含まれることになり、キャッシュの恩恵を受けられないことがある([optimization.cacheGroups.vendor](#optimization.cacheGroups.vendor))。  
さらに`webpack`のランタイムを独立させるために、`optimization.runtime = 'single'`を設定するとよい。

### 分割の方法
Webpackの機能を使ってコード分割を行う。一番簡単な方法として、`entry`に複数のファイルを書いて分割する方法を思いつくかもしれないが、この方法だと、`entry`ファイルのそれぞれにmoduleがバンドルされてしまう。例えば、`index.js`と`another.js`が存在し、`another.js`で`lodash`を使っているが、`index.js`では使っていない状況を考える。この場合、`webpack`を使って`build`すると、`index.js`と`another.js`の両方に`module`がバンドルされてしまう。こうなってしまうとコードを分割してもコード量が増えてしまい、逆にオーバーヘッドになってしまう。これを避けるには`SplitChunksPlugin`を使う必要がある。

### デフォルトの無駄な設定

- 4つ以上のファイルを同時にリクエストしない(`maxInitialRequest`)
- 30kb以下のファイルは同一ファイルにする設定(`minSize`)
- これらをOverrideしてリセットする

### モジュールを分割する

- モジュールを分割することでキャッシュの恩恵を最大限受けることができる
- `HTTP2`を使えば、ファイル数が多くてもボトルネックにはならない
- しかし数100のモジュールを含んでいる場合、同時接続数の限界に達し、遅延が発生する可能性がある
- 100以下の場合: 全てのモジュールを分割する
- 100以上の場合、なかなか更新しない大きいファイルから順に分割していき、頻繁に更新される物はまとめるのが良さそう？

### Example

```js

module.exports = {
  entry: {
    main: path.resolve(__dirname, 'src/index.js'),
    ProductList: path.resolve(__dirname, 'src/ProductList/ProductList.js'),
    ProductPage: path.resolve(__dirname, 'src/ProductPage/ProductPage.js'),
    Icon: path.resolve(__dirname, 'src/Icon/Icon.js'),
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash:8].js',
  },
  plugins: [
    new webpack.HashedModuleIdsPlugin(), // so that file hashes don't change unexpectedly
  ],
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // get the name. E.g. node_modules/packageName/not/this/part.js
            // or node_modules/packageName
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];

            // npm package names are URL-safe, but some servers don't like @ symbols
            return `npm.${packageName.replace('@', '')}`;
          },
        },
      },
    },
  },
};

```

## Code Splitting

### なぜコードを分割するのか
> コード分割は、ユーザが必要とするコードだけを「遅延読み込み」する手助けとなり、 アプリのパフォーマンスを劇的に向上させることができます。 アプリの全体的なコード量を減らすことはできませんが、ユーザが必要としないコードを読み込まなくて済むため、 初期ロードの際に読む込むコード量を削減できます。 

**参考**  
Code Splitting - React ... https://ja.reactjs.org/docs/code-splitting.html

### ダイナミックインポート
ダイナミックインポート(`import()`)を使うことで、特定のファイルにbuild時の設定を組み込むことができたり、指定したmoduleを分割することができる。また、Reactを使っている時は、`lazy()`と`Suspense`コンポーネントを使うことで、コードを分割できる。SSRを使用している場合は [loadable-component](https://loadable-components.com/) を使うとコード分割を利用できる。  
`babel` を使用している場合は、[babel-plugin-syntax-dynamic-import](https://classic.yarnpkg.com/en/package/babel-plugin-syntax-dynamic-import) を使用しないと、`import()`が変換されてしまう可能性があるため、指定しておく。

### Reactにおけるコード分割
- [React.lazy](https://ja.reactjs.org/docs/code-splitting.html#reactlazy) を使用して、Dynamic Import を行い、コードを分割する
  - `React.lazy` は `default export` のみサポートしているため、名前付きエクスポートを使用している場合は、中間モジュールを作成して `export { MyComponent as default } from "./ManyComponents.js";` のようにデフォルトとして、再エクスポートするように実装する。
- [React.Suspense](https://ja.reactjs.org/docs/code-splitting.html#suspense) を使用して、Dynamic Import を非同期で読み込む
- [Error-Boundary](https://ja.reactjs.org/docs/error-boundaries.html) を使用して、読み込み時に発生したエラーをキャッチする
- ルーティング単位でコードを分割する時は、以下のようにする

```jsx

import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import React, { Suspense, lazy } from 'react';

const Home = lazy(() => import('./routes/Home'));
const About = lazy(() => import('./routes/About'));

const App = () => (
  <Router>
    <Suspense fallback={<div>Loading...</div>}>
      <Switch>
        <Route exact path="/" component={Home}/>
        <Route path="/about" component={About}/>
      </Switch>
    </Suspense>
  </Router>
);

```

**参考**  
Code Splitting - Webpack ... https://webpack.js.org/guides/code-splitting/  
Code Splitting - React ... https://ja.reactjs.org/docs/code-splitting.html
Code Splitting - create-react-app ... https://create-react-app.dev/docs/code-splitting/

# Minify
Reactでは Production Mode でビルドすることで、自動的にminifyしてくれる(webpack v4 以降)

# Tree Shaking
[Tree Shaking](https://github.com/keiya01/webpack-deep-dive/tree/master/tree_shaking)を参照してください。

# Cache  

## ブラウザ Cache について  
`webpack`で`output.filename`を`main.js`のように指定していると、ファイルの変更を検知できないため、キャッシュがうまく機能しない。
ブラウザーは初期読み込み時に静的ファイルをキャッシュに保存するが、その時にファイル名を見て更新されたかどうかを判断している。そのため、ファイル名が変更されていないとファイルを更新しても、表示が変わらないということがよくある。そのため`webpack`では`[name].[contenthash].js`のようにすることで、ファイルの変更のたびにファイル名が変更されるように設定できるようになっている。  
  
**参考**  
Caching - Webpack ... https://webpack.js.org/guides/caching/  

## strategy

### optimization.runtimeChunk

runtimeをメインのコードから分けるために使用される。`single`を設定すると、runtimeが一つのfileにまとめられる。  

### optimization.cacheGroups.vendor

`vendor`を設定すると、特定のmoduleのコードを分割することができる。更新頻度の少ないmoduleを分割することで、キャッシュを効率的に行うことができ、requestの回数を減らすことができる。例えば、`node_modules`は頻繁に更新される`module`ではないので、`node_modules`を分割することで効率的にキャッシュを行うことができる。  

```json
  {
    "optimization": {
      "runtimeChunk": "single",
      "cacheGroup": {
        "vendor": {
          "test": /node_modules/,
          "name": "vendors",
          "chunks": "all"
        }
      }
    }
  }
```

ここで`enforce`を`true`に設定する事で`splitChunks.minSize`、`splitChunks.minChunks`、 `splitChunks.maxAsyncRequests`、 `splitChunks.maxInitialRequests`を無視して`chunk`を作成する。  
  
上記の例には少し問題がある。`vendors`を`node_modules`全てを読み込むように指定してしまった場合、1つのコンポーネントでしか使っていない`module`も`vendors`に含まれてしまう事で巨大化してしまい、読み込みが遅くなるし、キャッシュが非効率になる可能性がある。

```json
  {
    "optimization": {
      "runtimeChunk": "single",
      "cacheGroup": {
        "vendor": {
          "test": /react|react-dom|styled-components|react-router/,
          "name": "vendors",
          "chunks": "all"
        }
      }
    }
  }
```

この辺りの最適化はプロジェクトによっても異なるため、ビルドサイズや実際に読み込まれるファイルのサイズを確認しながら調整して行く形になると考える。

**参照**  
Cache - Webpack ... https://webpack.js.org/guides/caching/  

# Bundle Size の調査
webpack を使用した場合、JavaScript が bundle されるために、1ファイルのサイズがとても大きくなってしまうことがある。そうなってしまうと、初期読み込みが遅くなってしまい、UX の低下をもたらす。この問題を解決するために有効な手段として使うのが [Performance Budgets](#Performance-Budgets) である。これを指標として、パフォーマンス改善を行っていく。
webpack には `webpack-bundle-analyzer` という Bundle Size を可視化するためのツールがあり、それを使うとスムーズ。カーソルを当てると、フィルサイズなどが表示されるので一つずつ改善していく。改善の仕方は、なぜそのファイルが重いのか、どのような用途で使われているかを調査する。その後、別ライブラリーで置き換えたり、自前で実装したりして、改善していく。

**参考**
webpackのbundle後のJavaScriptのサイズを減らしている話 - リクルート ... https://recruit-tech.co.jp/blog/2018/12/15/try_optimization_webpack_bundle_size/  
