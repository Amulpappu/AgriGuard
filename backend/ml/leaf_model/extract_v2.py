import os, glob, random, numpy as np, onnxruntime as ort, json, time, sys
sys.path.insert(0,'/tmp/claude-0/mlsrc')
from PIL import Image
from common import feat_model, prep, augment
PV='/tmp/claude-0/data/pv/raw/color'; PD='/tmp/claude-0/data/plantdoc'; EXT='/tmp/claude-0/data/ext'
OUT='/tmp/claude-0/ml2'
PVMAP={'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot':'corn_gray_leaf_spot','Corn_(maize)___Common_rust_':'corn_common_rust','Corn_(maize)___Northern_Leaf_Blight':'corn_leaf_blight','Corn_(maize)___healthy':'corn_healthy',
'Grape___Black_rot':'grape_black_rot','Grape___Esca_(Black_Measles)':'grape_esca','Grape___Leaf_blight_(Isariopsis_Leaf_Spot)':'grape_leaf_blight','Grape___healthy':'grape_healthy',
'Pepper,_bell___Bacterial_spot':'pepper_bacterial_spot','Pepper,_bell___healthy':'pepper_healthy','Potato___Early_blight':'potato_early_blight','Potato___Late_blight':'potato_late_blight','Potato___healthy':'potato_healthy',
'Tomato___Bacterial_spot':'tomato_bacterial_spot','Tomato___Early_blight':'tomato_early_blight','Tomato___Late_blight':'tomato_late_blight','Tomato___Leaf_Mold':'tomato_leaf_mold','Tomato___Septoria_leaf_spot':'tomato_septoria_leaf_spot',
'Tomato___Spider_mites Two-spotted_spider_mite':'tomato_spider_mites','Tomato___Target_Spot':'tomato_target_spot','Tomato___Tomato_Yellow_Leaf_Curl_Virus':'tomato_yellow_leaf_curl_virus','Tomato___Tomato_mosaic_virus':'tomato_mosaic_virus','Tomato___healthy':'tomato_healthy',
# v2: new crops
'Apple___Apple_scab':'apple_scab','Apple___Black_rot':'apple_black_rot','Apple___Cedar_apple_rust':'apple_cedar_rust','Apple___healthy':'apple_healthy',
'Cherry_(including_sour)___Powdery_mildew':'cherry_powdery_mildew','Cherry_(including_sour)___healthy':'cherry_healthy',
'Orange___Haunglongbing_(Citrus_greening)':'orange_citrus_greening',
'Peach___Bacterial_spot':'peach_bacterial_spot','Peach___healthy':'peach_healthy',
'Soybean___healthy':'soybean_healthy','Squash___Powdery_mildew':'squash_powdery_mildew',
'Strawberry___Leaf_scorch':'strawberry_leaf_scorch','Strawberry___healthy':'strawberry_healthy',
# minor crops kept as "other leaf" so unknown crops are not forced into a known one
'Blueberry___healthy':'other_leaf','Raspberry___healthy':'other_leaf'}
PDMAP={'Bell_pepper leaf':'pepper_healthy','Bell_pepper leaf spot':'pepper_bacterial_spot','Corn Gray leaf spot':'corn_gray_leaf_spot','Corn leaf blight':'corn_leaf_blight','Corn rust leaf':'corn_common_rust',
'Potato leaf early blight':'potato_early_blight','Potato leaf late blight':'potato_late_blight','Tomato Early blight leaf':'tomato_early_blight','Tomato Septoria leaf spot':'tomato_septoria_leaf_spot','Tomato leaf':'tomato_healthy',
'Tomato leaf bacterial spot':'tomato_bacterial_spot','Tomato leaf late blight':'tomato_late_blight','Tomato leaf mosaic virus':'tomato_mosaic_virus','Tomato leaf yellow virus':'tomato_yellow_leaf_curl_virus','Tomato mold leaf':'tomato_leaf_mold',
'Tomato two spotted spider mites leaf':'tomato_spider_mites','grape leaf':'grape_healthy','grape leaf black rot':'grape_black_rot',
'Apple Scab Leaf':'apple_scab','Apple leaf':'apple_healthy','Apple rust leaf':'apple_cedar_rust','Cherry leaf':'cherry_healthy','Peach leaf':'peach_healthy',
'Soyabean leaf':'soybean_healthy','Squash Powdery mildew leaf':'squash_powdery_mildew','Strawberry leaf':'strawberry_healthy',
'Blueberry leaf':'other_leaf','Raspberry leaf':'other_leaf'}
RICE=f'{EXT}/PawarMukesh_RiceLeaf-Disease-Detector/bacterical disease'
RICEMAP={'Bacterial leaf blight':'rice_bacterial_leaf_blight','Brown spot':'rice_brown_spot','Leaf smut':'rice_leaf_smut'}
COT=f'{EXT}/auchinto-c_Cotton-Disease-Prediction/Datasets'
COTMAP={'fresh cotton leaf':'cotton_healthy','fresh cotton plant':'cotton_healthy','diseased cotton leaf':'cotton_leaf_disease','diseased cotton plant':'cotton_leaf_disease'}
CLASSES=sorted(set(PVMAP.values())|set(RICEMAP.values())|set(COTMAP.values()))
CLASSES=[c for c in CLASSES if c!='other_leaf']+['other_leaf']
rng=random.Random(42)
tr=[];te=[]
for d,c in PVMAP.items():
    fs=sorted(glob.glob(f'{PV}/{d}/*')); rng.shuffle(fs)
    ntr=250 if c=='other_leaf' else 400
    te+=[(f,c,0,'pv') for f in fs[:100]]
    tr+=[(f,c,1,'pv') for f in fs[100:100+ntr]]
