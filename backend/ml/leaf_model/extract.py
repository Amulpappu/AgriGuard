import os, glob, random, numpy as np, onnxruntime as ort, json, sys, time
from PIL import Image
from common import feat_model, prep, augment
PV='/tmp/claude-0/data/pv/raw/color'; PD='/tmp/claude-0/data/plantdoc'
PVMAP={'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot':'corn_gray_leaf_spot','Corn_(maize)___Common_rust_':'corn_common_rust','Corn_(maize)___Northern_Leaf_Blight':'corn_leaf_blight','Corn_(maize)___healthy':'corn_healthy',
'Grape___Black_rot':'grape_black_rot','Grape___Esca_(Black_Measles)':'grape_esca','Grape___Leaf_blight_(Isariopsis_Leaf_Spot)':'grape_leaf_blight','Grape___healthy':'grape_healthy',
'Pepper,_bell___Bacterial_spot':'pepper_bacterial_spot','Pepper,_bell___healthy':'pepper_healthy','Potato___Early_blight':'potato_early_blight','Potato___Late_blight':'potato_late_blight','Potato___healthy':'potato_healthy',
'Tomato___Bacterial_spot':'tomato_bacterial_spot','Tomato___Early_blight':'tomato_early_blight','Tomato___Late_blight':'tomato_late_blight','Tomato___Leaf_Mold':'tomato_leaf_mold','Tomato___Septoria_leaf_spot':'tomato_septoria_leaf_spot',
'Tomato___Spider_mites Two-spotted_spider_mite':'tomato_spider_mites','Tomato___Target_Spot':'tomato_target_spot','Tomato___Tomato_Yellow_Leaf_Curl_Virus':'tomato_yellow_leaf_curl_virus','Tomato___Tomato_mosaic_virus':'tomato_mosaic_virus','Tomato___healthy':'tomato_healthy'}
PDMAP={'Bell_pepper leaf':'pepper_healthy','Bell_pepper leaf spot':'pepper_bacterial_spot','Corn Gray leaf spot':'corn_gray_leaf_spot','Corn leaf blight':'corn_leaf_blight','Corn rust leaf':'corn_common_rust',
'Potato leaf early blight':'potato_early_blight','Potato leaf late blight':'potato_late_blight','Tomato Early blight leaf':'tomato_early_blight','Tomato Septoria leaf spot':'tomato_septoria_leaf_spot','Tomato leaf':'tomato_healthy',
'Tomato leaf bacterial spot':'tomato_bacterial_spot','Tomato leaf late blight':'tomato_late_blight','Tomato leaf mosaic virus':'tomato_mosaic_virus','Tomato leaf yellow virus':'tomato_yellow_leaf_curl_virus','Tomato mold leaf':'tomato_leaf_mold',
'Tomato two spotted spider mites leaf':'tomato_spider_mites','grape leaf':'grape_healthy','grape leaf black rot':'grape_black_rot'}
OTHER=['Apple Scab Leaf','Apple leaf','Apple rust leaf','Blueberry leaf','Cherry leaf','Peach leaf','Raspberry leaf','Soyabean leaf','Squash Powdery mildew leaf','Strawberry leaf']
for o in OTHER: PDMAP[o]='other_leaf'
CLASSES=sorted(set(PVMAP.values()))+['other_leaf']
rng=random.Random(42)
sess=ort.InferenceSession(feat_model(),providers=['CPUExecutionProvider'])
def run(items,tag):
    X=[];Y=[];S=[];buf=[];t=time.time()
    def flush():
        if buf:
            X.append(sess.run(None,{'input':np.stack([b[0] for b in buf])})[0]); Y.extend(b[1] for b in buf); S.extend(b[2] for b in buf); buf.clear()
    for i,(f,c,naug,src) in enumerate(items):
        try: im=Image.open(f).convert('RGB')
        except Exception: continue
        if max(im.size)>800: im.thumbnail((800,800))
        buf.append((prep(im),CLASSES.index(c),src))
        for _ in range(naug): buf.append((prep(augment(im,rng)),CLASSES.index(c),src))
        if len(buf)>=48: flush()
        if i%500==0: print(tag,i,len(items),round(time.time()-t),flush=True)
    flush()
    np.savez(f'/tmp/claude-0/ml/feat_{tag}.npz',X=np.concatenate(X),y=np.array(Y),src=np.array(S))
tr=[];te=[]
for d,c in PVMAP.items():
    fs=sorted(glob.glob(f'{PV}/{d}/*')); rng.shuffle(fs)
    te+= [(f,c,0,'pv') for f in fs[:100]]
    tr+= [(f,c,1,'pv') for f in fs[100:500]]
for split,lst,naug in [('train',tr,4),('test',te,0)]:
    for d,c in PDMAP.items():
        for f in glob.glob(f'{PD}/{split}/{d}/*'):
            lst.append((f,c,naug,'pd'))
json.dump(CLASSES,open('/tmp/claude-0/ml/classes.json','w'))
print('train items',len(tr),'test items',len(te),flush=True)
run(te,'test'); run(tr,'train'); print('DONE',flush=True)
