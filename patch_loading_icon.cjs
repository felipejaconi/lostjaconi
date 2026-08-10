const fs = require('fs');
const file = 'src/pages/admin/AdminFinancial.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>',
  '<img src={`${import.meta.env.VITE_SUPABASE_URL || "https://ybaoaskddcmwoincsnwm.supabase.co"}/storage/v1/object/public/uploads/icon.png`} alt="Carregando..." className="w-8 h-8 animate-spin opacity-80" />'
);

fs.writeFileSync(file, code);
