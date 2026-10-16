"""Train MLP head on v2 features, evaluate, export ONNX (MobileNetV2 + head)."""
import json, sys, numpy as np, onnx
from onnx import helper, numpy_helper as nh, TensorProto
from sklearn.neural_network import MLPClassifier
ML='/tmp/claude-0/ml2'; alpha=float(sys.argv[1]) if len(sys.argv)>1 else 0.03
cls=json.load(open(f'{ML}/classes.json'))
tr=np.load(f'{ML}/feat_train.npz'); te=np.load(f'{ML}/feat_test.npz')
X,y,src=tr['X'],tr['y'],tr['src']; mu,sd=X.mean(0),X.std(0)+1e-6
field=np.where(np.isin(src,['pd','cotton','rice']))[0]
rep=np.concatenate([np.arange(len(y))]+[field]*2)  # field photos x3
m=MLPClassifier(hidden_layer_sizes=(256,),alpha=alpha,max_iter=200,early_stopping=True,random_state=0)
m.fit((X[rep]-mu)/sd,y[rep])
W1=(m.coefs_[0]/sd[:,None]).T.astype(np.float32); b1=(m.intercepts_[0]-(mu/sd)@m.coefs_[0]).astype(np.float32)
W2=m.coefs_[1].T.astype(np.float32); b2=m.intercepts_[1].astype(np.float32)
np.savez(f'{ML}/mlp_{alpha}.npz',W1=W1,b1=b1,W2=W2,b2=b2)
def softmax(z): z=z-z.max(1,keepdims=True); e=np.exp(z); return e/e.sum(1,keepdims=True)
P=softmax(np.maximum(te['X']@W1.T+b1,0)@W2.T+b2); Y=te['y']; S=te['src']
crops=sorted({c.split('_')[0] for c in cls if c!='other_leaf'})
def ev(mask):
    ok=[];auto=[]
    for p,t in zip(P[mask],Y[mask]):
        c=cls[t]
        if c=='other_leaf': continue
        cr=c.split('_')[0]; idx=[j for j,k in enumerate(cls) if k.startswith(cr+'_')]
        ok.append(idx[int(np.argmax(p[idx]))]==t)
        sc={k:p[[j for j,q in enumerate(cls) if q.startswith(k+'_')]].sum() for k in crops}
        auto.append(max(sc,key=sc.get)==cr)
    return dict(n=len(ok),crop_selected_acc=round(float(np.mean(ok)),3),crop_detect_acc=round(float(np.mean(auto)),3))
res={}
for name,mask in [('plantvillage_lab_holdout',S=='pv'),('plantdoc_field_test',S=='pd'),('rice_holdout',S=='rice'),('cotton_val',S=='cotton')]:
    res[name]=ev(mask); print(name,res[name])
# per crop on PV holdout
per={}
for cr in crops:
    mk=(S=='pv')&np.array([cls[t].startswith(cr+'_') for t in Y])
    if mk.sum(): per[cr]=ev(mk)['crop_selected_acc']
print('per-crop lab acc',per)
json.dump(dict(alpha=alpha,metrics=res,per_crop_lab=per),open(f'{ML}/metrics_{alpha}.json','w'),indent=1)
if '--export' in sys.argv:
    g_model=onnx.load('/tmp/claude-0/ml/mobilenetv2-12.onnx'); g=g_model.graph
    g.node.remove([n for n in g.node if 'output' in n.output][0])
    used={i for n in g.node for i in n.input}
    for init in list(g.initializer):
        if init.name not in used: g.initializer.remove(init)
    g.initializer.extend([nh.from_array(W1,'ag_W1'),nh.from_array(b1,'ag_b1'),nh.from_array(W2,'ag_W2'),nh.from_array(b2,'ag_b2')])
    g.node.extend([helper.make_node('Gemm',['472','ag_W1','ag_b1'],['ag_h'],transB=1),helper.make_node('Relu',['ag_h'],['ag_hr']),
                   helper.make_node('Gemm',['ag_hr','ag_W2','ag_b2'],['logits'],transB=1)])
    del g.output[:]; g.output.extend([helper.make_tensor_value_info('logits',TensorProto.FLOAT,['batch_size',len(cls)])])
    onnx.checker.check_model(g_model); onnx.save(g_model,f'{ML}/agriguard-leaf-v2.onnx'); print('exported')
