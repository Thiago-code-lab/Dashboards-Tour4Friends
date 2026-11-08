import { validateDataset } from '../lib/validation/dataset';
import type { Dataset } from '../types/domain';
import type { ApiClient } from './api';

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
export class ApiDataRepository implements DataRepository {
  constructor(private readonly client: ApiClient) {}
  async load(signal?: AbortSignal): Promise<Dataset> {
    const payload = await this.client.get<unknown>('/dataset', signal);
    try {
      return validateDataset(payload);
    } catch {
      throw new Error(
        'A resposta da API não segue o contrato da base ou possui vínculos inconsistentes. Corrija os registros e tente carregar novamente.',
      );
    }
  }
}
