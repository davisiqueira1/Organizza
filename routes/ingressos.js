const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

router.get("/ingressos", async (req, res) => {
    try {
        const { status, usuarioId, eventoId } = req.query;

        const ingressos = await prisma.ingresso.findMany({
            where: {
                ...(status && { status }),
                ...(usuarioId && { usuarioId }),
                ...(eventoId && { eventoId }),
            },
            include: {
                usuario: { select: { nome: true } },
                evento: { select: { nome: true } },
                cupom: true,
            },
        });

        res.json(ingressos);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ingressos" });
    }
});

router.get("/ingressos/:id", async (req, res) => {
    try {
        const ingresso = await prisma.ingresso.findUnique({
            where: { id: req.params.id },
            include: {
                usuario: true,
                evento: true,
                cupom: true,
            },
        });

        if (!ingresso) {
            return res.status(404).json({ error: "Ingresso não encontrado" });
        }

        res.json(ingresso);
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar ingresso" });
    }
});

router.post("/ingressos", async (req, res) => {
    try {
        const { eventoId, usuarioId, cupomId } = req.body;

        const [usuario, evento] = await Promise.all([
            prisma.usuario.findUnique({ where: { id: usuarioId } }),
            prisma.evento.findUnique({
                where: { id: eventoId },
                include: { ingressos: true },
            }),
        ]);

        if (!usuario || !evento) {
            return res
                .status(404)
                .json({ error: "Usuário ou evento não encontrado" });
        }

        if (evento.ingressosDisponiveis < 1) {
            return res.status(400).json({ error: "Ingressos esgotados" });
        }

        let cupom = null;
        let precoFinal = evento.preco;

        if (cupomId) {
            cupom = await prisma.cupom.findUnique({
                where: { id: cupomId },
            });

            if (cupom && cupom.validoAte >= new Date() && !cupom.usado) {
                if (cupom.tipoDesconto === "PERCENTUAL") {
                    precoFinal = evento.preco * (1 - cupom.valor / 100);
                } else {
                    precoFinal = evento.preco - cupom.valor;
                }

                await prisma.cupom.update({
                    where: { id: cupomId },
                    data: { usado: true },
                });
            }
        }

        const novoIngresso = await prisma.ingresso.create({
            data: {
                status: "VENDIDO",
                usuarioId,
                eventoId,
                cupomId: cupom?.id || null,
            },
        });

        await prisma.evento.update({
            where: { id: eventoId },
            data: { ingressosDisponiveis: { decrement: 1 } },
        });

        res.status(201).json({
            ...novoIngresso,
            precoOriginal: evento.preco,
            precoFinal,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao comprar ingresso" });
    }
});

router.put("/ingressos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const statusValidos = [
            "DISPONIVEL",
            "VENDIDO",
            "UTILIZADO",
            "CANCELADO",
        ];

        if (!statusValidos.includes(status)) {
            return res.status(400).json({ error: "Status inválido" });
        }

        const ingresso = await prisma.ingresso.findUnique({
            where: { id },
            include: { evento: true },
        });

        if (!ingresso) {
            return res.status(404).json({ error: "Ingresso não encontrado" });
        }

        if (ingresso.status === "UTILIZADO" && status !== "UTILIZADO") {
            return res.status(400).json({ error: "Ingresso já utilizado" });
        }

        const ingressoAtualizado = await prisma.ingresso.update({
            where: { id },
            data: { status },
        });

        if (status === "CANCELADO" && ingresso.status !== "CANCELADO") {
            await prisma.evento.update({
                where: { id: ingresso.eventoId },
                data: { ingressosDisponiveis: { increment: 1 } },
            });
        }

        res.json(ingressoAtualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar ingresso" });
    }
});

router.delete("/ingressos/:id", async (req, res) => {
    try {
        const ingresso = await prisma.ingresso.delete({
            where: { id: req.params.id },
        });

        if (ingresso.status !== "UTILIZADO") {
            await prisma.evento.update({
                where: { id: ingresso.eventoId },
                data: { ingressosDisponiveis: { increment: 1 } },
            });
        }

        res.json({ message: "Ingresso removido com sucesso" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao remover ingresso" });
    }
});

module.exports = router;
