import { app, ensureDbReady } from './app';
import { getPreferredGroqModel, isGroqConfigured } from './groqService';

const PORT = Number(process.env.PORT || 3001);

ensureDbReady().then((ready) => {
  if (ready) {
    console.log(
      `[Fólio API] CockroachDB conectado e esquema verificado. Groq IA: ${
        isGroqConfigured() ? `ativa (${getPreferredGroqModel()})` : 'inativa'
      }.`
    );
  } else {
    console.warn('[Fólio API] CockroachDB indisponível no arranque; tentará reconectar por pedido.');
  }

  app.listen(PORT, () => {
    console.log(`[Fólio API] Servidor ativo em http://localhost:${PORT}`);
  });
});
