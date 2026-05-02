// WHY: @Injectable() marks this class as a NestJS provider so it can be injected into any service that needs database access (e.g. AuthService, ProductsService).
// WHY: OnModuleInit is a lifecycle interface — NestJS calls onModuleInit() automatically when the application starts up.
// WHY: OnModuleDestroy is a lifecycle interface — NestJS calls onModuleDestroy() automatically when the application shuts down gracefully.
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// WHY: PrismaClient is the auto-generated database client — Prisma reads your schema.prisma file and generates this class with type-safe methods for every model (user, product, order, etc.).
import { PrismaClient } from '@prisma/client';

// WHY: We extend PrismaClient so that PrismaService IS a PrismaClient — meaning every service that injects PrismaService can directly call methods like this.prisma.user.findMany() without any extra wiring.
// WHY: Implementing OnModuleInit and OnModuleDestroy lets us hook into NestJS's startup/shutdown lifecycle to manage the database connection properly.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // WHY: onModuleInit() is called by NestJS automatically when the module is loaded during app startup — this is the right place to open the database connection.
  async onModuleInit() {
    // WHY: this.$connect() opens the connection pool to PostgreSQL — without this call, Prisma lazily connects on the first query which can cause delays and undetected config errors.
    await this.$connect();
  }

  // WHY: onModuleDestroy() is called by NestJS automatically when the app receives a shutdown signal (e.g. CTRL+C or a Kubernetes pod stop) — this lets us clean up resources gracefully.
  async onModuleDestroy() {
    // WHY: this.$disconnect() closes all open database connections in the pool — prevents connection leaks and ensures the process exits cleanly.
    await this.$disconnect();
  }
}
