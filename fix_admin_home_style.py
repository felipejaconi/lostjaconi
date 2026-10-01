import re

with open('src/pages/admin/AdminHome.tsx', 'r') as f:
    content = f.read()

old_h2 = """        <h2 className="text-lg sm:text-xl font-black text-white mt-2 flex items-center gap-2">
          <Activity className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" />
          <span className="truncate">
            LOGISTICA E FINANCEIRO
          </span>
        </h2>"""

new_h2 = """        <h2 className="text-lg sm:text-xl mt-2 flex items-center gap-2 text-[#facc15] tracking-wider leading-tight" style={{ fontFamily: "'Yellowtail', cursive", textShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}>
          <Activity className="text-blue-500 w-5 h-5 sm:w-6 sm:h-6" />
          <span className="truncate">
            Logística e Financeiro
          </span>
        </h2>"""

content = content.replace(old_h2, new_h2)

with open('src/pages/admin/AdminHome.tsx', 'w') as f:
    f.write(content)

print("Done")
