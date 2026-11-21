import { Injectable } from '@nestjs/common';
import { getEnv } from '../env';

@Injectable()
export class DatabaseService {
  private get db(): D1Database {
    return getEnv().DB;
  }

  async all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.db.prepare(sql).bind(...params).all<T>();
    return res.results ?? [];
  }

  async first<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const res = await this.db.prepare(sql).bind(...params).first<T>();
    return res ?? null;
  }

  async run(sql: string, params: unknown[] = []): Promise<D1Result> {
    return this.db.prepare(sql).bind(...params).run();
  }

  async batch(statements: { sql: string; params: unknown[] }[]): Promise<unknown> {
    return this.db.batch(statements.map((s) => this.db.prepare(s.sql).bind(...s.params)));
  }
}
