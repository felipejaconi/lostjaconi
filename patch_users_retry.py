import re

with open('src/routes/users.ts', 'r') as f:
    content = f.read()

# Update POST /api/admin/users
post_block = """        let { error } = await supabase
          .from("users")
          .insert([insertData]);
          
        if (error && error.code === '42703') {
           delete insertData.manager_pin;
           const res = await supabase.from("users").insert([insertData]);
           error = res.error;
        }"""

content = re.sub(
    r'const \{ error \} = await supabase\s*\.from\("users"\)\s*\.insert\(\[insertData\]\);',
    post_block,
    content
)

# Update PUT /api/admin/users/:id
put_block = """        let { error } = await supabase
          .from("users")
          .update(updateData)
          .eq("id", req.params.id);
          
        if (error && error.code === '42703') {
           delete updateData.manager_pin;
           const res = await supabase.from("users").update(updateData).eq("id", req.params.id);
           error = res.error;
        }"""

content = re.sub(
    r'const \{ error \} = await supabase\s*\.from\("users"\)\s*\.update\(updateData\)\s*\.eq\("id", req\.params\.id\);',
    put_block,
    content
)

with open('src/routes/users.ts', 'w') as f:
    f.write(content)
