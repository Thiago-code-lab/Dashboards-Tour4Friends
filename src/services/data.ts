import { validateDataset } from '../lib/validation/dataset';
import type { Dataset } from '../types/domain';

export interface DataRepository {
  load(signal?: AbortSignal): Promise<Dataset>;
}
export class StaticDataRepository implements DataRepository {
  async load(signal?: AbortSignal): Promise<Dataset> {
    const response = await fetch(`${import.meta.env.BASE_URL}data/demo.json`, { signal });
    if (!response.ok) throw new Error(`Não foi possível carregar a base (${response.status}).`);
    return validateDataset(await response.json());
  }
}
export const repository: DataRepository = new StaticDataRepository();
