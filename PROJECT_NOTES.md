# Notas do Projeto - GRUPO LOST WIND

## 📋 Informações Gerais
- **Nome do Projeto:** GRUPO LOST WIND
- **Repositório GitHub:** [https://github.com/felipejaconi/lostjaconi.git](https://github.com/felipejaconi/lostjaconi.git)
- **Desenvolvedor:** Felipe Jaconi
- **Ambiente de Base de Dados:** Supabase

## 🚀 Configuração de Git (Lembrete)
Para realizar o push neste ambiente, foi utilizado o seguinte fluxo com Personal Access Token (PAT):
1. `git remote set-url origin https://<SEU_TOKEN>@github.com/felipejaconi/lostjaconi.git`
2. `git push -u origin main --force` (ou sem --force se o remoto estiver limpo)

## 🛠️ Estado Atual do Sistema
- **Versão:** Completa (Restauração finalizada em 22/10/2026).
- **Módulos Ativos:**
    - Autenticação JWT com níveis de acesso (Admin, Armazém, Loja).
    - Gestão de Stock (Entrada por faturas, conversão de unidades, movimentações).
    - Financeiro (Faturas pendentes, conferência, DRE).
    - Logística/WMS (Corredores, Estantes, Picking de pedidos).
    - Gestão de Frotas (Veículos e manutenções).
    - Painel de Loja (Pedidos internos e histórico).

## 📦 Deploy
O sistema possui um ficheiro `app.js` na raiz configurado para servir a aplicação em ambientes de produção (Vite + Express).
Para deploy manual: `npm run build` -> `npm start`.

---
*Nota: Estas informações servem como guia para futuras manutenções e atualizações do sistema.*
