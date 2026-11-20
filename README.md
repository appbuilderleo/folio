# Fólio — A página certa para cada dúvida

Plataforma móvel (Web/PWA) de busca e estudo de **matérias curriculares** do Sistema Nacional de Educação (SNE) de Moçambique (**1.ª à 12.ª classe**).

## Regras de Negócio & Arquitetura

- **Experiência 100% focada em Matéria Curricular:** pesquisa sem fricção inicial (sem conta obrigatória), resumos automáticos de **½ parágrafo (2 a 3 frases, até ~220 caracteres)** e pré-visualização imediata por **Tema, Disciplina, Classe e Página Exata**.
- **Separação Estrita Aluno vs. Administrador:**
  - Interface pública restrita a pesquisa, pré-visualização, pagamento (**17,00 MT** via **M-Pesa** 84/85 ou **e-Mola** 86/87) e área pessoal **Minhas Matérias**.
  - Painel administrativo isolado em `/admin`, protegido no servidor por `role = 'admin'`, onde o administrador seleciona **Classe**, **Disciplina** e anexa o **PDF** para extração por página e geração automática de resumos de ½ parágrafo via **Groq**.
- **Autenticação Nativa no CockroachDB (`users`, `user_sessions`, `curricula`, `topics`, `user_unlocks`):**
  - E-mail e senha com `bcryptjs`, exigidos apenas ao desbloquear uma matéria ou aceder a **Minhas Matérias**.
  - **Anti-partilha:** máximo de **2 dispositivos ativos simultaneamente** (o 3.º início de sessão encerra automaticamente a sessão mais antiga).
- **Segurança & Performance 3G/4G:**
  - A busca (`GET /api/topics`) entrega apenas metadados leves e resumo de ½ parágrafo, tolerante a acentos e erros ortográficos.
  - O conteúdo completo (`GET /api/curricula/:id/content`) só é entregue após validação de autenticação e desbloqueio em `user_unlocks`, sendo encriptado em **AES-GCM + IndexedDB** para estudo **100% offline**.

## Variáveis de Ambiente (`.env` e Vercel)

Configure em `.env` (local) e em **Vercel → Project Settings → Environment Variables**:

- `DATABASE_URL` — string de conexão PostgreSQL do CockroachDB
- `GROQ_API_KEY` — chave da API da Groq para resumos em lote no `/admin`
- `ADMIN_EMAIL` — e-mail da conta administrativa inicial
- `ADMIN_PASSWORD` — senha forte da conta administrativa inicial

## Comandos

```bash
npm install
npm run db:init   # cria tabelas no CockroachDB, conta admin e catálogo base SNE
npm run dev       # inicia API (porta 3001) + Frontend (porta 5173)
npm run build     # verificação TypeScript + build de produção
```
