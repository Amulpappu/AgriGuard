"""Train produce heads (identity incl. 'leaf' router class, and condition) and add them to the v2 ONNX."""
import json, sys, numpy as np, onnx
from onnx import helper, numpy_helper as nh, TensorProto
from sklearn.neural_network import MLPClassifier
ML2='/tmp/claude-0/ml2'; ML3='/tmp/claude-0/ml3'
pc=json.load(open(f'{ML3}/produce_classes.json')); CROPS=pc['crops']+['leaf']; COND=pc['conditions']
tr0=np.load(f'{ML3}/feat_train.npz'); te=np.load(f'{ML3}/feat_test.npz'); pl=np.load(f'{ML3}/feat_piles.npz')
rt=np.load(f'{ML3}/feat_realtom_train.npz'); rte=np.load(f'{ML3}/feat_realtom_test.npz')
tr={k:np.concatenate([tr0[k],pl[k],rt[k]]) for k in ['X','crop','cond','src']}
te={k:np.concatenate([te[k],rte[k]]) for k in ['X','crop','cond','src']}
l2tr=np.load(f'{ML2}/feat_train.npz'); l2te=np.load(f'{ML2}/feat_test.npz')
rng=np.random.default_rng(0)
li=rng.choice(len(l2tr['X']),4000,replace=False); lti=rng.choice(len(l2te['X']),800,replace=False)
LEAF=len(CROPS)-1
Xid=np.concatenate([tr['X'],l2tr['X'][li]]); yid=np.concatenate([tr['crop'],np.full(len(li),LEAF)])
Xte_id=np.concatenate([te['X'],l2te['X'][lti]]); yte_id=np.concatenate([te['crop'],np.full(len(lti),LEAF)])
def fit(X,y,alpha=0.03):
    mu,sd=X.mean(0),X.std(0)+1e-6
    m=MLPClassifier(hidden_layer_sizes=(256,),alpha=alpha,max_iter=200,early_stopping=True,random_state=0).fit((X-mu)/sd,y)
    W1=(m.coefs_[0]/sd[:,None]).T.astype(np.float32); b1=(m.intercepts_[0]-(mu/sd)@m.coefs_[0]).astype(np.float32)
    W2=m.coefs_[1].T.astype(np.float32); b2=m.intercepts_[1].astype(np.float32)
    # sklearn drops classes absent from y; map to full index
    full=np.full((max(y.max()+1,len(m.classes_)),W2.shape[1]),0,np.float32); fb=np.full(full.shape[0],-30.0,np.float32)
    full[m.classes_]=W2; fb[m.classes_]=b2
    return W1,b1,full,fb
def sm(z): z=z-z.max(1,keepdims=True); e=np.exp(z); return e/e.sum(1,keepdims=True)
def pred(h,X): W1,b1,W2,b2=h; return sm(np.maximum(X@W1.T+b1,0)@W2.T+b2)
hid=fit(Xid,yid); P=pred(hid,Xte_id)
acc=(P.argmax(1)==yte_id)
src=np.concatenate([te['src'],np.full(len(lti),'leaf')])
for s in ['f360','freshrot','potdis','realtom','leaf']: print('identity acc',s,round(float(acc[src==s].mean()),3),'n=',int((src==s).sum()))
# leaf photos misrouted to produce (router error) and produce routed to leaf
print('leaf->produce',round(float((P[src=='leaf'].argmax(1)!=LEAF).mean()),3),' produce->leaf',round(float((P[src!='leaf'].argmax(1)==LEAF).mean()),3))
hcond=fit(tr['X'],tr['cond']); Q=pred(hcond,te['X'])
def cond_eval(mask,allowed):
    q=Q[mask][:,allowed]; return float((np.array(allowed)[q.argmax(1)]==te['cond'][mask]).mean())
pot=te['crop']==CROPS.index('potato'); fr=te['src']=='freshrot'
print('potato condition acc (6 classes incl healthy)',round(cond_eval((te['src']=='potdis'),list(range(len(COND)))),3))
print('fresh vs rotten acc (apple/banana/orange real photos)',round(cond_eval(fr,[0,1]),3))
print('fresh f360 produce called fresh',round(cond_eval(te['src']=='f360',[0,1]),3))
json.dump(dict(identity_classes=CROPS,conditions=COND),open(f'{ML3}/produce_meta.json','w'))
if '--export' in sys.argv:
    m=onnx.load(f'{ML2}/agriguard-leaf-v2.onnx'); g=m.graph
    for name,(W1,b1,W2,b2) in [('pid',hid),('pcond',hcond)]:
        g.initializer.extend([nh.from_array(W1,f'{name}_W1'),nh.from_array(b1,f'{name}_b1'),nh.from_array(W2,f'{name}_W2'),nh.from_array(b2,f'{name}_b2')])
        g.node.extend([helper.make_node('Gemm',['472',f'{name}_W1',f'{name}_b1'],[f'{name}_h'],transB=1),helper.make_node('Relu',[f'{name}_h'],[f'{name}_hr']),
                       helper.make_node('Gemm',[f'{name}_hr',f'{name}_W2',f'{name}_b2'],[f'{name}_logits'],transB=1)])
        g.output.extend([helper.make_tensor_value_info(f'{name}_logits',TensorProto.FLOAT,['batch_size',W2.shape[0]])])
    onnx.checker.check_model(m); onnx.save(m,f'{ML3}/agriguard-leaf-v2.onnx'); print('exported', [o.name for o in g.output])
