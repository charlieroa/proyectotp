// =============================================
// File: src/utils/cashSession.js
// Apertura de caja "protocolo": opcional/automática y por-usuario.
// Devuelve la sesión OPEN del cajero en la sede; si no existe la crea con base $0.
// Recibe `client` (prisma o el tx de una transacción) para funcionar dentro de
// transacciones existentes.
// =============================================

async function getOrCreateOpenSession(client, tenant_id, user_id) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-cerrar sesiones huérfanas de días anteriores de ESTE cajero,
    // para que un movimiento nuevo nunca se enganche a una caja vieja.
    await client.cash_sessions.updateMany({
        where: { tenant_id, opened_by_user_id: user_id, status: 'OPEN', opened_at: { lt: today } },
        data: { status: 'CLOSED', closed_at: new Date(), difference: 0 }
    });

    let session = await client.cash_sessions.findFirst({
        where: { tenant_id, status: 'OPEN', opened_by_user_id: user_id },
        select: { id: true }
    });

    if (!session) {
        session = await client.cash_sessions.create({
            data: {
                tenant_id,
                opened_by_user_id: user_id,
                initial_amount: 0,
                status: 'OPEN',
                opened_at: new Date()
            },
            select: { id: true }
        });
    }

    return session;
}

module.exports = { getOrCreateOpenSession };
