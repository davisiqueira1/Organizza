const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

router.get("/eventos", async (req, res) => {
    try {
        const { local, organizadorId, ordenarPor = "data" } = req.query;

        const eventos = await prisma.evento.findMany({
            where: {
                ...(local && { local: { contains: local } }),
                ...(organizadorId && { organizadorId }),
            },
            orderBy: { [ordenarPor]: "asc" },
            include: {
                organizador: { select: { nome: true } },
                cupons: true,
            },
        });

        res.json(
            eventos.map((evento) => ({
                ...evento,
                ingressosDisponiveis: evento.ingressosDisponiveis,
                totalIngressos:
                    evento.ingressosDisponiveis +
                    (evento.ingressos?.length || 0),
            }))
        );
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

router.get("/eventos/:id", async (req, res) => {
    try {
        const evento = await prisma.evento.findUnique({
            where: { id: req.params.id },
            include: {
                organizador: true,
                ingressos: true,
                cupons: true,
            },
        });

        if (!evento) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        res.json({
            ...evento,
            ingressosVendidos: evento.ingressos.length,
            ingressosDisponiveis: evento.ingressosDisponiveis,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar evento" });
    }
});

router.post("/eventos", async (req, res) => {
    try {
        const {
            nome,
            descricao,
            data,
            local,
            preco,
            ingressosDisponiveis,
            organizadorId,
        } = req.body;

        const camposObrigatorios = [
            "nome",
            "descricao",
            "data",
            "local",
            "preco",
            "ingressosDisponiveis",
            "organizadorId",
        ];
        const camposFaltando = camposObrigatorios.filter(
            (campo) => !req.body[campo]
        );

        if (camposFaltando.length > 0) {
            return res.status(400).json({
                error:
                    "Campos obrigatórios faltando: " +
                    camposFaltando.join(", "),
            });
        }

        const organizador = await prisma.usuario.findUnique({
            where: { id: organizadorId },
        });

        if (!organizador) {
            return res
                .status(400)
                .json({ error: "Organizador não encontrado" });
        }

        const novoEvento = await prisma.evento.create({
            data: {
                nome,
                descricao,
                data: new Date(data),
                local,
                preco: parseFloat(preco),
                ingressosDisponiveis: parseInt(ingressosDisponiveis),
                organizadorId,
            },
        });

        res.status(201).json(novoEvento);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar evento" });
    }
});

router.put("/eventos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            descricao,
            data,
            local,
            preco,
            ingressosDisponiveis,
            organizadorId,
        } = req.body;

        const eventoExistente = await prisma.evento.findUnique({
            where: { id },
        });

        if (!eventoExistente) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        if (organizadorId && organizadorId !== eventoExistente.organizadorId) {
            const novoOrganizador = await prisma.usuario.findUnique({
                where: { id: organizadorId },
            });

            if (!novoOrganizador) {
                return res
                    .status(400)
                    .json({ error: "Novo organizador não encontrado" });
            }
        }

        const eventoAtualizado = await prisma.evento.update({
            where: { id },
            data: {
                nome: nome || eventoExistente.nome,
                descricao: descricao || eventoExistente.descricao,
                data: data ? new Date(data) : eventoExistente.data,
                local: local || eventoExistente.local,
                preco: preco ? parseFloat(preco) : eventoExistente.preco,
                ingressosDisponiveis: ingressosDisponiveis
                    ? parseInt(ingressosDisponiveis)
                    : eventoExistente.ingressosDisponiveis,
                organizadorId: organizadorId || eventoExistente.organizadorId,
            },
        });

        res.json(eventoAtualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar evento" });
    }
});

router.delete("/eventos/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const eventoExistente = await prisma.evento.findUnique({
            where: { id },
        });

        if (!eventoExistente) {
            return res.status(404).json({ error: "Evento não encontrado" });
        }

        await prisma.evento.delete({ where: { id } });

        res.json({
            message: "Evento deletado com sucesso",
            ingressosCancelados: eventoExistente.ingressos?.length || 0,
        });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

module.exports = router;