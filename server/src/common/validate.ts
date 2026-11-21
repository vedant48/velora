import { BadRequestException } from '@nestjs/common';

export function requireString(value: unknown, name: string, maxLen = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`${name} is required`);
  }
  const v = value.trim();
  if (v.length > maxLen) throw new BadRequestException(`${name} is too long (max ${maxLen})`);
  return v;
}

export function optionalString(value: unknown, name: string, maxLen = 2000): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new BadRequestException(`${name} must be a string`);
  if (value.length > maxLen) throw new BadRequestException(`${name} is too long (max ${maxLen})`);
  return value;
}

export function requireMediaType(value: unknown): 'movie' | 'tv' {
  if (value !== 'movie' && value !== 'tv') throw new BadRequestException('mediaType must be movie or tv');
  return value;
}

export function requireStatus(value: unknown): 'want' | 'watching' | 'watched' {
  if (value !== 'want' && value !== 'watching' && value !== 'watched') {
    throw new BadRequestException('status must be want, watching or watched');
  }
  return value;
}

export function optionalRating(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 10) throw new BadRequestException('rating must be an integer 0-10');
  return n;
}

export function optionalInt(value: unknown, name: string, min = 0, max = 100000): number | null {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequestException(`${name} must be an integer ${min}-${max}`);
  return n;
}

export function requireTmdbId(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new BadRequestException('invalid tmdb id');
  return n;
}
