"""Reproducible synthetic calibration experiment used by the real paper run.
No external data or fabricated numbers: every result is computed here."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, log_loss, brier_score_loss
from scipy.optimize import minimize_scalar

OUT = Path(__file__).resolve().parent.parent / ".skill-workflows" / "runs" / "real-study"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(20260311)
rows=[]

def ece(y,p,bins=15):
    edges=np.linspace(0,1,bins+1); total=0.0
    for lo,hi in zip(edges[:-1],edges[1:]):
        mask=(p>=lo)&((p<hi) if hi<1 else (p<=hi))
        if mask.any(): total += mask.mean()*abs(p[mask].mean()-y[mask].mean())
    return float(total)

def fit_t(logits, y):
    def loss(t): return log_loss(y, 1/(1+np.exp(-logits/t)))
    return float(minimize_scalar(loss,bounds=(0.25,5),method="bounded").x)

def cal(logits,y,t): return 1/(1+np.exp(-logits/t))

for seed in range(10):
    X,y=make_classification(n_samples=5000,n_features=12,n_informative=7,n_redundant=2,
                            class_sep=0.8,flip_y=0.08,random_state=seed)
    # fixed split: train/calibration/test; data generation is reproducible
    Xtr,Xcal,Xte=np.split(X,[3000,4000]); ytr,ycal,yte=np.split(y,[3000,4000])
    model=MLPClassifier(hidden_layer_sizes=(32,),max_iter=250,early_stopping=True,
                        random_state=seed,solver="lbfgs")
    model.fit(Xtr,ytr)
    # MLPClassifier exposes probabilities, convert to logit for temperature scaling.
    pcal=np.clip(model.predict_proba(Xcal)[:,1],1e-6,1-1e-6)
    pte=np.clip(model.predict_proba(Xte)[:,1],1e-6,1-1e-6)
    lcal=np.log(pcal/(1-pcal)); lte=np.log(pte/(1-pte))
    t=fit_t(lcal,ycal); pre=cal(lte,yte,1); post=cal(lte,yte,t)
    rows += [{"seed":seed,"temperature":t,"accuracy":accuracy_score(yte,pre>=.5),
              "ece_before":ece(yte,pre),"ece_after":ece(yte,post),
              "brier_before":brier_score_loss(yte,pre),"brier_after":brier_score_loss(yte,post),
              "logloss_before":log_loss(yte,pre),"logloss_after":log_loss(yte,post)}]
res=pd.DataFrame(rows); res.to_csv(OUT/"calibration_results.csv",index=False)
summary={"n_seeds":len(res),"n_test_per_seed":1000,"ece_before_mean":float(res.ece_before.mean()),
 "ece_after_mean":float(res.ece_after.mean()),"ece_delta_mean":float((res.ece_before-res.ece_after).mean()),
 "brier_before_mean":float(res.brier_before.mean()),"brier_after_mean":float(res.brier_after.mean()),
 "temperature_mean":float(res.temperature.mean()),"accuracy_mean":float(res.accuracy.mean()),"seed":20260311}
(OUT/"calibration_summary.json").write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2))
