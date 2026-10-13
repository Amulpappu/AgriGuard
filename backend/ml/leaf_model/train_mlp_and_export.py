"""Train the MLP head on extracted features and export one ONNX file (MobileNetV2 + head).
Usage: python train_mlp_and_export.py   (after extract.py)
"""
import json, numpy as np, onnx
from onnx import helper, numpy_helper as nh, TensorProto
from sklearn.neural_network import MLPClassifier
ML = "/tmp/claude-0/ml"  # change to your working folder
cls = json.load(open(f"{ML}/classes.json"))
tr = np.load(f"{ML}/feat_train.npz")
X, y, src = tr["X"], tr["y"], tr["src"]
mu, sd = X.mean(0), X.std(0) + 1e-6
rep = np.concatenate([np.arange(len(y))] + [np.where(src == "pd")[0]] * 2)  # field photos x3
m = MLPClassifier(hidden_layer_sizes=(256,), alpha=0.03, max_iter=200, early_stopping=True, random_state=0)
m.fit((X[rep] - mu) / sd, y[rep])
W1 = (m.coefs_[0] / sd[:, None]).T.astype(np.float32); b1 = (m.intercepts_[0] - (mu / sd) @ m.coefs_[0]).astype(np.float32)
W2 = m.coefs_[1].T.astype(np.float32); b2 = m.intercepts_[1].astype(np.float32)
g_model = onnx.load(f"{ML}/mobilenetv2-12.onnx"); g = g_model.graph
g.node.remove([n for n in g.node if "output" in n.output][0])
used = {i for n in g.node for i in n.input}
for init in list(g.initializer):
    if init.name not in used: g.initializer.remove(init)
g.initializer.extend([nh.from_array(W1, "ag_W1"), nh.from_array(b1, "ag_b1"), nh.from_array(W2, "ag_W2"), nh.from_array(b2, "ag_b2")])
g.node.extend([helper.make_node("Gemm", ["472", "ag_W1", "ag_b1"], ["ag_h"], transB=1), helper.make_node("Relu", ["ag_h"], ["ag_hr"]),
               helper.make_node("Gemm", ["ag_hr", "ag_W2", "ag_b2"], ["logits"], transB=1)])
del g.output[:]; g.output.extend([helper.make_tensor_value_info("logits", TensorProto.FLOAT, ["batch_size", len(cls)])])
onnx.checker.check_model(g_model); onnx.save(g_model, f"{ML}/agriguard-leaf-v1.onnx")
print("saved", f"{ML}/agriguard-leaf-v1.onnx")
