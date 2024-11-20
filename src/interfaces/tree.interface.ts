export interface TreeElement {
  fid: number;
  key: `0x${string}`;
  path?: `0x${string}`[];
}

export interface Tree {
  elements: TreeElement[];
  root: `0x${string}` | null;
  legacy_roots: `0x${string}`[];
}