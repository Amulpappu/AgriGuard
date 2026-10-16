"""Features for the produce (fruit / vegetable / tuber) heads: crop identity + condition."""
import glob, json, random, time, sys, numpy as np, onnxruntime as ort
sys.path.insert(0,'/tmp/claude-0/mlsrc')
from PIL import Image, ImageFilter
from common import prep, augment
P='/tmp/claude-0/data/prod'; OUT='/tmp/claude-0/ml3'
F360=f'{P}/fruits-360_fruits-360-100x100'; FR=f'{P}/Bangkit-JKT2-D_fruits-fresh-rotten-classification/Datasets'; POT=f'{P}/Mukaffi28_Potato-Disease'
M=json.load(open('/tmp/claude-0/mlsrc/produce_map.json'))
CROPS=sorted(M.keys())
COND=['fresh','rotten','potato_black_scurf','potato_blackleg','potato_common_scab','potato_dry_rot','potato_pink_rot']
rng=random.Random(7)
def on_background(im):
    """Fruits-360 / studio photos are on white: paste the produce on a random real-looking background."""
    im=im.convert('RGB'); a=np.asarray(im).astype(np.int16)
    mask=Image.fromarray(((a.min(2)<235)*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))
    W=int(max(im.size)*rng.uniform(1.0,1.8)); base=np.array([rng.randint(60,230) for _ in range(3)])*np.ones((W,W,3))
    base=base+np.random.default_rng(rng.randint(0,9999)).normal(0,rng.uniform(3,18),(W,W,3))
    bg=Image.fromarray(np.clip(base,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rng.uniform(0,2)))
    x=rng.randint(0,W-im.size[0]); y=rng.randint(0,W-im.size[1]); bg.paste(im,(x,y),mask); return bg
items_tr=[]; items_te=[]
for crop,folders in M.items():
    per=max(40,240//len(folders))
    for fo in folders:
        tr=sorted(glob.glob(f'{F360}/Training/{fo}/*')); rng.shuffle(tr)
        te=sorted(glob.glob(f'{F360}/Test/{fo}/*')); rng.shuffle(te)
        items_tr+=[(f,crop,'fresh','f360',1) for f in tr[:per]]
        items_te+=[(f,crop,'fresh','f360',0) for f in te[:max(8,60//len(folders))]]
for d,crop,cond in [('freshapples','apple','fresh'),('rottenapples','apple','rotten'),('freshbanana','banana','fresh'),('rottenbanana','banana','rotten'),('freshoranges','orange','fresh'),('rottenoranges','orange','rotten')]:
    tr=sorted(glob.glob(f'{FR}/train/{d}/*')); rng.shuffle(tr); te=sorted(glob.glob(f'{FR}/test/{d}/*')); rng.shuffle(te)
    items_tr+=[(f,crop,cond,'freshrot',1) for f in tr[:350]]; items_te+=[(f,crop,cond,'freshrot',0) for f in te[:80]]
for d,cond in [('Healthy Potatoes','fresh'),('Dry Rot','potato_dry_rot'),('Common Scab','potato_common_scab'),('Blackleg','potato_blackleg'),('Pink Rot','potato_pink_rot'),('Black Scurf','potato_black_scurf')]:
    fs=sorted(glob.glob(f'{POT}/{d}/*')); rng.shuffle(fs)
    items_te+=[(f,'potato',cond,'potdis',0) for f in fs[:10]]; items_tr+=[(f,'potato',cond,'potdis',6) for f in fs[10:]]
sess=ort.InferenceSession('/tmp/claude-0/ml2/mnv2_feat.onnx',providers=['CPUExecutionProvider'])
def run(items,tag):
    X=[];C=[];D=[];S=[];PTH=[];buf=[];t=time.time()
    def flush():
        if buf:
            X.append(sess.run(None,{'input':np.stack([b[0] for b in buf])})[0])
            for b in buf: C.append(b[1]);D.append(b[2]);S.append(b[3]);PTH.append(b[4])
            buf.clear()
    for i,(f,crop,cond,src,naug) in enumerate(items):
        try: im=Image.open(f).convert('RGB')
        except Exception: continue
        if max(im.size)>800: im.thumbnail((800,800))
        base=on_background(im) if (src=='f360' and tag=='train') else im
        buf.append((prep(base),CROPS.index(crop),COND.index(cond),src,f))
        for _ in range(naug):
            src_im=on_background(im) if src in ('f360','freshrot') else im
            buf.append((prep(augment(src_im,rng)),CROPS.index(crop),COND.index(cond),src,f))
        if len(buf)>=48: flush()
        if i%1000==0: print(tag,i,len(items),round(time.time()-t),flush=True)
    flush()
    np.savez(f'{OUT}/feat_{tag}.npz',X=np.concatenate(X),crop=np.array(C),cond=np.array(D),src=np.array(S),path=np.array(PTH))
json.dump({'crops':CROPS,'conditions':COND},open(f'{OUT}/produce_classes.json','w'))
print('train',len(items_tr),'test',len(items_te),flush=True)
run(items_te,'test'); run(items_tr,'train'); print('DONE',flush=True)
