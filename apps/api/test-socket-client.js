const { io } = require("socket.io-client");

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYjg2YjRlYy01OGU1LTQ1NzgtYjk0NC02MjRkNTRlNmJlNmMiLCJpYXQiOjE3ODg5Mjc0NDYsImV4cCI6MTc4ODkyODM0Nn0.2tRDd3hebcLL_45KRLJkxCeLz2e8uDKVlrPZt4hBdUg";
const BOARD_ID = "006eedfc-74d6-48d0-a107-55d8283420be";

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
});

socket.on("connect", () => {
  console.log("Connected! Socket ID:", socket.id);
  socket.emit("join-board", BOARD_ID);
});

socket.onAny((eventName, payload) => {
  console.log("EVENT RECEIVED:", eventName, payload);
});

socket.on("connect_error", (err) => {
  console.log("Connection failed:", err.message);
});