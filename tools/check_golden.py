#!/usr/bin/env python3
"""Verifies eval/golden.json against the pinned corpus (Phase 1 task 1.8, D-21).

Every expected citation's `quoteFragment` must be a whitespace-normalized substring of
corpus/text/<docId>/<page ± pageTolerance>.txt (or of the memo body for a private docId); otherwise the
question is UNVERIFIED and the scorecard excludes it. UNVERIFIED is reported, not a failure; a malformed file,
an unknown docId or a duplicate id is a failure. Runs inside corpus:check and standalone. Stdlib only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOLDEN = ROOT / "eval" / "golden.json"
TEXT = ROOT / "corpus" / "text"
PRIVATE = ROOT / "corpus" / "private"
SLICES = {"A", "M", "U", "P", "V"}
ROLES = {"front_desk", "bookkeeper", "partner", "service"}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def candidate_pages(docId: str, page: int, tol: int) -> list[Path]:
    if docId.startswith("ll-"):
        return [p for p in PRIVATE.rglob(f"{docId}.md")]
    return [TEXT / docId / f"{p:03d}.txt" for p in range(page - tol, page + tol + 1) if p >= 1]


def check_golden() -> tuple[list[str], list[str], int]:
    """Returns (errors, unverified question ids, question count)."""
    questions = json.loads(GOLDEN.read_text())
    errors, unverified, ids = [], [], set()
    for q in questions:
        qid = q.get("id", "?")
        if qid in ids:
            errors.append(f"{qid}: duplicate id")
        ids.add(qid)
        if q.get("slice") not in SLICES:
            errors.append(f"{qid}: slice {q.get('slice')!r} not in {sorted(SLICES)}")
        if q.get("callerRole") not in ROLES:
            errors.append(f"{qid}: callerRole {q.get('callerRole')!r} not in {sorted(ROLES)}")
        for c in q["expected"]["citations"]:
            pages = candidate_pages(c["docId"], c["page"], c.get("pageTolerance", 1))
            existing = [p for p in pages if p.exists()]
            if not existing:
                errors.append(f"{qid}: docId {c['docId']} p. {c['page']} has no page file")
                continue
            if not any(norm(c["quoteFragment"]) in norm(p.read_text()) for p in existing):
                if qid not in unverified:
                    unverified.append(qid)
    return errors, unverified, len(questions)


def main() -> int:
    errors, unverified, n = check_golden()
    for e in errors:
        print("FAIL   ", e)
    for u in unverified:
        print("UNVERIFIED", u)
    print(f"golden: {n} questions, {len(unverified)} UNVERIFIED, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
