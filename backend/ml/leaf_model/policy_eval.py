import numpy as np, json, glob, sys
sys.path.insert(0,'/tmp/claude-0/ag/backend')
from PIL import Image
from app.ml.leaf_screen import screen_leaf
from app.ml.onnx_classifier import apply_health_guard
cls=json.load(open('/tmp/claude-0/ml/classes.json'))
head=np.load(sys.argv[1])
def logits(x):
    if 'W1' in head: return head['W2']@np.maximum(head['W1']@x+head['b1'],0)+head['b2']
    return head['W']@x+head['b']
te=np.load('/tmp/claude-0/ml/feat_test.npz')
# PD test paths in same order as extract (dict order) -> recompute list
exec(open('extract.py').read().split('CLASSES=')[0].split("sess=")[0].replace("import os, glob, random, numpy as np, onnxruntime as ort, json, sys, time\nfrom PIL import Image\nfrom common import feat_model, prep, augment",""))
items=[]
for d,c in PDMAP.items():
    for f in glob.glob(f'{PD}/test/{d}/*'): items.append((f,c))
X=te['X'][te['src']=='pd']; Y=te['y'][te['src']=='pd']
ok=[]
for f,c in items:
    try: Image.open(f).convert('RGB'); ok.append((f,c))
    except Exception: pass
assert len(ok)==len(X),(len(ok),len(X))
def softmax(z): e=np.exp(z-z.max()); return e/e.sum()
def policy(p):
    top=p[0]; m=top['prob']-(p[1]['prob'] if len(p)>1 else 0)
    if top['prob']>=0.8 and m>=0.15: return 'healthy' if 'healthy' in top['disease_slug'] else 'disease'
    if top['prob']>=0.55 and m>=0.15: return ('healthy' if 'healthy' in top['disease_slug'] else 'disease')+'?'
    return 'uncertain'
from collections import Counter
res={'healthy':Counter(),'disease':Counter()}; correct=Counter()
for (f,c),x,y in zip(ok,X,Y):
    if c=='other_leaf': continue
    crop=c.split('_')[0]; p=softmax(logits(x))
    idx=[i for i,k in enumerate(cls) if k.startswith(crop+'_')]; sub=p[idx]/p[idx].sum()
    probs=sorted([{'disease_slug':cls[i],'prob':float(q)} for i,q in zip(idx,sub)],key=lambda d:-d['prob'])
    probs=apply_health_guard(probs,screen_leaf(Image.open(f)))
    out=policy(probs); truth='healthy' if 'healthy' in c else 'disease'
    res[truth][out]+=1
    if out!='uncertain': correct[(truth, probs[0]['disease_slug']==c)]+=1
for k,v in res.items(): print(k, dict(v), 'n=',sum(v.values()))
print('named-and-correct among answered:',{k:v for k,v in correct.items()})
