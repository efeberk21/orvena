// Vercel runs the same validated protocol routes as the persistent local server.
process.env.ORVENA_DEPLOYMENT = 'vercel';
export default {
  async fetch(request) {
    const { default: handler } = await import('../apps/relayer/dist/vercel.bundle.mjs');
    return handler.fetch(request);
  }
};
