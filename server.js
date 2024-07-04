const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('createRoom', () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomCode, { players: [socket.id], game: initializeChessGame() });
    socket.join(roomCode);
    socket.emit('roomCreated', roomCode);
  });

  socket.on('joinRoom', (roomCode) => {
    if (rooms.has(roomCode) && rooms.get(roomCode).players.length < 2) {
      rooms.get(roomCode).players.push(socket.id);
      socket.join(roomCode);
      socket.emit('roomJoined', roomCode);
      io.to(roomCode).emit('gameStart', rooms.get(roomCode).game);
    } else {
      socket.emit('roomError', 'Room not found or full');
    }
  });
  socket.on('makeMove', ({ roomCode, move }) => {
    if (rooms.has(roomCode)) {
        const room = rooms.get(roomCode);
        const game = room.game;
        const { from, to } = move;

        function isValidMove(game, from, to) {
          const [fromRow, fromCol] = from;
          const [toRow, toCol] = to;
          const piece = game.board[fromRow][fromCol];
      
          if (!piece) return false;
          if (piece.toLowerCase() === piece && game.turn === 'white') return false;
          if (piece.toUpperCase() === piece && game.turn === 'black') return false;
      
          const targetPiece = game.board[toRow][toCol];
          if (targetPiece) {
              if (piece.toLowerCase() === piece && targetPiece.toLowerCase() === targetPiece) return false;
              if (piece.toUpperCase() === piece && targetPiece.toUpperCase() === targetPiece) return false;
          }
      
          const rowDiff = Math.abs(toRow - fromRow);
          const colDiff = Math.abs(toCol - fromCol);
      
          switch (piece.toLowerCase()) {
              case 'p': // Pawn
                  if (piece === 'P') {
                      return (toRow === fromRow - 1 && toCol === fromCol && !targetPiece) ||
                             (toRow === fromRow - 1 && Math.abs(toCol - fromCol) === 1 && targetPiece);
                  } else {
                      return (toRow === fromRow + 1 && toCol === fromCol && !targetPiece) ||
                             (toRow === fromRow + 1 && Math.abs(toCol - fromCol) === 1 && targetPiece);
                  }
              case 'r': // Rook
                  return (fromRow === toRow || fromCol === toCol) && !hasObstacle(game.board, from, to);
              case 'n': // Knight
                  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
              case 'b': // Bishop
                  return rowDiff === colDiff && !hasObstacle(game.board, from, to);
              case 'q': // Queen
                  return (fromRow === toRow || fromCol === toCol || rowDiff === colDiff) && !hasObstacle(game.board, from, to);
              case 'k': // King
                  return rowDiff <= 1 && colDiff <= 1;
              default:
                  return false;
          }
      }
      
      function hasObstacle(board, from, to) {
          const [fromRow, fromCol] = from;
          const [toRow, toCol] = to;
          const rowStep = Math.sign(toRow - fromRow);
          const colStep = Math.sign(toCol - fromCol);
      
          let currentRow = fromRow + rowStep;
          let currentCol = fromCol + colStep;
      
          while (currentRow !== toRow || currentCol !== toCol) {
              if (board[currentRow][currentCol]) return true;
              currentRow += rowStep;
              currentCol += colStep;
          }
      
          return false;
      } }
});

  socket.on('disconnect', () => {
    console.log('User disconnected');
    // Handle player disconnection and clean up rooms
  });
});

function initializeChessGame() {
  return {
    board: [
      ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'],
      ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r']
    ],
    turn: 'white'
  };
}
function isValidMove(game, from, to) {
    const [fromRow, fromCol] = from;
    const [toRow, toCol] = to;
    const piece = game.board[fromRow][fromCol];

    if (!piece) return false;
    if (piece.toLowerCase() === piece && game.turn === 'white') return false;
    if (piece.toUpperCase() === piece && game.turn === 'black') return false;

    const targetPiece = game.board[toRow][toCol];
    if (targetPiece) {
        if (piece.toLowerCase() === piece && targetPiece.toLowerCase() === targetPiece) return false;
        if (piece.toUpperCase() === piece && targetPiece.toUpperCase() === targetPiece) return false;
    }

    return true;
}

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});