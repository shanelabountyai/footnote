// Planted-fabrication gate scoring (task 3.3; donor Use-Case Studio `criticFabricationGate`). A plant is caught only
// when the judge marks the planted sentence `unsupported` or `partial`. A control is clean only when every sentence
// is `supported`; a schema-invalid verdict is neither a catch nor clean. Pure: the script makes the calls.
export type GateVerdict = 'supported' | 'partial' | 'unsupported' | 'schema_invalid';
export type GateFixture = { id: string; kind: string; plantedIndex: number | null };
/** Verdicts per fixture id, indexed by sentence. A planted fixture needs only its planted sentence judged. */
export type GateVerdicts = Record<string, (GateVerdict | undefined)[]>;

export const GATE_TARGET = 0.95;

export function scoreGate(fixtures: GateFixture[], verdicts: GateVerdicts) {
  const planted = fixtures.filter((f) => f.kind !== 'control');
  const controls = fixtures.filter((f) => f.kind === 'control');
  const vOf = (f: GateFixture, i: number) => {
    const v = verdicts[f.id]?.[i];
    if (!v) throw new Error(`gate: no verdict for ${f.id} sentence ${i}`);
    return v;
  };
  const missed = planted.filter((f) => !['unsupported', 'partial'].includes(vOf(f, f.plantedIndex!))).map((f) => f.id);
  const condemned = controls.filter((f) => (verdicts[f.id] ?? []).length === 0 || verdicts[f.id]!.some((v, i) => vOf(f, i) !== 'supported')).map((f) => f.id);
  const byKind: Record<string, { caught: number; n: number }> = {};
  for (const f of planted) {
    const k = (byKind[f.kind] ??= { caught: 0, n: 0 });
    k.n++;
    if (!missed.includes(f.id)) k.caught++;
  }
  const caught = planted.length - missed.length;
  const rate = planted.length ? caught / planted.length : 0;
  return { caught, n: planted.length, rate, missed, byKind, condemned, controls: controls.length, pass: rate >= GATE_TARGET && condemned.length === 0 };
}
