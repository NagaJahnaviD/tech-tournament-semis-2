// server.js
const exp = require("express");
const app = exp();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

app.use(exp.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const JWT_SECRET = "secret123"; // sample secret for JWT

// ---------------------------
// 💾 In-memory "Database"
// ---------------------------
let users = [
  { id: 1, name: "Admin", email: "admin@example.com", password: "admin123", role: "admin" },
  { id: 2, name: "Alice", email: "alice@example.com", password: "alice123", role: "user" },
  { id: 3, name: "Bob", email: "bob@example.com", password: "bob123", role: "user" },
];

let events = [
  {
    id: 101,
    name: "Tech Conference",
    date: "2025-11-10",
    totalTickets: 100,
    ticketsAvailable: 95,
    attendees: [],
  },
  {
    id: 102,
    name: "Music Fest",
    date: "2025-12-01",
    totalTickets: 50,
    ticketsAvailable: 45,
    attendees: [],
  },
];

let bookings = [];

// ---------------------------
// 🔐 AUTH ROUTES
// ---------------------------

// Register
app.post("/auth/register", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role)
    return res.status(400).send({ message: "All fields are required" });

  const exists = users.find((u) => u.email === email);
  if (exists) return res.status(400).send({ message: "Email already exists" });

  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role,
  };
  users.push(newUser);
  res.status(201).send({ message: "User registered successfully" });
});

// Login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).send({ message: "Email and password required" });

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).send({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  res.send({ message: "Login successful", token });
});

// ---------------------------
// 🎉 EVENTS
// ---------------------------

// Create Event
app.post("/events", (req, res) => {
  const { name, date, totalTickets } = req.body;
  if (!name || !date || !totalTickets)
    return res.status(400).send({ message: "All fields are required" });

  const newEvent = {
    id: Date.now(),
    name,
    date,
    totalTickets,
    ticketsAvailable: totalTickets,
    attendees: [],
  };
  events.push(newEvent);

  res.status(201).send({ message: "Event created successfully", eventId: newEvent.id });
});

// Get all events
app.get("/events", (req, res) => {
  const eventList = events.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    ticketsAvailable: e.ticketsAvailable,
  }));
  res.send(eventList);
});

// Book an event
app.post("/events/:id/book", (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const event = events.find((e) => e.id == id);
  if (!event) return res.status(404).send({ message: "Event not found" });

  if (event.ticketsAvailable <= 0)
    return res.status(400).send({ message: "Event is full" });

  const user = users.find((u) => u.id == userId);
  if (!user) return res.status(404).send({ message: "User not found" });

  const ticketCode = "TICKET-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const booking = {
    id: Date.now(),
    userId: user.id,
    eventId: event.id,
    ticketCode,
    validated: false,
  };
  bookings.push(booking);
  event.attendees.push({ userId: user.id, ticketCode });
  event.ticketsAvailable--;

  res.status(201).send({ message: "Ticket booked successfully", ticketCode });
});

// ---------------------------
// 👤 USER BOOKINGS
// ---------------------------
app.get("/my-bookings", (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send({ message: "userId is required" });

  const userBookings = bookings
    .filter((b) => b.userId == userId)
    .map((b) => {
      const event = events.find((e) => e.id == b.eventId);
      return {
        event: event?.name,
        ticketCode: b.ticketCode,
        validated: b.validated,
      };
    });

  res.send(userBookings);
});

// ---------------------------
// 🎟️ VALIDATE TICKET
// ---------------------------
app.post("/tickets/validate", (req, res) => {
  const { ticketCode } = req.body;
  if (!ticketCode)
    return res.status(400).send({ message: "ticketCode is required" });

  const booking = bookings.find((b) => b.ticketCode === ticketCode);
  if (!booking) return res.status(404).send({ message: "Invalid or already validated" });

  if (booking.validated)
    return res.status(400).send({ message: "Invalid/already validated" });

  booking.validated = true;

  const event = events.find((e) => e.id === booking.eventId);
  const user = users.find((u) => u.id === booking.userId);

  res.send({
    message: "Ticket validated successfully",
    event: event?.name,
    userId: user?.id,
  });
});

// ---------------------------
// 👥 EVENT ATTENDEES
// ---------------------------
app.get("/events/:id/attendees", (req, res) => {
  const { id } = req.params;
  const event = events.find((e) => e.id == id);
  if (!event) return res.status(404).send({ message: "Event not found" });

  const attendeeList = event.attendees.map((a) => {
    const user = users.find((u) => u.id === a.userId);
    return {
      username: user?.name,
      ticketCode: a.ticketCode,
    };
  });

  res.send({ event: event.name, attendees: attendeeList });
});

// ---------------------------
const port = 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
