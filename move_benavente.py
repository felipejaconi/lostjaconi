import re

with open('src/pages/store/StoreManagement.tsx', 'r') as f:
    content = f.read()

# Find the block
pattern = re.compile(r'(\s*{isBenavente && \(.*?\s*</div\>\s*\)\})\s*{/\* Header \*/}', re.DOTALL)
match = pattern.search(content)

if match:
    block = match.group(1)
    
    # Remove the block from the original position
    content = content.replace(block, '')
    
    # Add it right before </ContentViewport>
    content = content.replace('    </ContentViewport>', block + '\n    </ContentViewport>')
    
    with open('src/pages/store/StoreManagement.tsx', 'w') as f:
        f.write(content)
    print("Moved successfully")
else:
    print("Block not found")