for split,lst,naug in [('train',tr,4),('test',te,0)]:
    for d,c in PDMAP.items():
        for f in sorted(glob.glob(f'{PD}/{split}/{d}/*')): lst.append((f,c,naug,'pd'))
for d,c in RICEMAP.items():
    fs=sorted(glob.glob(f'{RICE}/{d}/*')); rng.shuffle(fs)
    te+=[(f,c,0,'rice') for f in fs[:10]]; tr+=[(f,c,8,'rice') for f in fs[10:]]
for d,c in COTMAP.items():
    fs=sorted(glob.glob(f'{COT}/train/{d}/*')); rng.shuffle(fs)
    tr+=[(f,c,1,'cotton') for f in fs[:250]]
    te+=[(f,c,0,'cotton') for f in sorted(glob.glob(f'{COT}/val/{d}/*'))]
sess=ort.InferenceSession(feat_model(dst=f'{OUT}/mnv2_feat.onnx'),providers=['CPUExecutionProvider'])
def run(items,tag):
    X=[];Y=[];S=[];P=[];buf=[];t=time.time()
    def flush():
        if buf:
            X.append(sess.run(None,{'input':np.stack([b[0] for b in buf])})[0]); Y.extend(b[1] for b in buf); S.extend(b[2] for b in buf); P.extend(b[3] for b in buf); buf.clear()
    for i,(f,c,naug,src) in enumerate(items):
        try: im=Image.open(f).convert('RGB')
        except Exception: continue
        if max(im.size)>800: im.thumbnail((800,800))
        buf.append((prep(im),CLASSES.index(c),src,f))
        for _ in range(naug): buf.append((prep(augment(im,rng)),CLASSES.index(c),src,f))
        if len(buf)>=48: flush()
        if i%1000==0: print(tag,i,len(items),round(time.time()-t),flush=True)
    flush()
    np.savez(f'{OUT}/feat_{tag}.npz',X=np.concatenate(X),y=np.array(Y),src=np.array(S),path=np.array(P))
json.dump(CLASSES,open(f'{OUT}/classes.json','w'))
print('classes',len(CLASSES),'train items',len(tr),'test items',len(te),flush=True)
run(te,'test'); run(tr,'train'); print('DONE',flush=True)
