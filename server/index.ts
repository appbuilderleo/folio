import { app, ensureDbReady } from './app';
import { getPreferredGroqModel, isGroqConfigured } from './groqService';

const PORT = Number(process.env.PORT || 3001);

// Bind HTTP port immediately so Vite proxy never hits ECONNREFUSED while CockroachDB initializes
app.listen(PORT, () => {
  console.log(`[Fólio API] Servidor ativo em http://127.0.0.1:${PORT}`);
});

ensureDbReady()
  .then((ready) => {
    if (ready) {
      console.log(
        `[Fólio API] CockroachDB conectado e esquema verificado. Groq IA: ${
          isGroqConfigured() ? `ativa (${getPreferredGroqModel()})` : 'inativa'
        }.`
      );
    } else {
      console.warn('[Fólio API] CockroachDB indisponível no arranque; tentará reconectar por pedido.');
    }
  })
  .catch((err) => {
    console.error('[Fólio API] Falha ao inicializar CockroachDB:', err);
  });
