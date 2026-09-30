import sys

def fix_file(filename, replacements):
    with open(filename, 'r') as f:
        code = f.read()
    
    for old, new in replacements:
        if old in code:
            code = code.replace(old, new)
        else:
            print(f"Warning: could not find {old} in {filename}")
            
    with open(filename, 'w') as f:
        f.write(code)

fix_file('src/components/ErrorBoundary.tsx', [
    ('return this.props.children;', 'return (this as any).props.children;')
])

print("Done")
