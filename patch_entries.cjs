const fs = require('fs');
const file = 'src/pages/admin/AdminStockEntries.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'import React, { useState, useEffect, useMemo, useRef } from "react";',
  'import React, { useState, useEffect, useMemo, useRef } from "react";\nimport { useNavigate } from "react-router-dom";'
);

code = code.replace(
  'export default function AdminStockEntries({ onSuccess }: { onSuccess?: () => void }) {',
  'export default function AdminStockEntries({ onSuccess }: { onSuccess?: () => void }) {\n  const navigate = useNavigate();'
);

code = code.replace(
  '<button className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm border border-zinc-700">',
  '<button onClick={() => navigate("/admin/financeiro?tab=faturas")} className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm border border-zinc-700">'
);

fs.writeFileSync(file, code);
