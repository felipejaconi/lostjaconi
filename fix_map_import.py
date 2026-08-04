with open("src/pages/AdminDashboard.tsx", "r") as f:
    content = f.read()

# I see Map is imported from both ErrorBoundary (oops) and lucide-react. Let's fix that.
content = content.replace('import { Map, ErrorBoundary } from "../components/ErrorBoundary";', 'import { ErrorBoundary } from "../components/ErrorBoundary";')
content = content.replace('import { Map, ErrorBoundary }', 'import { ErrorBoundary }') # Just in case

# Make sure there is only one Map imported from lucide-react
# Actually the duplicate is `import { Map, ErrorBoundary } ...` and `import { ... Map } from "lucide-react";`

with open("src/pages/AdminDashboard.tsx", "w") as f:
    f.write(content)
