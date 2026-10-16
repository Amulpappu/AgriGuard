import glob, json, random, numpy as np, onnxruntime as ort, sys
sys.path.insert(0,'/tmp/claude-0/mlsrc')
from PIL import Image
from common import prep, augment
OUT='/tmp/claude-0/ml3'; pc=json.load(open(f'{OUT}/produce_classes.json')); CROPS=pc['crops']; COND=pc['conditions']
rng=random.Random(5)
crops=sorted(glob.glob('/tmp/claude-0/data/prod/realtom/*')); rng.shuffle(crops)
full=sorted(glob.glob('/tmp/claude-0/data/prod/Daric-Weng_CFD-DETR-Dataset/Tomato/images/*')); rng.shuffle(full)
# hold out whole source photos: test crops come only from test photos
import os
test_stems={os.path.splitext(os.path.basename(f))[0] for f in full[:60]}
tr=[f for f in crops if f.split('/')[-1].rsplit('_',2)[0] not in test_stems][:1300]
te=[f for f in crops if f.split('/')[-1].rsplit('_',2)[0] in test_stems]
tr+=full[60:]; te+=full[:60]
sess=ort.InferenceSession('/tmp/claude-0/ml2/mnv2_feat.onnx',providers=['CPUExecutionProvider'])
for tag,lst,naug in [('realtom_train',tr,1),('realtom_test',te,0)]:
    X=[];buf=[]
    for f in lst:
        im=Image.open(f).convert('RGB'); buf.append(prep(im))
        for _ in range(naug): buf.append(prep(augment(im,rng)))
        if len(buf)>=48: X.append(sess.run(None,{'input':np.stack(buf)})[0]); buf=[]
    if buf: X.append(sess.run(None,{'input':np.stack(buf)})[0])
    X=np.concatenate(X); n=len(X)
    np.savez(f'{OUT}/feat_{tag}.npz',X=X,crop=np.full(n,CROPS.index('tomato')),cond=np.full(n,COND.index('fresh')),src=np.array(['realtom']*n))
    print(tag,n,flush=True)
