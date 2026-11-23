import app from './app';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[API Serverless Error]:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(500).json({
        error: 'Erro no servidor ao processar o pedido: ' + (err?.message || String(err)),
      });
    }
  }
}
