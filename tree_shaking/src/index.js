// import { map } from 'lodash';
import { cube } from './math'; // square()をimportしていない

/**
 * このように書いた場合、moduleを書き換える事ができるため、webpackはTree Shakingを行えない
 * そのため、別ファイルで`export { cube } from './math'`のようにして、自分で削らなければいけない
 * import('./math').then(module => {
 *   function component() {
 *     const elm = document.createElement('pre');
 *     elm.innerHTML = [
 *       'Hello Webpack',
 *       '5 cubed = ' + module.cube(5)
 *     ].join('\n\n');
 * 
 *     return elm;
 *   }
 * 
 *   document.body.appendChild(component());
 * });
 */

function component() {
  const elm = document.createElement('pre');
  elm.innerHTML = [
    'Hello Webpack',
    '5 cubed = ' + cube(5)
  ].join('\n\n');

  return elm;
}

// map();

document.body.appendChild(component());
