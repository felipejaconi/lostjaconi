# LOST WIND ERP SaaS

Um sistema completo de Gestão de Recursos Empresariais (ERP) e Ponto de Venda (POS) desenvolvido com React, Vite, Tailwind CSS e Node.js (Express), utilizando o Supabase como base de dados.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19, Vite, Tailwind CSS 4, React Router, Recharts, Lucide React, Framer Motion.
- **Backend:** Node.js, Express, JWT (JSON Web Tokens), Bcryptjs, Multer.
- **Base de Dados:** Supabase (PostgreSQL).

## 📦 Funcionalidades

- **Painel de Administração:** Gestão de utilizadores, produtos, categorias, pedidos e análise de dados (dashboard).
- **Painel de Loja:** Criação de pedidos, gestão de stock local (picagem), notificações.
- **Autenticação:** Login seguro com JWT e controlo de acessos baseado em funções (Admin vs Loja).
- **Gestão de Ficheiros:** Upload de imagens (avatares, produtos) integrado com o Supabase Storage.
- **Relatórios:** Exportação de dados e visualização gráfica do consumo.

## 🛠️ Como Executar Localmente

### Pré-requisitos
- Node.js (v18 ou superior)
- Conta no [Supabase](https://supabase.com/)

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/lost-wind-erp.git
cd lost-wind-erp
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
Copie o ficheiro `.env.example` para `.env` e preencha com as suas credenciais do Supabase:
```bash
cp .env.example .env
```
Exemplo do `.env`:
```env
SUPABASE_URL="https://seu-projeto.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anonima"
JWT_SECRET="uma-chave-secreta-segura"
PORT=3000
```

### 4. Configurar a Base de Dados (Supabase)
1. Crie um novo projeto no Supabase.
2. Vá ao **SQL Editor** e execute o conteúdo do ficheiro `database.sql` que se encontra na raiz do projeto.
3. Crie um bucket no **Storage** chamado `uploads` e defina-o como público.

### 5. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:3000`.

## 🌐 Deploy (Produção)

Este projeto está configurado para ser facilmente hospedado em plataformas que suportam Node.js (como Hostinger, Render, Heroku, etc.).

1. Faça o build do projeto:
```bash
npm run build
```
Isto irá compilar o frontend para a pasta `dist` e o backend para `dist/server.js`.

2. Inicie o servidor em modo de produção:
```bash
npm start
```

Para instruções detalhadas de deploy na Hostinger, consulte o ficheiro [README-Hostinger.md](./README-Hostinger.md).

## 🔐 Credenciais Padrão (Após executar o SQL)
- **Admin:** `admin@lostwind.com` / `admin123` (ou a senha que definir no script de setup)

---
Desenvolvido por LOST WIND LDA © 2026
