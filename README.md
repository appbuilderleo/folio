# Fólio — A página certa para cada dúvida

Plataforma móvel (Web/PWA) de busca e estudo de **matérias curriculares** do Sistema Nacional de Educação (SNE) de Moçambique (**1.ª à 12.ª classe**).

## Regras de Negócio & Arquitetura

- **Experiência 100% focada em Matéria Curricular:** pesquisa sem fricção inicial (sem conta obrigatória), resumos automáticos de **½ parágrafo (2 a 3 frases, até ~220 caracteres)** e pré-visualização imediata por **Tema, Disciplina, Classe e Página Exata**.
- **Separação Estrita Aluno vs. Administrador:**
  - Interface pública restrita a pesquisa, pré-visualização, pagamento (**17,00 MT** via **M-Pesa** 84/85 ou **e-Mola** 86/87) e área pessoal **Minhas Matérias**.
  - Painel administrativo isolado em `/admin`, protegido no servidor por `role = 'admin'`, onde o administrador seleciona **Classe**, **Disciplina** e anexa o **PDF** para extração por página e geração automática de resumos de ½ parágrafo via **Groq**.
- **Autenticação Nativa no CockroachDB (`users`, `user_sessions`, `curricula`, `topics`, `user_unlocks`):**
  - E-mail e senha com `bcryptjs`, exigidos apenas ao desbloquear uma matéria ou aceder a **Minhas Matérias**.
  - **Sessão única por conta (Anti-partilha):** restrita a **1 dispositivo ativo por conta** — iniciar sessão noutro dispositivo encerra automaticamente a sessão anterior e limpa o cache offline desse dispositivo.
- **Segurança & Performance 3G/4G:**
  - A busca (`GET /api/topics`) entrega apenas metadados leves e resumo de ½ parágrafo, tolerante a acentos e erros ortográficos.
  - O conteúdo completo (`GET /api/curricula/:id/content`) só é entregue após validação de autenticação e desbloqueio em `user_unlocks`, sendo encriptado em **AES-GCM + IndexedDB** para estudo **100% offline**.

## Variáveis de Ambiente (`.env` e Vercel)

Configure em `.env` (local) e em **Vercel → Project Settings → Environment Variables**:

- `DATABASE_URL` — string de conexão PostgreSQL do CockroachDB
- `GROQ_API_KEY` — chave da API da Groq para resumos em lote no `/admin`
- `ADMIN_EMAIL` — e-mail da conta administrativa inicial
- `ADMIN_PASSWORD` — senha forte da conta administrativa inicial
- `SITE_URL` / `VITE_SITE_URL` *(opcional)* — URL canónica pública (padrão: `https://folio-one-snowy.vercel.app`)
- `INDEXNOW_KEY` *(opcional)* — chave IndexNow (8–128 caracteres) para notificação automática ao publicar novas matérias

## Otimização SEO & AI Search Visibility (baseada em OpenSEO)

- **Páginas SSR indexáveis sem expor conteúdo pago:** `/materias` (diretório público por ciclo/disciplina) e `/tema/:id` (pré-visualização pública com resumo grátis de ½ parágrafo + 2 parágrafos de excerto, sem nunca expor `full_text` ou `visuals` bloqueados).
- **Descoberta & Crawlers:** `/sitemap.xml` dinâmico ligado ao CockroachDB, `/robots.txt` compatível com Googlebot, Bingbot, OAI-SearchBot, PerplexityBot, ClaudeBot e OpenSEO-Audit, e `/llms.txt` para citação rigorosa em motores de IA.
- **Proteção de rotas internas:** `/admin` e `/api/*` excluídos de `sitemap.xml`, bloqueados em `robots.txt` e servidos com `X-Robots-Tag: noindex, nofollow`.
- **Metadados & Dados Estruturados:** títulos únicos (`≤ 60` caracteres), descrições únicas (`70–160` caracteres), canonical próprio, cartão OpenGraph/Twitter `1200×630` (`/og-folio.png`) e JSON-LD (`Organization`, `WebSite`/`SearchAction`, `WebApplication`, `FAQPage`, `CollectionPage`, `LearningResource` e `BreadcrumbList`).

## Comandos

```bash
npm install
npm run db:init   # cria tabelas no CockroachDB, conta admin e catálogo base SNE
npm run dev       # inicia API (porta 3001) + Frontend (porta 5173)
npm run build     # verificação TypeScript + build de produção
```
