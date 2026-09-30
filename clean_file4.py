import sys
import re

with open('src/pages/admin/AdminSuppliers.tsx', 'r') as f:
    code = f.read()

pattern = re.compile(r'             \)\}\n           </div>\n\n         \)\}\n        </div>\n\n        \)\}\n      </div>\n\n      \{isModalOpen && \(', re.DOTALL)
code = pattern.sub('             )}\n           </div>\n        )}\n      </div>\n\n      {isModalOpen && (', code)

with open('src/pages/admin/AdminSuppliers.tsx', 'w') as f:
    f.write(code)

print("Success fix 4")
