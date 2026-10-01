const fs = require('fs');
const content = fs.readFileSync('src/pages/StoreDashboard.tsx', 'utf8');

const match = content.match(/function StoreHome\(\) \{[\s\S]*?^function /m);
console.log(match ? 'Found StoreHome' : 'Not found');
