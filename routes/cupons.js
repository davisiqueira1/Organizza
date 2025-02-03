const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

router.get("/cupons", async (req, res) => {
    try {
        const { usado, eventoId, tipoDesconto, valido } = req.query;

        const where = {
            ...(usado !== undefined && { usado: usado === "true" }),
            ...(eventoId && { eventoId }),
            ...(tipoDesconto && { tipoDesconto }),
        };

        if (valido === "true") {
            where.validoAte = { gte: new Date() };
            where.usado = false;
        }

        const cupons = await prisma.cupom.findMany({
            where,
            include: {
                criadoPor: { select: { nome: true } },
                evento: { select: { nome: true } },
            },
        });

        res.json(
            cupons.map((cupom) => ({
                ...cupom,
                valido: cupom.validoAte > new Date() && !cupom.usado,
            }))
        );
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar cupons" });
    }
});

router.get("/cupons/:id", async (req, res) => {
    try {
        const cupom = await prisma.cupom.findUnique({
            where: { id: req.params.id },
            include: {
                criadoPor: true,
                evento: true,
                ingressos: true,
            },
        });

        if (!cupom) {
            return res.status(404).json({ error: "Cupom não encontrado" });
        }

        res.json({
            ...cupom,
            valido: cupom.validoAte > new Date() && !cupom.usado,
            vezesUtilizado: cupom.ingressos.length,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar cupom" });
    }
});

router.post("/cupons", async (req, res) => {
    try {
        const {
            codigo,
            tipoDesconto,
            valor,
            validoAte,
            criadoPorId,
            eventoId,
        } = req.body;

        const camposObrigatorios = [
            "tipoDesconto",
            "valor",
            "validoAte",
            "criadoPorId",
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

        if (!["PERCENTUAL", "FIXO"].includes(tipoDesconto)) {
            return res.status(400).json({ error: "Tipo de desconto inválido" });
        }

        if (valor <= 0 || (tipoDesconto === "PERCENTUAL" && valor > 100)) {
            return res
                .status(400)
                .json({ error: "Valor do desconto inválido" });
        }

        let codigoFinal =
            codigo || Math.random().toString(36).substr(2, 8).toUpperCase();

        const cupomExistente = await prisma.cupom.findFirst({
            where: { codigo: codigoFinal },
        });

        if (cupomExistente) {
            return res.status(400).json({ error: "Código do cupom já existe" });
        }

        const [criador, evento] = await Promise.all([
            prisma.usuario.findUnique({ where: { id: criadoPorId } }),
            eventoId
                ? prisma.evento.findUnique({ where: { id: eventoId } })
                : Promise.resolve(null),
        ]);

        if (!criador) {
            return res
                .status(404)
                .json({ error: "Usuário criador não encontrado" });
        }

        const novoCupom = await prisma.cupom.create({
            data: {
                codigo: codigoFinal,
                tipoDesconto,
                valor: parseFloat(valor),
                validoAte: new Date(validoAte),
                criadoPorId,
                eventoId,
                usado: false,
            },
        });

        res.status(201).json(novoCupom);
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar cupom" });
    }
});

router.put("/cupons/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cupom = await prisma.cupom.findUnique({ where: { id } });

        if (!cupom) {
            return res.status(404).json({ error: "Cupom não encontrado" });
        }

        if (cupom.usado) {
            return res
                .status(400)
                .json({ error: "Cupom já utilizado não pode ser alterado" });
        }

        const dadosAtualizacao = {};

        if (req.body.validoAte)
            dadosAtualizacao.validoAte = new Date(req.body.validoAte);
        if (req.body.valor) dadosAtualizacao.valor = parseFloat(req.body.valor);
        if (req.body.eventoId) dadosAtualizacao.eventoId = req.body.eventoId;

        const cupomAtualizado = await prisma.cupom.update({
            where: { id },
            data: dadosAtualizacao,
        });

        res.json(cupomAtualizado);
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar cupom" });
    }
});

router.delete("/cupons/:id", async (req, res) => {
    try {
        const cupom = await prisma.cupom.delete({
            where: { id: req.params.id },
            include: { ingressos: true },
        });

        res.json({
            message: "Cupom removido com sucesso",
            vezesUtilizado: cupom.ingressos.length,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao remover cupom" });
    }
});

router.post("/cupons/validar", async (req, res) => {
    try {
        const { codigo, eventoId } = req.body;

        const cupom = await prisma.cupom.findFirst({
            where: { codigo },
            include: { evento: true },
        });

        if (!cupom) {
            return res
                .status(404)
                .json({ valid: false, error: "Cupom não encontrado" });
        }

        const validacoes = {
            valido: cupom.validoAte > new Date(),
            naoUtilizado: !cupom.usado,
            eventoCompativel: !cupom.eventoId || cupom.eventoId === eventoId,
        };

        const valido = Object.values(validacoes).every((v) => v);

        res.json({
            valido,
            detalhes: {
                ...validacoes,
                tipoDesconto: cupom.tipoDesconto,
                valorDesconto: cupom.valor,
            },
        });
    } catch (error) {
        res.status(500).json({ error: "Erro ao validar cupom" });
    }
});

module.exports = router;