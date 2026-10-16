"""Synthetic market/field scenes: piles of one produce type with leaf/stem clutter, on varied backgrounds."""
import glob, json, random, time, sys, numpy as np, onnxruntime as ort
sys.path.insert(0,'/tmp/claude-0/mlsrc')
from PIL import Image, ImageFilter
from common import prep, augment
P='/tmp/claude-0/data/prod'; OUT='/tmp/claude-0/ml3'
F360=f'{P}/fruits-360_fruits-360-100x100'; FR=f'{P}/Bangkit-JKT2-D_fruits-fresh-rotten-classification/Datasets'
M=json.load(open('/tmp/claude-0/mlsrc/produce_map.json')); CROPS=sorted(M.keys())
COND=json.load(open(f'{OUT}/produce_classes.json'))['conditions']
rng=random.Random(11); nr=np.random.default_rng(11)
leafs=glob.glob('/tmp/claude-0/data/pv/raw/color/*healthy*/*')
def cutout(im):
    a=np.asarray(im.convert('RGB')).astype(np.int16)
    m=Image.fromarray(((a.min(2)<235)*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1)); return im.convert('RGB'),m
def leaf_piece():
    im=Image.open(rng.choice(leafs)).convert('RGB'); w,h=im.size; s=rng.randint(40,110)
    x=rng.randint(0,w-s); y=rng.randint(0,h-s); p=im.crop((x,y,x+s,y+s)).rotate(rng.uniform(0,360))
    a=np.asarray(p).astype(np.int16); g=(a[...,1]>a[...,0])&(a[...,1]>a[...,2])
    return p, Image.fromarray((g*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1))
def scene(files, clutter):
    W=360; base=np.array([rng.randint(40,220) for _ in range(3)])*np.ones((W,W,3))+nr.normal(0,rng.uniform(4,20),(W,W,3))
    bg=Image.fromarray(np.clip(base,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rng.uniform(0,2)))
    n=rng.randint(3,9); pieces=[]
    if clutter:
        for _ in range(rng.randint(1,5)):
            p,m=leaf_piece(); bg.paste(p,(rng.randint(-20,W-40),rng.randint(-20,W-40)),m)
    for _ in range(n):
        im=Image.open(rng.choice(files)); s=rng.randint(90,170); im=im.convert('RGB').resize((s,s)).rotate(rng.uniform(0,360),fillcolor=(255,255,255))
        if files[0].startswith(FR): bg.paste(im.convert('RGB'),(rng.randint(-30,W-s+30),rng.randint(-30,W-s+30)))
        else:
            c,m=cutout(im); bg.paste(c,(rng.randint(-30,W-s+30),rng.randint(-30,W-s+30)),m)
    if clutter and rng.random()<0.5:
        for _ in range(rng.randint(1,3)):
            p,m=leaf_piece(); bg.paste(p,(rng.randint(0,W-60),rng.randint(0,W-60)),m)
    return bg
sess=ort.InferenceSession('/tmp/claude-0/ml2/mnv2_feat.onnx',providers=['CPUExecutionProvider'])
X=[];C=[];D=[];S=[];buf=[];t=time.time()
jobs=[]
for crop,folders in M.items():
    files=[f for fo in folders for f in glob.glob(f'{F360}/Training/{fo}/*')]
    jobs+=[(files,crop,'fresh')]*90
for d,crop,cond in [('rottenapples','apple','rotten'),('rottenbanana','banana','rotten'),('rottenoranges','orange','rotten')]:
    jobs+=[(glob.glob(f'{FR}/train/{d}/*'),crop,cond)]*90
rng.shuffle(jobs)
for i,(files,crop,cond) in enumerate(jobs):
    img=scene(files, clutter=rng.random()<0.7)
    buf.append((prep(img),CROPS.index(crop),COND.index(cond)))
    if len(buf)>=48:
        X.append(sess.run(None,{'input':np.stack([b[0] for b in buf])})[0]); C+=[b[1] for b in buf]; D+=[b[2] for b in buf]; buf.clear()
    if i%500==0: print(i,len(jobs),round(time.time()-t),flush=True)
if buf: X.append(sess.run(None,{'input':np.stack([b[0] for b in buf])})[0]); C+=[b[1] for b in buf]; D+=[b[2] for b in buf]
np.savez(f'{OUT}/feat_piles.npz',X=np.concatenate(X),crop=np.array(C),cond=np.array(D),src=np.array(['pile']*len(C)))
img=scene([f for fo in M['tomato'] for f in glob.glob(f'{F360}/Training/{fo}/*')],True); img.save(f'{OUT}/example_pile.jpg')
print('DONE',flush=True)
