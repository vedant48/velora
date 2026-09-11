import { proxyGet } from './client';
import { PersonDetail, PersonCombinedCredits } from './types';

export async function getPersonDetails(
  personId: number,
  signal?: AbortSignal
): Promise<PersonDetail> {
  return proxyGet<PersonDetail>(`/v1/tmdb/3/person/${personId}`, { signal });
}

export async function getPersonCombinedCredits(
  personId: number,
  signal?: AbortSignal
): Promise<PersonCombinedCredits> {
  return proxyGet<PersonCombinedCredits>(
    `/v1/tmdb/3/person/${personId}/combined_credits`,
    { signal }
  );
}
