/**
 * Provider registry for the data-enrichment system.
 *
 * The registry holds all registered `DataProvider` instances and exposes
 * lookup helpers used by the `EnrichmentEngine`.
 *
 * @module data/registry
 */

import type { DataProvider } from "./provider";

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class ProviderRegistry {
  private readonly providers = new Map<string, DataProvider>();

  /**
   * Register a data provider. Overwrites any existing provider with the
   * same `id`.
   */
  register(provider: DataProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Retrieve a provider by its unique `id`.
   */
  getProvider(id: string): DataProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Return every provider that lists `category` in its `categories`.
   */
  getProvidersForCategory(category: string): DataProvider[] {
    const result: DataProvider[] = [];
    for (const p of this.providers.values()) {
      if (p.categories.includes(category)) {
        result.push(p);
      }
    }
    return result;
  }

  /**
   * Return a de-duplicated list of all categories covered by every
   * registered provider.
   */
  listCategories(): string[] {
    const cats = new Set<string>();
    for (const p of this.providers.values()) {
      for (const c of p.categories) {
        cats.add(c);
      }
    }
    return [...cats].sort((a, b) => a.localeCompare(b));
  }

  /**
   * Total number of registered providers.
   */
  get size(): number {
    return this.providers.size;
  }
}
