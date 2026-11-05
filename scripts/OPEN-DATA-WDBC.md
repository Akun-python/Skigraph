# WDBC public-data reproducibility test

This is an empirical baseline, **not** a novel algorithm or a clinical diagnostic tool.

## Question

How does training-fold standardization change five-fold held-out logistic-regression performance on the UCI Wisconsin Diagnostic Breast Cancer dataset?

## Run

```bash
python3 scripts/open-data-wdbc.py
```

Requirements: Python 3, numpy, pandas, scipy, scikit-learn, matplotlib and network access to UCI. The script downloads and parses the public WDBC file, excludes the ID column, uses stratified five-fold CV with a fixed seed, and fits `StandardScaler` **inside** each training fold. It writes source bytes, SHA-256 provenance, per-fold metrics, summary and plots under `.skill-workflows/runs/open-data-wdbc/` (git-ignored). Consult the dataset page for attribution and reuse terms.

The two pipelines use the same logistic-regression regularization parameter on differently scaled features; their difference is therefore not a causal estimate of standardization alone. Five CV folds are correlated, not five independent external datasets. Report the results as exploratory, and do not claim clinical validity, statistical significance or algorithmic novelty without additional evidence.

## Writing test status

The `paper-algo` real-agent attempt stopped at `idea`: its configured model provider returned HTTP 500 (`Failed to validate API key`). Therefore the experiment was executed independently; no end-to-end agent-generated manuscript or PDF is claimed. Configure a working provider before retrying. The other workflow families have not yet been tested with real data in this run.
