import { prisma } from "@/infra/db/prisma";
import {
  PrismaAuditLog,
  PrismaFxRateRepository,
  PrismaParameterSetRepository,
  PrismaTariffRuleRepository,
} from "@/modules/parameters/infra/prisma-repositories";
import type { ParametersDeps } from "@/modules/parameters";
import type { AccountPorts, UsersDeps } from "@/modules/identity";
import { createAccountPorts } from "@/modules/identity/infra/prisma-account-adapters";
import { createMailer } from "@/modules/identity/infra/mailers";
import type { QuoteRepository, QuotingRepositories } from "@/modules/quoting";
import { createQuotingRepositories } from "@/modules/quoting/infra/prisma-quoting-repositories";
import { createQuoteRepository } from "@/modules/quoting/infra/prisma-quote-repository";
import { PrismaUserRepository } from "@/modules/identity/infra/prisma-user-repository";

/**
 * EL COMPOSITION ROOT.
 *
 * El único archivo del proyecto que sabe qué adaptadores concretos existen.
 * Todo lo demás depende de las interfaces que define el dominio, y por eso los
 * casos de uso se prueban con dobles en memoria: cambiar Prisma por otra cosa,
 * o el proveedor de TRM, toca solo estas líneas.
 */

export const parametersDeps: ParametersDeps = {
  sets: new PrismaParameterSetRepository(prisma),
  tariffs: new PrismaTariffRuleRepository(prisma),
  fx: new PrismaFxRateRepository(prisma),
  audit: new PrismaAuditLog(prisma),
};

export const usersDeps: UsersDeps = {
  users: new PrismaUserRepository(prisma),
  audit: new PrismaAuditLog(prisma),
};

export const accountPorts: AccountPorts = createAccountPorts(prisma, {
  users: usersDeps.users,
  mailer: createMailer(),
});

export const quotingRepositories: QuotingRepositories =
  createQuotingRepositories(prisma);

export const quoteRepository: QuoteRepository = createQuoteRepository(prisma);
