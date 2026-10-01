const fs = require('fs');

const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

const regex = /function AdminInventories\(\) \{[\s\S]*?^function Admin/m;
const match = content.match(regex);
console.log(match ? match[0].substring(0, match[0].length - 15) : 'not found');
