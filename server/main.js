import { Server } from "socket.io";
import Fastify from "fastify";
import cors from "@fastify/cors";

import { Pencil } from "./pencil.js";
import { Line } from "./line.js";

const pencils = {};
const lines = [];

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, { origin: true });

fastify.get("/", () => {
  return {
    lines,
    pencils,
  };
});

const io = new Server({ cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("move", ({ position, username }) => {
    const linesToUpdate = [];
    if (pencils[socket.id]) {
      pencils[socket.id].position = position;
      if (pencils[socket.id].currentLine) {
        pencils[socket.id].currentLine.addPoint(position);
        linesToUpdate.push(pencils[socket.id].currentLine);
      }
    } else {
      pencils[socket.id] = new Pencil(position, username);
    }

    io.emit("update", { lines: linesToUpdate, pencils });
  });

  socket.on("down", ({ position, color }) => {
    pencils[socket.id].currentLine = new Line(position, color);
    lines.push(pencils[socket.id].currentLine);

    io.emit("update", { lines: [pencils[socket.id].currentLine], pencils });
  });

  socket.on("up", () => {
    pencils[socket.id].currentLine = null;
  });

  socket.on("clear", () => {
    lines.splice(0);
    for (const pencilId in pencils) {
      pencils[pencilId].currentLine = null;
    }
    io.emit("clear");
  });

  socket.on("disconnect", () => {
    if (pencils[socket.id]) {
      delete pencils[socket.id];
    }

    io.emit("update", { pencils, lines: [] });
  });
});

io.listen(5000);
fastify.listen({ port: 8000 });
