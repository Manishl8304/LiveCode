import "./configenv.js";

/*
 - express
 - it is a function imported from express lib
 - when called it returns an express object stored in app
 - app obejct is used to start the server at a port
 - app object is used to add middlewares for the api request
*/

import express from "express";
import http from "http";
const app = express();

import mongoose from "mongoose";
import userRoutes from "./Routes/userRoutes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const server = http.createServer(app);
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
    origin: process.env.frontend_url,
    credentials: true, //necessary for cookies
  }),
);

app.use(express.json()); //removes undefined behavior of req.body
app.use(cookieParser()); // mandatory for cookies to travel
app.use("/auth", userRoutes);

server.listen(8000, () => {
  console.log("Server is listening at port 8000");
});
import { Server } from "socket.io";
import { randomUUID } from "crypto";

const io = new Server(server, {
  cors: {
    origin: process.env.frontend_url,
    credentials: true,
  },
});

const emailToSocketMapping = new Map();
const socketToEmailMapping = new Map();

io.on("connection", (socket) => {
  console.log(`user connect with socked id ${socket.id}`);

  /*
  Input: None
  Output: emits meeting Id
  Description: creates a randomString using randomUUID function
  */
  socket.on("create-meeting", () => {
    const meetingId = randomUUID();
    socket.emit("created-meeting", { meetingId });
  });

  /*
  Input: email( user who wants to join the meeting), meetingId(meeting Room which email want to join)
  Output: emits new joined email to all person in meeting
  Description: 
    - uses socket.join() to join
    - updates socket->email map
    - updates email->socket map
  */
  socket.on("join-room", async ({ email, meetingId }) => {
    socket.join(meetingId);
    emailToSocketMapping.set(email, socket.id);
    socketToEmailMapping.set(socket.id, email);
    socket.broadcast.to(meetingId).emit("joined-room", { email });
  });

  /*
  Input: email(call for), offer
  Output: emits incoming call to email provided
  Description: 
    - emits incoming call to email
  */
  socket.on("call-user", ({ email, offer }) => {
    const fromEmail = socketToEmailMapping.get(socket.id);
    const toSocket = emailToSocketMapping.get(email);
    socket.to(toSocket).emit("incoming-call", { fromEmail, offer });
  });

  socket.on("call-accepted", ({ fromEmail, answer }) => {
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
    socket.to(meetingId).emit("user-left", { email });
  });
});
