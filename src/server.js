const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Armazenar jogadores por sala
const rooms = {};

io.on("connection", (socket) => {
  console.log("Um jogador entrou no jogo.");

  // Evento para entrar na sala
  socket.on("joinRoom", (roomData) => {
    const { room, playerId, playerName } = roomData;

    // Se a sala não existir, inicializa
    if (!rooms[room]) {
      rooms[room] = { players: [] };
    }

    // Verifica se a sala está cheia
    if (rooms[room].players.length >= 4) {
      socket.emit("roomFull");
      return;
    }

    // Adicionar o jogador à sala
    rooms[room].players.push({ id: playerId, name: playerName });
    socket.join(room);

    // Enviar uma mensagem a todos na sala
    io.to(room).emit("playerJoined", {
      playerId,
      players: rooms[room].players,
    });

    console.log(`Jogador ${playerName} (${playerId}) entrou na sala ${room}`);
  });

  // Evento para a jogada
  socket.on("jogada", (room, dadosJogada) => {
    const { carta, playerId } = dadosJogada;

    // Verifica se a sala existe e se possui jogadores
    if (rooms[room]) {
      const playerExists = rooms[room].players.find(
        (player) => player.id === playerId
      );

      if (playerExists) {
        // Emitir a atualização para todos os jogadores na sala
        io.to(room).emit("atualizacaoJogo", {
          carta,
          playerId,
          playerName: playerExists.name,
        });
        console.log(
          `Jogada ${carta} realizada pelo jogador ${playerExists.name} (${playerId}) na sala ${room}`
        );
      } else {
        console.error(`Jogador ${playerId} não encontrado na sala ${room}`);
      }
    } else {
      console.error(`Sala ${room} não encontrada`);
    }
  });

  // Evento para desconexão
  socket.on("disconnect", () => {
    console.log("Um jogador saiu do jogo.");

    // Remove o jogador de todas as salas
    for (const room in rooms) {
      rooms[room].players = rooms[room].players.filter((player) => {
        if (player.id === socket.id) {
          io.to(room).emit("playerLeft", socket.id);
          console.log(
            `Jogador ${player.name} (${socket.id}) saiu da sala ${room}`
          );
          return false; // Remove o jogador
        }
        return true; // Mantém o jogador
      });
    }
  });
});

// Inicializa o servidor
server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
