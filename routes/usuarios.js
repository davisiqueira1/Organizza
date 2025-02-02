const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

router.get("/usuarios", async (req, res) => {
    try {
        const { tipo } = req.query;
        const where = tipo ? { tipo } : {};

        const usuarios = await prisma.usuario.findMany({
            where,
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true,
                criadoEm: true,
            },
        });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});

router.get("/usuarios/:id", async (req, res) => {
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: req.params.id },
            include: {
                ingressos: true,
                cupons: true,
                eventos: true,
            },
        });

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar usuário" });
    }
});

router.post("/usuarios", async (req, res) => {
    try {
        const { nome, email, senha, tipo = "USUARIO" } = req.body;

        if (!nome || !email || !senha) {
            return res
                .status(400)
                .json({ error: "Campos obrigatórios faltando" });
        }

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email },
        });

        if (usuarioExistente) {
            return res.status(400).json({ error: "Email já cadastrado" });
        }

        const novoUsuario = await prisma.usuario.create({
            data: { nome, email, senha, tipo },
        });

        res.status(201).json({
            id: novoUsuario.id,
            nome: novoUsuario.nome,
            email: novoUsuario.email,
            tipo: novoUsuario.tipo,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar usuário" });
    }
});

router.put("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, senha, tipo } = req.body;

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id },
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        if (email && email !== usuarioExistente.email) {
            const emailEmUso = await prisma.usuario.findUnique({
                where: { email },
            });
            if (emailEmUso) {
                return res.status(400).json({ error: "Email já está em uso" });
            }
        }

        const usuarioAtualizado = await prisma.usuario.update({
            where: { id },
            data: {
                nome: nome || usuarioExistente.nome,
                email: email || usuarioExistente.email,
                senha: senha || usuarioExistente.senha,
                tipo: tipo || usuarioExistente.tipo,
            },
        });

        res.json({
            id: usuarioAtualizado.id,
            nome: usuarioAtualizado.nome,
            email: usuarioAtualizado.email,
            tipo: usuarioAtualizado.tipo,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
});

router.delete("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const usuarioExistente = await prisma.usuario.findUnique({
            where: { id },
        });

        if (!usuarioExistente) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        await prisma.usuario.delete({ where: { id } });

        res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao deletar usuário" });
    }
});

module.exports = router;
