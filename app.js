// Ponto de entrada para Hospedagem Hostinger (Passenger)
process.env.NODE_ENV = 'production';

import('./dist/server.cjs').catch(err => {
    console.error("Erro ao iniciar a aplicação a partir do server.cjs:", err);
});

