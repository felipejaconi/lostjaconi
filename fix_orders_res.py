import sys

with open('src/routes/orders.ts', 'r') as f:
    code = f.read()

code = code.replace('res.json(orders);\n    } catch (error: any) {', 'cache.set(cacheKey, orders);\n      res.json(orders);\n    } catch (error: any) {')

with open('src/routes/orders.ts', 'w') as f:
    f.write(code)
