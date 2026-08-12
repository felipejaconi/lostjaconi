const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

code = code.replace(
/      <\/div>\n\n               <\/div>\n        \)}\n      <\/div>\n    <\/ContentViewport>\n  \);\n\}/,
`
           </div>
        )}
      </div>
    </ContentViewport>
  );
}`
);

fs.writeFileSync('src/pages/admin/AdminFechos.tsx', code);
