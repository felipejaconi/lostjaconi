import sys

with open('src/routes/products.ts', 'r') as f:
    code = f.read()

code = code.replace('res.json(products);\n    } catch (error: any) {', 'cache.set("admin_produtos", products);\n      res.json(products);\n    } catch (error: any) {')

with open('src/routes/products.ts', 'w') as f:
    f.write(code)
