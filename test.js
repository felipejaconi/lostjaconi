const str = "5-6-6";
const sanitized = str.replace(/,/g, '.').replace(/[^0-9.+\-*/()]/g, '');
console.log(sanitized);
console.log(parseFloat(new Function('return ' + sanitized)()) || 0);
