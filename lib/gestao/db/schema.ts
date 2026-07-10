import { pgTable, serial, text, boolean, integer, numeric, timestamp, date } from "drizzle-orm/pg-core"

export const categorias = pgTable("categorias", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const turmas = pgTable("turmas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  categoriaId: integer("categoria_id"),
  professor: text("professor"),
  diasSemana: text("dias_semana"),
  horario: text("horario"),
  quadra: text("quadra"),
  valorMensalidade: numeric("valor_mensalidade").notNull().default("0"),
  diaVencimento: integer("dia_vencimento").notNull().default(10),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const atletas = pgTable("atletas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cpf: text("cpf"),
  telefone: text("telefone"),
  email: text("email"),
  dataNascimento: date("data_nascimento"),
  categoriaId: integer("categoria_id"),
  turmaId: integer("turma_id"),
  fotoUrl: text("foto_url"),
  responsavel: text("responsavel"),
  telefoneResponsavel: text("telefone_responsavel"),
  valorMensalidade: numeric("valor_mensalidade").notNull().default("0"),
  descontoTipo: text("desconto_tipo").notNull().default("nenhum"),
  descontoValor: numeric("desconto_valor").notNull().default("0"),
  bolsista: boolean("bolsista").notNull().default(false),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const presencas = pgTable("presencas", {
  id: serial("id").primaryKey(),
  atletaId: integer("atleta_id").notNull(),
  turmaId: integer("turma_id"),
  data: date("data").notNull(),
  status: text("status").notNull().default("presente"),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const mensalidades = pgTable("mensalidades", {
  id: serial("id").primaryKey(),
  atletaId: integer("atleta_id").notNull(),
  turmaId: integer("turma_id"),
  competencia: text("competencia").notNull(),
  valor: numeric("valor").notNull().default("0"),
  desconto: numeric("desconto").notNull().default("0"),
  dataVencimento: date("data_vencimento").notNull(),
  dataPagamento: date("data_pagamento"),
  status: text("status").notNull().default("pendente"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})
