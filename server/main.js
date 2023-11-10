import cors from "@fastify/cors";
import Fastify from "fastify";
import { Server } from "socket.io";

import { CombinedIO } from "./combinedIO.js";
import { Line } from "./line.js";
import { LongPollIO } from "./longPollIO.js";
import { Pencil } from "./pencil.js";

const pencils = {};
const lines = [];

const fastify = Fastify({
  logger: true,
});

fastify.register(cors, { origin: true });

const socketIOServer = new Server({ cors: { origin: "*" } });

const longPollIO = new LongPollIO();

const combinedIO = new CombinedIO(longPollIO, socketIOServer);

fastify.get("/", (request, reply) => {
  reply.send({
    lines,
    pencils,
  });
});

fastify.get("/poll", (request, reply) => {
  return new Promise((resolve) => {
    longPollIO.pollListeners.push(function listener({ event, data }) {
      reply.send({ event, data });
      resolve();
      longPollIO.pollListeners.splice(
        longPollIO.pollListeners.indexOf(listener),
        1
      );
    });
  });
});

fastify.post("/emit", (request, reply) => {
  const { event, data } = request.body;
  longPollIO.handleEvent(event, data);
  reply.send({ message: "ok" });
});

combinedIO.on("move", ({ position, username }) => {
  const linesToUpdate = [];
  if (pencils[username]) {
    pencils[username].position = position;
    if (pencils[username].currentLine) {
      pencils[username].currentLine.addPoint(position);
      linesToUpdate.push(pencils[username].currentLine);
    }
  } else {
    pencils[username] = new Pencil(position, username);
  }

  combinedIO.emit("update", { lines: linesToUpdate, pencils });
});

combinedIO.on("down", ({ position, color, username }) => {
  pencils[username].currentLine = new Line(position, color);
  lines.push(pencils[username].currentLine);

  combinedIO.emit("update", {
    lines: [pencils[username].currentLine],
    pencils,
  });
});

combinedIO.on("up", ({ username }) => {
  pencils[username].currentLine = null;
});

combinedIO.on("clear", () => {
  lines.splice(0);
  for (const pencilId in pencils) {
    pencils[pencilId].currentLine = null;
  }
  combinedIO.emit("clear");
});

combinedIO.on("leave", ({ username }) => {
  if (pencils[username]) {
    delete pencils[username];
  }

  combinedIO.emit("update", { pencils, lines: [] });
});

combinedIO.init();

socketIOServer.listen(5000);
fastify.listen({ port: 8000 });
