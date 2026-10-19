#!/usr/bin/env python3
"""Fetch, pin and extract the Footnote public corpus (Phase 1 task 1.3).

Stdlib + poppler (`pdfinfo`, `pdftotext`) only (O-7). For each document in corpus/manifest.json:
  1. download to corpus/raw/<docId>.pdf (gitignored) unless present
  2. sha256 it; first fetch writes the hash into the manifest, later fetches refuse on mismatch (D-9)
  3. archive the PDF under its hash in corpus/raw/archive/
  4. `pdfinfo` → pages; `pdftotext -layout` once per page → corpus/text/<docId>/NNN.txt
     with soft hyphens stripped and running header/footer lines moved to NNN.meta.json
  5. textSha256 over the page files, so corpus:check can detect drift without the PDFs
"""
import hashlib, json, re, shutil, subprocess, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "corpus" / "manifest.json"
RAW = ROOT / "corpus" / "raw"
TEXT = ROOT / "corpus" / "text"

# Running footer. `pdftotext -layout` emits it as the LAST non-blank line of a page, in one of these shapes:
#   "20     Chapter 4   General Business Credits     Publication 334 (2025)"   (even pages)
#   "Publication 334 (2025)     Chapter 5   Business Income     21"           (odd pages)
#   "Page 8     Publication 538 (January 2022)" / "Publication 538 (January 2022)     Page 7"
# In reading-order mode (what we commit) the same tokens come out as separate lines at the end of each column,
# mid-file, so they are removed wherever they sit — by exact line match against the -layout footer's tokens.
# The cover's "Publication 334 (2025) Catalog Number 11063P" does not match (no page number at either end) and is kept.
PUB = r"Publication \d+[-A-Z]* \([^)]+\)"
FOOTER = re.compile(rf"^\s*(?:(?:Page )?\d+\s{{2,}}.*{PUB}|{PUB}\s{{2,}}.*?(?:Page )?\d+)\s*$")

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()

def text_hash(doc_dir: Path) -> str:
    """Hash of every file under corpus/text/<docId>/, name and content, in sorted order."""
    h = hashlib.sha256()
    for p in sorted(doc_dir.iterdir()):
        h.update(p.name.encode()); h.update(b"\0"); h.update(p.read_bytes()); h.update(b"\0")
    return h.hexdigest()

def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "footnote-corpus-fetch/1 (python urllib)"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)

def page_count(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", out, re.M).group(1))

def pdftotext(pdf: Path, n: int, *flags: str) -> str:
    out = subprocess.run(["pdftotext", *flags, "-f", str(n), "-l", str(n), str(pdf), "-"],
                         capture_output=True, text=True, check=True).stdout
    return out.replace("\u00ad", "").replace("\f", "")

# A word broken at a line end ("operat-\ning") is rejoined when the next line starts with a lowercase letter.
# ponytail: no dictionary, so a true compound broken at the hyphen ("self-\nemployed") is glued too; the
# default mode has the same ceiling and the same 25/26 quote score. A word list is the upgrade path if it bites.
DEHYPHEN = re.compile(r"(\w)-\n(?=[a-z])")

def reading_text(pdf: Path, n: int) -> str:
    """Committed text: `pdftotext -raw` (content-stream order) with line-end hyphenation rejoined. Measured 2026-10-19
    on 8 sentences that cross a column or box: raw 8/8 contiguous, default mode 2/8, -layout 1/8."""
    return DEHYPHEN.sub(r"\1", pdftotext(pdf, n, "-raw"))

def footer_tokens(pdf: Path, n: int) -> list[str]:
    """The running footer's pieces, read from a -layout pass; [] when the page has no recognizable footer."""
    lines = [l for l in pdftotext(pdf, n, "-layout").split("\n") if l.strip()]
    if not lines or not FOOTER.match(lines[-1]):
        return []
    return [t for t in re.split(r"\s{2,}", lines[-1].strip()) if t]

def split_running(text: str, tokens: list[str]) -> tuple[str, list[dict]]:
    """Remove the running footer from the committed text; return the text and what was removed (line index, text).
    In -raw mode the footer is usually one line, the tokens joined by single spaces ("Publication 583 (12-2024) 15");
    when it is not, each token is removed as its own line (last occurrence)."""
    lines = text.split("\n")
    running = []
    if tokens:
        joined = " ".join(tokens)
        for i in range(len(lines) - 1, -1, -1):
            if " ".join(lines[i].split()) == joined:
                running.append({"line": i, "text": joined}); del lines[i]; break
        else:
            for t in tokens:
                for i in range(len(lines) - 1, -1, -1):
                    if lines[i].strip() == t:
                        running.append({"line": i, "text": t}); del lines[i]; break
    return "\n".join(lines).rstrip() + "\n", running

def main() -> int:
    manifest = json.loads(MANIFEST.read_text())
    RAW.mkdir(parents=True, exist_ok=True); (RAW / "archive").mkdir(exist_ok=True)
    changed, failures = False, []
    for doc in manifest["documents"]:
        doc_id, pdf = doc["docId"], RAW / f"{doc['docId']}.pdf"
        if not pdf.exists():
            print(f"fetch   {doc_id}  {doc['url']}")
            download(doc["url"], pdf)
        digest = sha256_file(pdf)
        if doc["sha256"] is None:
            doc["sha256"], doc["fetchedAt"], changed = digest, datetime.now(timezone.utc).isoformat(timespec="seconds"), True
        elif doc["sha256"] != digest:
            failures.append(f"{doc_id}: sha256 {digest[:12]}… != manifest {doc['sha256'][:12]}… (document changed; a new snapshot needs a decision, not a silent update)")
            continue
        archive = RAW / "archive" / f"{digest}.pdf"
        if not archive.exists():
            shutil.copy2(pdf, archive)
        pages = page_count(pdf)
        if doc["pages"] not in (None, pages):
            failures.append(f"{doc_id}: pdfinfo pages {pages} != manifest {doc['pages']}"); continue
        doc["pages"] = pages
        out = TEXT / doc_id
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        for n in range(1, pages + 1):
            tokens = footer_tokens(pdf, n)
            body, running = split_running(reading_text(pdf, n), tokens)
            (out / f"{n:03d}.txt").write_text(body)
            (out / f"{n:03d}.meta.json").write_text(json.dumps({"docId": doc_id, "page": n, "footer": tokens, "running": running}, ensure_ascii=False) + "\n")
        doc["textSha256"] = text_hash(out)
        changed = True
        print(f"ok      {doc_id:10s} sha256={digest[:12]}… pages={pages}")
    if changed:
        manifest["extraction"] = "pdftotext -raw (content-stream order) with line-end hyphenation rejoined, one call per page, soft hyphens stripped, running footer moved to NNN.meta.json (poppler " + subprocess.run(["pdftotext", "-v"], capture_output=True, text=True).stderr.split()[2] + ")"
        MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    for f in failures:
        print("FAIL   ", f)
    return 1 if failures else 0

if __name__ == "__main__":
    sys.exit(main())
