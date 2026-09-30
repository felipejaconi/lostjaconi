const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

if (!code.includes('useNavigate')) {
  code = code.replace(
    /import React, \{ useState, useEffect \} from "react";/,
    'import React, { useState, useEffect } from "react";\nimport { useNavigate } from "react-router-dom";'
  );
}

if (!code.includes('ArrowLeft')) {
  code = code.replace(
    /import \{ ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Search, Save, History, DollarSign, Calculator, Store, ChevronDown \} from "lucide-react";/,
    'import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, Search, Save, History, DollarSign, Calculator, Store, ChevronDown, ArrowLeft } from "lucide-react";'
  );
}

if (!code.includes('const navigate = useNavigate();')) {
  code = code.replace(
    /export default function AdminFechos\(\) \{/,
    'export default function AdminFechos() {\n  const navigate = useNavigate();'
  );
}

const replacement = `<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors border border-white/5"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <BrandTitle title="Fechos de Caixa" hideUnderline titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-1" />
          </div>
        </div>`;

code = code.replace(
  /<div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">\s*<div>\s*<BrandTitle title="Fechos de Caixa" hideUnderline titleClassName="max-md:mt-0 md:-mt-4 max-md:pl-0 max-md:pt-0 max-md:ml-0 !mb-1" \/>\s*<\/div>/,
  replacement
);

fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);
