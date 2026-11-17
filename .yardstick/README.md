# .yardstick

Inputs for the Yardstick eval gate (`.github/workflows/yardstick.yml`, docs/decisions.md D-57).

- `gates/product-default.yaml`: dense + Sonnet θ 0.52 (D-46) may not drop below its baseline.
- `gates/judged.yaml`: the judged cell (`2026-10-23T1646`); the judge's support rule is report-only while κ < 0.7.
- `baselines/`: runs pinned with `yardstick baseline pin` from the committed answers files. When a PR changes
  `eval/golden.json` or commits a better answers file on purpose, re-pin in the same PR so the change is reviewed:

```bash
yardstick footnote suite eval/golden.json -o /tmp/suite.yaml
yardstick run -s /tmp/suite.yaml --mapping footnote --theta-prime 0.52 --target-name dense-sonnet-theta-0.52 \
  --results eval/results/answers-dense-claude-sonnet-5-5-theta-off-<newest>.json --no-git -o /tmp/def.json
yardstick baseline pin /tmp/def.json --baselines-dir .yardstick/baselines
```

Not tax or legal advice.
