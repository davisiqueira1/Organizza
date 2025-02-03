const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()
const app = express();

const eventRoutes = require('./routes/events');
const userRoutes = require('./routes/usuarios');
const ticketRoutes = require('./routes/ingressos');
// const couponRoutes = require('./routes/cupons');

app.use(express.json());

app.use(eventRoutes);
app.use(userRoutes);
app.use(ticketRoutes);
// app.use(couponRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});