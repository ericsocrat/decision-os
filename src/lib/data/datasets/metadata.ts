/**
 * Shared metadata type used by all bundled datasets.
 *
 * Each dataset module exports a `METADATA` constant conforming to this
 * interface so that consumers can introspect source, freshness, and
 * version without loading the full dataset.
 *
 * @module data/datasets/metadata
 */

export interface DatasetMetadata {
  /** Human-readable dataset name */
  readonly name: string;
  /** Primary data source (e.g. "Numbeo", "World Bank WGI") */
  readonly source: string;
  /** Quarter / date the data was last refreshed */
  readonly updated: string;
  /** Monotonically increasing schema version */
  readonly version: number;
  /** Number of records in the dataset */
  readonly recordCount: number;
  /** Geographic scope description */
  readonly coverage: string;
}
