const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

let waitingPlayer = null;

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);

  if (waitingPlayer) {
    // Crear una sala única con ambos jugadores
    const room = `room-${waitingPlayer.id}-${socket.id}`;
    socket.join(room);
    waitingPlayer.socket.join(room);

    // Guardar sus movimientos
    const players = {
      [waitingPlayer.id]: { socket: waitingPlayer.socket, move: null },
      [socket.id]: { socket: socket, move: null }
    };

    // Asociar sala y jugadores
    startGame(room, players);

    // Limpiar estado de espera
    waitingPlayer = null;
  } else {
    waitingPlayer = { id: socket.id, socket };
    socket.emit('wait');
  }

  socket.on('disconnect', () => {
    console.log('Jugador desconectado:', socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
  });
});

function startGame(room, players) {
  console.log(`Iniciando partida en ${room}`);
  io.to(room).emit('gameStart');

  const playerMoves = {};

  for (const playerId in players) {
    const playerSocket = players[playerId].socket;
    playerSocket.on('playMove', (move) => {
      playerMoves[playerId] = move;

      // Cuando ambos juegan, se calcula el resultado
      if (Object.keys(playerMoves).length === 2) {
        const [id1, id2] = Object.keys(playerMoves);
        const move1 = playerMoves[id1];
        const move2 = playerMoves[id2];
        const result = getResult(move1, move2);

        players[id1].socket.emit('result', {
          yourMove: move1,
          opponentMove: move2,
          result: result[0]
        });

        players[id2].socket.emit('result', {
          yourMove: move2,
          opponentMove: move1,
          result: result[1]
        });

        // Cerrar sala (opcional: podés reiniciar la partida en lugar de terminarla)
        for (const id in players) {
          players[id].socket.leave(room);
        }
      }
    });
  }
}

function getResult(m1, m2) {
  if (m1 === m2) return ['Empate', 'Empate'];
  if (
    (m1 === 'piedra' && m2 === 'tijera') ||
    (m1 === 'papel' && m2 === 'piedra') ||
    (m1 === 'tijera' && m2 === 'papel')
  ) return ['Ganaste', 'Perdiste'];
  return ['Perdiste', 'Ganaste'];
}

http.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
//fs
