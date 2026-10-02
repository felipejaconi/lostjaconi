const str = "10-3-4 = 3";
const expr = str.split('=')[0];
const sanitized = expr.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
const evaluated = parseFloat(new Function('return ' + sanitized)()) || 0;
console.log(sanitized, evaluated);
