import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from model.cnn_model import NaiveBayesClassifier, CNNClassifier, VisualClassifier

print("Training NaiveBayes...")
nb = NaiveBayesClassifier()

print("Training MLP...")
cnn = CNNClassifier()

print("Training Visual Classifier...")
vis = VisualClassifier()

print()
print("=" * 50)
print("TEST RESULTS")
print("=" * 50)

texts_genuine = [
    "sertifikat webinar PPNI kemenkes SKP resmi DPD padang alfitri",
    "A0.a0 00001 sertifikat resmi valid PPNI keperawatan",
    "diberikan kepada peserta webinar keperawatan DPD PPNI kota padang",
    "Dr Ns Alfitri MKep SpMB ketua PPNI kemenkes valid resmi",
]

print("\n[GENUINE TESTS]")
for t in texts_genuine:
    nb_s, nb_sc = nb.predict(t)
    cnn_s, cnn_sc = cnn.predict(t)
    ens = 0.4 * nb_sc + 0.6 * cnn_sc
    label = "Genuine" if ens >= 0.5 else "Suspicious"
    ok = "OK" if label == "Genuine" else "FAIL"
    print(f"  [{ok}] NB={nb_sc:.2f} MLP={cnn_sc:.2f} ENS={ens:.2f} -> {label}")

texts_susp = [
    "fake palsu template tidak resmi tidak valid dibeli online",
    "lorem ipsum sample template demonstration placeholder",
    "tampered modified signature forged certificate diploma mill",
    "sertifikat kosong tanpa tanda tangan tanpa nomor palsu",
]

print("\n[SUSPICIOUS TESTS]")
for t in texts_susp:
    nb_s, nb_sc = nb.predict(t)
    cnn_s, cnn_sc = cnn.predict(t)
    ens = 0.4 * nb_sc + 0.6 * cnn_sc
    label = "Genuine" if ens >= 0.5 else "Suspicious"
    ok = "OK" if label == "Suspicious" else "FAIL"
    print(f"  [{ok}] NB={nb_sc:.2f} MLP={cnn_sc:.2f} ENS={ens:.2f} -> {label}")

print()
print(f"Visual model trained: {vis.is_trained}")
print("=" * 50)
print("TRAINING DONE - Models saved to .pkl files")
print("=" * 50)
