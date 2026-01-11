import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 5;
  private readonly retryDelay = 3000; // 3 seconds

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Attempts to connect to the database with retry logic.
   * Useful for handling temporary connection issues, especially with
   * Supabase pooler or when database is waking up from pause.
   */
  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      this.logger.log(`Attempting database connection (attempt ${attempt}/${this.maxRetries})...`);
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (attempt < this.maxRetries) {
        this.logger.warn(
          `Database connection failed (attempt ${attempt}/${this.maxRetries}): ${errorMessage}. ` +
          `Retrying in ${this.retryDelay / 1000} seconds...`
        );
        
        // Wait before retrying
        await this.sleep(this.retryDelay);
        
        // Exponential backoff: increase delay for each retry
        return this.connectWithRetry(attempt + 1);
      }
      
      this.logger.error(
        `Failed to connect to database after ${this.maxRetries} attempts. ` +
        `Please check:\n` +
        `  1. DATABASE_URL is correct in .env\n` +
        `  2. Database server is running (Supabase project may be paused)\n` +
        `  3. Network/firewall allows connection to database host\n` +
        `  4. Connection pool limits haven't been exceeded`
      );
      
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check method to verify database connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  // Helper method for transactions
  async executeTransaction<T>(
    fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(fn);
  }

  // Clean database (for testing)
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const tablenames = await this.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    const tables = tablenames
      .map(({ tablename }: { tablename: string }) => tablename)
      .filter((name: string) => name !== '_prisma_migrations')
      .map((name: string) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
