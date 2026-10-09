export default function initInterviewSocket(io) {
  io.on('connection', (socket) => {
    socket.on('interview:join', ({ candidateId }) => {
      if (candidateId) socket.join(`candidate:${candidateId}`);
    });

    socket.on('employer:join', ({ companyId }) => {
      if (companyId) socket.join(`company:${companyId}`);
    });

    socket.on('interview:answer', async ({ candidateId, answer, questionId }) => {
      if (!candidateId) return;
      const payload = { candidateId, answer, questionId, status: 'received' };
      io.to(`candidate:${candidateId}`).emit('interview:nextQuestion', payload);
    });
  });
}
