const libname = process.argv[2] || 'napi';
const iterations = process.argv[3] ? parseInt(process.argv[3]) : 100000;

const { hello } = require(__dirname + '/hello-' + libname);

const list = [
  {num: 2, text: 'hello'},
  {num: 3, text: 'every'},
  {num: 4, text: 'one'}
];

console.time(libname);
for (let i = 0; i < iterations; i++) {
  const result = hello(list);
}
console.timeEnd(libname);
