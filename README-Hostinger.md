# Guia de Hospedagem na Hostinger (Node.js)

A aplicação foi configurada e formatada para ser hospedada na Hostinger utilizando o ambiente **Node.js App** (geralmente via cPanel ou hPanel).

## Passos para o Deploy:

1. **Aceder ao Painel da Hostinger:**
   - Vá à secção **Avançado** > **Node.js App** (ou similar, dependendo do seu painel).

2. **Criar a Aplicação Node.js:**
   - **Versão do Node.js:** Recomendado `18.x` ou superior.
   - **Application mode:** `Production`
   - **Application root:** O diretório onde vai colocar os ficheiros (ex: `public_html/app`).
   - **Application URL:** O domínio ou subdomínio onde a app vai correr.
   - **Application startup file:** `app.js` (Este ficheiro já foi criado na raiz do projeto e serve como ponto de entrada).

3. **Upload dos Ficheiros:**
   - Faça upload de **todos** os ficheiros do projeto para a pasta raiz da aplicação (incluindo `package.json`, `server.ts`, `vite.config.ts`, `app.js`, e a pasta `src`).
   - *Nota:* Não precisa de fazer upload da pasta `node_modules` nem da pasta `dist`.

4. **Instalar Dependências e Fazer o Build:**
   - No painel do Node.js App da Hostinger, clique no botão **Run NPM Install** para instalar as dependências.
   - Após a instalação, clique no botão **Run NPM command** e escreva `build`. Isto irá executar o script de build que compila o frontend e o backend (`vite build && esbuild server.ts ...`).
   - *Alternativa via SSH:* Aceda via SSH, vá até à pasta da aplicação e execute:
     ```bash
     npm install
     npm run build
     ```

5. **Variáveis de Ambiente:**
   - No painel do Node.js App, adicione as variáveis de ambiente necessárias (as mesmas que estão no `.env.example`):
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `JWT_SECRET`
   - *Nota:* A Hostinger gere a variável `PORT` automaticamente. O código já está preparado para usar a porta fornecida pela Hostinger (`process.env.PORT`).

6. **Iniciar/Reiniciar a Aplicação:**
   - Clique em **Restart** no painel do Node.js App.
   - A sua aplicação deverá agora estar online e a funcionar corretamente!

## O que foi alterado no código:
- O `server.ts` foi atualizado para usar `process.env.PORT || 3000`.
- O `package.json` foi atualizado com um script de `build` que compila o servidor TypeScript para JavaScript nativo (`dist/server.js`) usando o `esbuild`.
- Foi criado um ficheiro `app.js` na raiz para servir como ponto de entrada simples para o Passenger/Hostinger.
- O `esbuild` foi adicionado às dependências principais para garantir que o build funciona no ambiente de produção.
- Removidas dependências de caminhos absolutos (`__dirname`) que causam problemas em módulos ES no servidor.
