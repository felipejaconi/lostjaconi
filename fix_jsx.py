import re

with open('src/pages/admin/AdminAnalytics.tsx', 'r') as f:
    content = f.read()

# Fix the JSX ArrowDownRight issue
content = content.replace('''<ArrowDownRight,
  ChevronLeft,
  ChevronRight size={14} className="text-red-500" />''', '<ArrowDownRight size={14} className="text-red-500" />')

with open('src/pages/admin/AdminAnalytics.tsx', 'w') as f:
    f.write(content)

print("Fixed JSX error")
