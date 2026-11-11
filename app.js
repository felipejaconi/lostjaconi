// Ponto de entrada para plataformas de hospedagem (Hostinger, cPanel, Passenger, Render)
// onde o Entry file ou startup file está configurado como 'app.js'.
import process from 'node:process';
import serverModule, { app as namedApp, startServer } from './dist/server.cjs';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const app = namedApp || serverModule?.app || serverModule?.default || serverModule;

export default app;
export { app, startServer };


