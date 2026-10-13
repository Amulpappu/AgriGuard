import numpy as np, onnx, onnxruntime as ort, random
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
MEAN=np.array([0.485,0.456,0.406],np.float32); STD=np.array([0.229,0.224,0.225],np.float32)
def feat_model(src='/tmp/claude-0/ml/mobilenetv2-12.onnx', dst='/tmp/claude-0/ml/mnv2_feat.onnx'):
    m=onnx.load(src); g=m.graph
    vi=onnx.helper.make_tensor_value_info('472',onnx.TensorProto.FLOAT,None)
    del g.output[:]; g.output.extend([vi]); onnx.save(m,dst); return dst
def prep(img, size=224):
    img=ImageOps.exif_transpose(img).convert('RGB')
    w,h=img.size; s=256/min(w,h); img=img.resize((max(224,round(w*s)),max(224,round(h*s))),Image.BILINEAR)
    w,h=img.size; l=(w-size)//2; t=(h-size)//2; img=img.crop((l,t,l+size,t+size))
    a=(np.asarray(img,np.float32)/255.-MEAN)/STD
    return a.transpose(2,0,1)
def augment(img, rng):
    img=img.convert('RGB'); w,h=img.size
    sc=rng.uniform(0.6,1.0); cw,ch=int(w*sc),int(h*sc); x=rng.randint(0,w-cw); y=rng.randint(0,h-ch)
    img=img.crop((x,y,x+cw,y+ch))
    if rng.random()<0.5: img=img.transpose(Image.FLIP_LEFT_RIGHT)
    if rng.random()<0.3: img=img.transpose(Image.FLIP_TOP_BOTTOM)
    img=img.rotate(rng.uniform(-30,30),resample=Image.BILINEAR,expand=False)
    img=ImageEnhance.Brightness(img).enhance(rng.uniform(0.6,1.4))
    img=ImageEnhance.Contrast(img).enhance(rng.uniform(0.7,1.3))
    img=ImageEnhance.Color(img).enhance(rng.uniform(0.7,1.3))
    if rng.random()<0.3: img=img.filter(ImageFilter.GaussianBlur(rng.uniform(0.5,1.8)))
    if rng.random()<0.3:
        q=rng.randint(25,70); import io; b=io.BytesIO(); img.save(b,'JPEG',quality=q); img=Image.open(b).convert('RGB')
    return img
