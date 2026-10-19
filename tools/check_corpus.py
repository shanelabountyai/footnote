#!/usr/bin/env python3
"""corpus:check — recompute hashes of corpus/text/** and corpus/private/** against corpus/manifest.json.

Exit 1 on any drift, on a manifest without hashes ("no hashes"), or on a private memo whose
front-matter is missing a field or carries a tier outside {public, staff, engagement, partner} (D-11).
Prints the snapshot id (D-9): sha256 over the sorted document hashes plus the private-tier file hashes.
"""
import hashlib, json, re, sys
from pathlib import Path
from check_golden import check_golden

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "corpus" / "manifest.json"
TEXT, PRIVATE = ROOT / "corpus" / "text", ROOT / "corpus" / "private"
TIERS = {"public", "staff", "engagement", "partner"}
REQUIRED = ("docId", "title", "tier", "revisionDate", "clientRef")

def text_hash(doc_dir: Path) -> str:
    h = hashlib.sha256()
    for p in sorted(doc_dir.iterdir()):
        h.update(p.name.encode()); h.update(b"\0"); h.update(p.read_bytes()); h.update(b"\0")
    return h.hexdigest()

def front_matter(path: Path) -> dict:
    m = re.match(r"---\n(.*?)\n---\n", path.read_text(), re.S)
    if not m:
        return {}
    fm = {}
    for line in m.group(1).splitlines():
        k, _, v = line.partition(":")
        if k.strip():
            fm[k.strip()] = v.split("#", 1)[0].strip().strip('"')
    return fm

def main(update: bool) -> int:
    manifest = json.loads(MANIFEST.read_text())
    errors, doc_hashes = [], []
    if any(d["sha256"] is None for d in manifest["documents"]):
        print("corpus:check FAIL — manifest has no hashes; run `npm run corpus:fetch` first"); return 1
    for d in manifest["documents"]:
        doc_hashes.append(d["sha256"])
        out = TEXT / d["docId"]
        if not out.is_dir():
            errors.append(f"{d['docId']}: corpus/text/{d['docId']} missing"); continue
        n = len(list(out.glob("*.txt")))
        if n != d["pages"]:
            errors.append(f"{d['docId']}: {n} page files != manifest pages {d['pages']}")
        if text_hash(out) != d["textSha256"]:
            errors.append(f"{d['docId']}: extracted text differs from manifest textSha256")
    private, seen = manifest.setdefault("private", {}), {}
    for p in sorted(PRIVATE.rglob("*.md")) if PRIVATE.exists() else []:
        rel = str(p.relative_to(ROOT / "corpus"))
        fm = front_matter(p)
        missing = [k for k in REQUIRED if k not in fm]
        if missing:
            errors.append(f"{rel}: front-matter missing {missing}")
        elif fm["tier"] not in TIERS:
            errors.append(f"{rel}: tier '{fm['tier']}' not in {sorted(TIERS)}")
        seen[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    if update:
        manifest["private"] = seen
        MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
        private = seen
    for rel, h in seen.items():
        if rel not in private: errors.append(f"{rel}: not in manifest (run with --update after a deliberate change)")
        elif private[rel] != h: errors.append(f"{rel}: content differs from manifest hash")
    for rel in private:
        if rel not in seen: errors.append(f"{rel}: in manifest but file missing")
    snapshot = hashlib.sha256("\n".join(sorted(doc_hashes) + sorted(private.values())).encode()).hexdigest()
    golden_errors, unverified, n_golden = check_golden()
    errors += [f"golden: {e}" for e in golden_errors]
    for e in errors: print("FAIL   ", e)
    print(f"golden: {n_golden} questions, {len(unverified)} UNVERIFIED{' (' + ', '.join(unverified) + ')' if unverified else ''} — UNVERIFIED questions are excluded from the scorecard (D-21)")
    print(f"corpus:check {'FAIL' if errors else 'OK'} — {len(doc_hashes)} documents, {len(seen)} private files, snapshot sha256:{snapshot}")
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main("--update" in sys.argv))
