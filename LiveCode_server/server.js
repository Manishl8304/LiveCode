import "./configenv.js";

import { Server } from "socket.io";
import { randomUUID } from "crypto";

const io = new Server({
  cors: true,
});

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log(`user connect with socked id ${socket.id}`);

  socket.on("create-meeting", ({ email }) => {
    const meetingId = randomUUID();
    console.log(`new meeting requested by ${email} ${socket.id}`);
    socket.emit("created-meeting", { meetingId });
  });

  socket.on("join-room", async ({ email, meetingId }) => {
    console.log(email, "wants to join", meetingId);
    socket.join(meetingId);
    emailToSocketMapping.set(email, socket.id);
    socketToEmailMapping.set(socket.id, email);
    socket.broadcast.to(meetingId).emit("joined-room", { email });

    const socketsInRoom = await io.in(meetingId).fetchSockets();
    console.log(socketsInRoom.map((socket) => socket.id));

    // console.log(email, "wnats to join", meetingId);
  });

  socket.on("call-user", ({ email, offer }) => {
    const fromEmail = socketToEmailMapping.get(socket.id);
    const toSocket = emailToSocketMapping.get(email);
    console.log(`call from ${fromEmail} to ${email}`);
    socket.to(toSocket).emit("incoming-call", { fromEmail, offer });
  });

  socket.on("call-accepted", ({ fromEmail, answer }) => {
    // console.log("here", email);
    const toSocket = emailToSocketMapping.get(fromEmail);

    socket.to(toSocket).emit("call-accepted", {
      fromEmail: socketToEmailMapping.get(socket.id),
      answer,
    });
  });

  socket.on("ice-candidate", ({ email, candidate }) => {
    const targetSocket = emailToSocketMapping.get(email);
    const fromEmail = socketToEmailMapping.get(socket.id);
    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", {
        fromEmail,
        candidate,
      });
    }
  });

  socket.on("code-change", ({ meetingId, code }) => {
    socket.to(meetingId).emit("code-change", { code });
  });

  socket.on("leave-meeting", async ({ meetingId }) => {
    socket.leave(meetingId);
    const email = socketToEmailMapping.get(socket.id);
    const socketsInRoom = await io.in(meetingId).fetchSockets();
    console.log(socketsInRoom.map((socket) => socket.id));
    socket.to(meetingId).emit("user-left", { email });
  });
});
io.listen(8001);
/*
 - express
 - it is a function imported from express lib
 - when called it returns an express object stored in app
 - app obejct is used to start the server at a port
 - app object is used to add middlewares for the api request
*/
import express from "express";
const app = express();

import mongoose from "mongoose";
import userRoutes from "./Routes/userRoutes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

/*
mongoose is an object imported from mongoose library
async mongoose.connect(connection_string) - for connecting to a database
*/
const connectDb = async () => {
  const conn = await mongoose.connect(process.env.mongo_uri);
  console.log("Database connected");
};
await connectDb();

app.use(
  cors({
    origin: true,
    credentials: true, //necessary for cookies
  }),
);

app.use(express.json()); //removes undefined behavior of req.body
app.use(cookieParser()); // mandatory for cookies to travel
app.use("/auth", userRoutes);

app.listen(3000, () => {
  console.log("Server is listening at port 3000");
});
