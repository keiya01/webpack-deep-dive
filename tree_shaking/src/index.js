import { cube } from './math'; // square()をimportしていない

function component() {
  const elm = document.createElement('pre');
  elm.innerHTML = [
    'Hello Webpack',
    '5 cubed = ' + cube(5)
  ].join('\n\n');

  return elm;
}

document.body.appendChild(component());
