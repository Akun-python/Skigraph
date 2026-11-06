#!/usr/bin/env python3
"""Offline descriptive figures; no refitting or test-based model selection."""
import hashlib
import json
import sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

out = Path(sys.argv[1])
source = out / 'followup_fold_results.csv'
d = pd.read_csv(source)
assert len(d) == 100 and d.groupby('model').size().eq(25).all()
assert not d.isna().any().any()
assert not d.duplicated(['seed', 'fold', 'model']).any()
models = ['unscaled_fixed_c', 'scaled_fixed_c', 'unscaled_nested_tuned', 'scaled_nested_tuned']
labels = ['Raw fixed C', 'Scaled fixed C', 'Raw tuned', 'Scaled tuned']
plt.rcParams.update({'font.size': 10, 'pdf.fonttype': 42})
metrics = ['accuracy', 'f1_malignant', 'roc_auc']
audit = {}
for model, g in d.groupby('model'):
    audit[model] = {m: {k: float(v) for k, v in g[m].agg(['mean', 'std', 'min', 'max']).items()} for m in metrics + ['n_iter']}
    audit[model]['limit_hits'] = int(g.converged_at_limit.sum())
(out / 'numeric_audit.json').write_text(json.dumps(audit, indent=2))
piv = d[d.family == 'fixed_c'].pivot(index=['seed', 'fold'], columns='model', values=metrics)
diff = pd.DataFrame({m: piv[m]['scaled_fixed_c'] - piv[m]['unscaled_fixed_c'] for m in metrics})
diff.to_csv(out / 'paired_figure_data.csv')
fig, axs = plt.subplots(1, 3, figsize=(10, 3.8), layout='constrained')
for ax, metric, title in zip(axs, metrics, ['Accuracy', 'Malignant-class F1', 'ROC AUC']):
    ax.axhline(0, color='black', lw=1)
    for i, seed in enumerate(sorted(d.seed.unique())):
        v = diff.xs(seed)[metric].to_numpy()
        ax.plot(np.arange(5) + i * 5 + 1, v, 'o', ms=4, color='#0072B2')
    ax.set(title=title, xlabel='Fold index (grouped by seed)', ylabel='Scaled minus raw (score units)')
    ax.grid(axis='y', alpha=.2)
fig.savefig(out / 'paired_metric_differences.pdf')
fig.savefig(out / 'paired_metric_differences.png', dpi=180)
plt.close(fig)
fig, ax = plt.subplots(figsize=(8, 4), layout='constrained')
for i, model in enumerate(models):
    g = d[d.model == model].sort_values(['seed', 'fold'])
    hits = g.converged_at_limit.to_numpy(dtype=bool)
    x = i + np.linspace(-.18, .18, len(g))
    ax.plot(x[~hits], g.n_iter.to_numpy()[~hits], 'o', color='#0072B2', ms=4)
    ax.plot(x[hits], g.n_iter.to_numpy()[hits], 'x', color='#B34400', ms=6)
ax.axhline(5000, color='black', ls='--', lw=1, label='Configured iteration limit')
ax.plot([], [], 'o', color='#0072B2', label='No outer-fit limit hit')
ax.plot([], [], 'x', color='#B34400', label='Outer-fit limit hit')
ax.set(xticks=range(4), xticklabels=labels, yscale='log', ylabel='Outer-fit iterations (log scale, base 10)')
ax.legend(fontsize=8, loc='lower right')
fig.savefig(out / 'iteration_diagnostics.pdf')
fig.savefig(out / 'iteration_diagnostics.png', dpi=180)
plt.close(fig)
records = []
for name, claim, transform, alt in [
    ('paired_metric_differences', 'C-FIXED-PAIR', 'Join fixed-C rows by seed/fold; subtract raw from scaled; retain all 25 pairs.', 'Three point panels show paired accuracy, malignant F1, and AUC differences. Accuracy includes a tie; AUC includes negative differences.'),
    ('iteration_diagnostics', 'C-OPT-LIMIT', 'Retain all 100 outer-fit iteration counts; deterministic horizontal offsets by seed/fold; log10 y-axis.', 'Four groups of iterations distinguish ordinary points and limit-hit crosses; 17 raw tuned fits reach 5000. No hit is not proof of equal optimization quality.')]:
    records.append({'figure_id': name, 'claim_id': claim, 'source': source.name, 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'source_rows': 'all relevant rows; no exclusions', 'transformation': transform, 'n': '25 dependent outer folds per model; same 569 observations reused', 'uncertainty': 'none; individual descriptive measurements, not confidence intervals', 'generator': 'wdbc-revision-figures.py', 'regenerate': 'python3 wdbc-revision-figures.py .', 'outputs': [name+'.pdf', name+'.png'], 'alt_text': alt, 'consumer': 'revised_paper.tex Results', 'human_review': 'pending', 'venue_compliance': 'not verified'})
(out / 'figure_provenance.json').write_text(json.dumps({'matplotlib': matplotlib.__version__, 'pandas': pd.__version__, 'figures': records}, indent=2))
(out / 'figure_inventory.json').write_text(json.dumps({'status': 'descriptive only; new numerical experiments not performed', 'included': [r['figure_id'] for r in records], 'open': ['solver/tolerance sensitivity', 'coordinate-equivalent penalty', 'calibration and patient-level error audit', 'external validation'], 'table_alternative': 'numeric_audit.json and followup_fold_results.csv'}, indent=2))
print(diff.agg(['mean', 'min', 'max']).to_string())
print('Positive/tie/negative:', {m: [int((diff[m]>0).sum()), int((diff[m]==0).sum()), int((diff[m]<0).sum())] for m in metrics})
