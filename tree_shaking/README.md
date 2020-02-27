# Tree Shaking

# About
`Tree Shaking`とはESMにおいて`export`されているが使われていないモジュールを洗い出してくれる機能である。この機能を使って洗い出されたコードはコメントで使われていない事が明示される。この明示されたコメントを基に`Terser`のような機能を使って使われていないモジュールの削除を行う。  

# webpack
webpackの`mode: 'development'`で`Tree Shaking`を確認するには`optimization.usedExports`を`true`にする必要がある。こうする事で`export`されているにも関わらず使用されていないモジュールにコメントが付く。  
また、`package.json`で`sideEffects: false(default true)`にすることでコードに副作用がないことを明示できるため、webpackが安全に`Tree Shaking`を行う事ができる。全てに依存関係がないと言えない場合も、`Array`を指定する事で副作用があるファイルを指定する事ができる。例えば、`polyfill`を読み込んでいるファイルや`css-loader`のような物を使っている場合は`*.css`を明示することで明示的に副作用をwebpackに伝える事ができる。  
`production`では`Tree Shaking`の設定は全て`true`になっているので、`sideEffects`を適切に設定する事が必要である。  

# Notice
注意点として、この機能は`import`や`export`で表現された場合にしか機能しない。なぜなら、`require`/`module.exports`でモジュールを扱った場合、代入された値が最終的にどのような値になっているかは実行してみないとわからないのである。`import`/`export`でモジュールを扱った場合、トップレベルで宣言しなければエラーになるように設計されているため、静的解析が容易に行えるのである。そのため、`lodash`のようなライブラリーを使う時はESMに対応している`lodash-es`を使うと良い。しかし、ESM対応していないライブラリーを使わなければいけない時もあるかもしれない、その場合は、`import map from 'lodash/map'`のように記述する事で指定のファイルのみを`import`できるためサイズを減らせる。これをより簡単に行うために[babel-plugin-transform-imports](#babel-plugin-transform-imports)を使うと便利。  
また、**注意すべき点**として、`Dynamic Import`を利用すると、`Tree Shaking`が行われないという問題がある。これは`import()`で返される値にアクセスできてしまうことから、`module`が書き換えられてしまっている可能性があるからである。`Dynamic Import`をするときに`Tree Shaking`も効かせたい場合は、別ファイルで`export { ... } from '../path/to/something'`とする。

# babel-plugin-transform-imports
毎回`import map from 'lodash/map'`のように記述するのは、手間なので、`babel-plugin-transform-imports`を使うと便利である。  
  
```js

// index.js

import { map } from 'lodash';

map();

// .babelrc.js

module.exports = {
  presets: [
    [
      'env',
      {
        modules: false
      }
    ]
  ],
  plugins: [
    [
      'transform-imports',
      {
        lodash: {
          // memberと記述する事で`import map from 'lodash/map'`のように書き換えられる
          transform: 'lodash/${member}',
          preventFullImport: true
        }
      }
    ]
  ]
}

```
  
さらに上の例では`preventFullImport`を`true`に設定している。これを設定する事で、モジュール全体が含まれている場合は`babel-plugin-transform-imports: import of entire module lodash not allowed due to preventFullImport setting`のようなエラーを出力してくれるため、意図しないモジュール全体の`import`を防ぐ事ができる。

# Dead Code Elimination
`TerserPlugin`を使って行われる。`mode: 'production'`では`default`でこれが適用されているため、基本は再設定する必要がないが、細かい設定が必要なときに追加で設定が必要となる。  
  
# 参考
- webpackの仕組みを簡潔に説明する ... https://blog.hiroppy.me/entry/mechanism-of-webpack
- Document why tree shaking is not performed on async chunks - GitHub ... https://github.com/webpack/webpack.js.org/issues/2684
