const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminFechos.tsx', 'utf8');

// Find the index of "            </div>\n           ))}"
const idx = code.lastIndexOf('           ))}');
if (idx !== -1) {
    let top = code.substring(0, idx + 14); // keep until the closing parenthesis
    let bottom = `
           {lojasToDisplay.length === 0 && !isLoading && (
              <div className="p-12 text-center text-zinc-500">
                 Nenhuma loja encontrada.
              </div>
           )}
        </div>
           </div>
        )}
      </div>
    </ContentViewport>
  );
}
`;
    fs.writeFileSync('src/pages/admin/AdminFechos.tsx', top + bottom);
}
