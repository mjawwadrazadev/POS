export type CursorStackEntry =
  | { type: "text"; variant: "default" | "permanent" | "accent"; text: string }
  | { type: "image"; src: string; transparent: boolean }
  | { type: "link" }
  | { type: "opposite" };
