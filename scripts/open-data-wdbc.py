#!/usr/bin/env python3
"""Reproducible public-data baseline; research demonstration, not clinical use."""
import hashlib, json, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import scipy
import sklearn
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

URL = 'https://archive.ics.uci.edu/ml/machine-learning-databases/breast-cancer-wisconsin/wdbc.data'
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '.skill-workflows/runs/open-data-wdbc')
OUT.mkdir(parents=True, exist_ok=True)
request = urllib.request.Request(URL, headers={'User-Agent': 'SkillGraph-reproducibility-demo/1.0'})
with urllib.request.urlopen(request, timeout=30) as response:
    raw = response.read()
(OUT / 'wdbc.data').write_bytes(raw)
# Parse the downloaded source itself; never replace it silently with a bundled copy.
df = pd.read_csv(OUT / 'wdbc.data', header=None)
if df.shape != (569, 32) or set(df[1].unique()) != {'M', 'B'}:
    raise ValueError(f'unexpected WDBC source schema: {df.shape}')
X = df.iloc[:, 2:].to_numpy(dtype=float)
y = (df[1] == 'M').to_numpy(dtype=int)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=2026)
models = {
    'unscaled_logistic': LogisticRegression(max_iter=5000, random_state=2026),
    'scaled_logistic': make_pipeline(StandardScaler(), LogisticRegression(max_iter=5000, random_state=2026)),
}
rows = []
for fold, (train, test) in enumerate(cv.split(X, y), start=1):
    for name, model in models.items():
        model.fit(X[train], y[train]); pred = model.predict(X[test]); score = model.predict_proba(X[test])[:, 1]
        rows.append({'fold': fold, 'model': name, 'n_train': len(train), 'n_test': len(test),
                     'accuracy': accuracy_score(y[test], pred), 'f1_malignant': f1_score(y[test], pred),
                     'roc_auc': roc_auc_score(y[test], score)})
results = pd.DataFrame(rows); results.to_csv(OUT / 'fold_results.csv', index=False)
summary = results.groupby('model')[['accuracy', 'f1_malignant', 'roc_auc']].agg(['mean', 'std'])
summary.to_csv(OUT / 'summary.csv')
manifest = {'source_url': URL, 'dataset_page': 'https://archive.ics.uci.edu/dataset/17/breast+cancer+wisconsin+diagnostic',
 'retrieved_utc': datetime.now(timezone.utc).isoformat(), 'sha256': hashlib.sha256(raw).hexdigest(),
 'rows': len(df), 'features': 30, 'malignant': int(y.sum()), 'benign': int((1-y).sum()),
 'split': '5-fold stratified CV, shuffled, random_state=2026',
 'target': 'malignant=1; benign=0', 'id_excluded': True,
 'terms_note': 'Consult the UCI dataset page for attribution and current reuse terms.',
 'versions': {'python': sys.version, 'numpy': np.__version__, 'pandas': pd.__version__,
              'scipy': scipy.__version__, 'scikit_learn': sklearn.__version__}}
(OUT / 'dataset_manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
fig, ax = plt.subplots(figsize=(6.4, 4.2), constrained_layout=True)
for i, metric in enumerate(['accuracy', 'f1_malignant', 'roc_auc']):
    for j, name in enumerate(models):
        vals = results.loc[results.model == name, metric]
        ax.scatter(i + (-.14 if j == 0 else .14) + np.linspace(-.04,.04,len(vals)), vals,
                   label=name if i == 0 else None, s=35, alpha=.8)
ax.set_xticks(range(3), ['Accuracy', 'F1 (malignant)', 'ROC AUC']); ax.set_ylabel('Held-out fold score')
ax.set_title('WDBC: five stratified held-out folds'); ax.legend(); ax.grid(axis='y', alpha=.25)
fig.savefig(OUT / 'fold_metrics.png', dpi=300); fig.savefig(OUT / 'fold_metrics.pdf'); plt.close(fig)
print(json.dumps({'output': str(OUT), 'sha256': manifest['sha256'], 'rows':len(df),
                  'summary': json.loads(summary.to_json())}, indent=2))
