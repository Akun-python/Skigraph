#!/usr/bin/env python3
"""Post-hoc WDBC follow-up: partition stability, training-only tuning, and diagnostics.

This is an exploratory extension of the fixed-C baseline. It does not turn the
study into a preregistered confirmation or a clinical validation. Outer test folds
are never used for C selection; all summaries remain descriptive.
"""
from __future__ import annotations

import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/breast-cancer-wisconsin/wdbc.data"
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".skill-workflows/runs/open-data-wdbc-followup")
OUT.mkdir(parents=True, exist_ok=True)
SEEDS = [2026, 2027, 2028, 2029, 2030]
CS = [0.01, 0.1, 1.0, 10.0, 100.0]

request = urllib.request.Request(URL, headers={"User-Agent": "SkillGraph-reproducibility-demo/1.0"})
with urllib.request.urlopen(request, timeout=30) as response:
    raw = response.read()
(OUT / "wdbc.data").write_bytes(raw)
df = pd.read_csv(OUT / "wdbc.data", header=None)
if df.shape != (569, 32) or set(df[1].unique()) != {"M", "B"}:
    raise ValueError(f"unexpected WDBC source schema: {df.shape}")
X = df.iloc[:, 2:].to_numpy(dtype=float)
y = (df[1] == "M").to_numpy(dtype=int)


def fixed_models():
    return {
        "unscaled_fixed_c": Pipeline([("model", LogisticRegression(C=1.0, max_iter=5000, random_state=2026))]),
        "scaled_fixed_c": Pipeline([
            ("scale", StandardScaler()),
            ("model", LogisticRegression(C=1.0, max_iter=5000, random_state=2026)),
        ]),
    }


def tuned_models():
    base = LogisticRegression(max_iter=5000, random_state=2026)
    return {
        "unscaled_nested_tuned": GridSearchCV(
            Pipeline([("model", base)]), {"model__C": CS}, cv=3, scoring="roc_auc", refit=True
        ),
        "scaled_nested_tuned": GridSearchCV(
            Pipeline([("scale", StandardScaler()), ("model", base)]),
            {"model__C": CS}, cv=3, scoring="roc_auc", refit=True,
        ),
    }

rows = []
for seed in SEEDS:
    outer = StratifiedKFold(n_splits=5, shuffle=True, random_state=seed)
    for fold, (train, test) in enumerate(outer.split(X, y), start=1):
        for family, factory in (("fixed_c", fixed_models), ("nested_tuned", tuned_models)):
            for name, model in factory().items():
                model.fit(X[train], y[train])
                pred = model.predict(X[test])
                score = model.predict_proba(X[test])[:, 1]
                estimator = model.best_estimator_ if isinstance(model, GridSearchCV) else model
                lr = estimator.named_steps["model"]
                selected_c = float(model.best_params_["model__C"]) if isinstance(model, GridSearchCV) else 1.0
                rows.append({
                    "seed": seed, "fold": fold, "family": family, "model": name,
                    "n_train": len(train), "n_test": len(test), "selected_C": selected_c,
                    "accuracy": accuracy_score(y[test], pred),
                    "f1_malignant": f1_score(y[test], pred),
                    "roc_auc": roc_auc_score(y[test], score),
                    "n_iter": int(np.max(np.asarray(lr.n_iter_))),
                    "converged_at_limit": bool(np.max(np.asarray(lr.n_iter_)) >= 5000),
                })

results = pd.DataFrame(rows)
results.to_csv(OUT / "fold_results.csv", index=False)
summary = results.groupby(["family", "model"])[["accuracy", "f1_malignant", "roc_auc", "n_iter"]].agg(["mean", "std", "min", "max"])
summary.to_csv(OUT / "summary.csv")
summary.to_json(OUT / "summary.json", orient="index", indent=2)
manifest = {
    "schema_version": 1,
    "source_url": URL,
    "dataset_page": "https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic",
    "retrieved_utc": datetime.now(timezone.utc).isoformat(),
    "sha256": hashlib.sha256(raw).hexdigest(),
    "rows": len(df), "features": 30, "malignant": int(y.sum()), "benign": int((1-y).sum()),
    "outer_design": "5 shuffled stratified folds for each seed; seeds are descriptive partition-stability replicates, not independent patients",
    "seeds": SEEDS, "inner_design": "3-fold training-only GridSearchCV for C in [0.01, 0.1, 1, 10, 100], scoring=roc_auc",
    "fixed_c": 1.0, "target": "malignant=1; benign=0", "id_excluded": True,
    "tuning_uses_outer_test": False,
    "versions": {"python": sys.version, "numpy": np.__version__, "pandas": pd.__version__, "scikit_learn": sklearn.__version__},
    "status": "post-hoc exploratory follow-up; not preregistered, confirmatory, or clinical validation",
}
(OUT / "dataset_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

# A transparent stability display: seed-level mean accuracy, no confidence bands.
seed_means = results.groupby(["seed", "model"], as_index=False)["accuracy"].mean()
fig, ax = plt.subplots(figsize=(8, 4.5), constrained_layout=True)
for model, group in seed_means.groupby("model"):
    ax.plot(group["seed"].astype(str), group["accuracy"], marker="o", label=model)
ax.set_xlabel("Outer partition seed (descriptive)")
ax.set_ylabel("Mean held-out accuracy across five folds")
ax.set_ylim(0.88, 1.01)
ax.grid(axis="y", alpha=.25)
ax.legend(fontsize=8)
fig.savefig(OUT / "partition_stability_accuracy.pdf")
fig.savefig(OUT / "partition_stability_accuracy.png", dpi=300)
plt.close(fig)

# Fixed-C paired differences by metric, retaining every outer fold.
pivot = results[results.family == "fixed_c"].pivot_table(index=["seed", "fold"], columns="model", values=["accuracy", "f1_malignant", "roc_auc"])
diffs = pd.DataFrame(index=pivot.index)
for metric in ["accuracy", "f1_malignant", "roc_auc"]:
    diffs[metric + "_scaled_minus_raw"] = pivot[(metric, "scaled_fixed_c")] - pivot[(metric, "unscaled_fixed_c")]
diffs.reset_index().to_csv(OUT / "fixed_c_paired_differences.csv", index=False)
print(json.dumps({"output": str(OUT), "sha256": manifest["sha256"], "rows": len(results), "models": sorted(results.model.unique())}, indent=2))
