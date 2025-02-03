<h1 align="center">
    Ticket System API
</h1>
<p align="center">
    Davi Silveira Siqueira<br>
    Thiago Melato Fonseca<br>
    GAC116-10A
</p>

## Built with

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)

## Prerequisites

- [Node.js](https://nodejs.org/) (18.x+)
- [npm](https://www.npmjs.com/) (9.x+)

## Setup environment

1. Clone the repository
```bash
git clone https://github.com/davisiqueira1/ticket-system-api.git
cd ticket-system-api
```

2. Install dependencies
```bash
npm install
```

3. Run the database migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Run the server
```bash
node app.js
```

## Examples

**User creation**
```bash
curl -X POST -H "Content-Type: application/json" -d '{
  "nome": "Fulano Silva",
  "email": "fulano@example.com",
  "senha": "123456"
}' http://localhost:3000/usuarios
```

**Event creation**
```bash
curl -X POST -H "Content-Type: application/json" -d '{
  "nome": "Show Internacional",
  "descricao": "Evento Musical",
  "data": "2024-12-31T20:00:00Z",
  "local": "Estádio",
  "preco": 250.75,
  "ingressosDisponiveis": 5000,
  "organizadorId": "ID_DO_USUARIO"
}' http://localhost:3000/eventos
```
