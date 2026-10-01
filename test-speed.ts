import fetch from 'node-fetch';

async function test() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  const start = Date.now();
  console.log(`Fetching orders from ${date.toISOString()}...`);
  
  // Note: Since I am generating an external token, this might be hard to test.
  // We can just call localhost directly?
  // Let me just look at the code.
}

test();
