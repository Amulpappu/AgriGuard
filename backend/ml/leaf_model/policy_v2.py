import numpy as np, json, sys
sys.path.insert(0,'/tmp/claude-0/agt/backend')
from PIL import Image
from collections import Counter
from app.ml.leaf_screen import screen_leaf
from app.ml.onnx_classifier import apply_health_guard
ML='/tmp/claude-0/ml2'; cls=json.load(open(f'{ML}/classes.json')); h=np.load(sys.argv[1])
te=np.load(f'{ML}/feat_test.npz'); m=te['src']=='pd'
X,Y,Pth=te['X'][m],te['y'][m],te['path'][m]
OLD={'corn','grape','pepper','potato','tomato'}
def softmax(z): e=np.exp(z-z.max()); return e/e.sum()
def policy(p):
    top=p[0]; mg=top['prob']-(p[1]['prob'] if len(p)>1 else 0)
    if top['prob']>=0.8 and mg>=0.15: return 'healthy' if 'healthy' in top['disease_slug'] else 'disease'
    if top['prob']>=0.55 and mg>=0.15: return 'healthy' if 'healthy' in top['disease_slug'] else 'disease'
    return 'uncertain'
for subset in ['old5','all']:
    res={'healthy':Counter(),'disease':Counter()}; acc=[]
    for x,y,f in zip(X,Y,Pth):
        c=cls[y]
        if c=='other_leaf': continue
        crop=c.split('_')[0]
        if subset=='old5' and crop not in OLD: continue
        p=softmax(h['W2']@np.maximum(h['W1']@x+h['b1'],0)+h['b2'])
        idx=[i for i,k in enumerate(cls) if k.startswith(crop+'_')]; sub=p[idx]/p[idx].sum()
        probs=sorted([{'disease_slug':cls[i],'prob':float(q)} for i,q in zip(idx,sub)],key=lambda d:-d['prob'])
        acc.append(probs[0]['disease_slug']==c)
        if not any('healthy' in q['disease_slug'] for q in probs): continue
        probs=apply_health_guard(probs,screen_leaf(Image.open(f)))
        res['healthy' if 'healthy' in c else 'disease'][policy(probs)]+=1
    print(subset,'n=',len(acc),'raw acc',round(float(np.mean(acc)),3),{k:dict(v) for k,v in res.items()})
