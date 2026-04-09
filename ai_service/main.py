"""
CertyChain AI Service — FastAPI
================================
Endpoints:
  POST /predict        → Text-based detection
  POST /predict/image  → Image-based detection (JPG/PNG upload)
  GET  /health         → Service status
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys, os, io

sys.path.insert(0, os.path.dirname(__file__))
from model.cnn_model import NaiveBayesClassifier, CNNClassifier, VisualClassifier

app = FastAPI(title="CertyChain AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Initialize models at startup ────────────────────────────────────────────
print("=" * 55)
print("🧠 CertyChain AI Service v2.0 — Initializing models...")
print("   Dataset: Appskep Indonesia (57 genuine certificates)")
print("=" * 55)
nb_model  = NaiveBayesClassifier()
cnn_model = CNNClassifier()
vis_model = VisualClassifier()
print("=" * 55)
print("✅ All AI models ready.")
print("=" * 55)


# ─── Schemas ─────────────────────────────────────────────────────────────────
class PredictRequest(BaseModel):
    text: str

class PredictResponse(BaseModel):
    status: str
    confidence: float
    naive_bayes_score: float
    cnn_score: float
    detail: str


# ─── Text Prediction Endpoint ─────────────────────────────────────────────────
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Predict certificate authenticity from text.
    Ensemble: 40% NaiveBayes + 60% MLP
    """
    if not req.text or len(req.text.strip()) < 3:
        raise HTTPException(status_code=400, detail="Text terlalu pendek untuk dianalisis.")

    nb_status,  nb_score  = nb_model.predict(req.text)
    cnn_status, cnn_score = cnn_model.predict(req.text)

    # Ensemble: 40% NB + 60% CNN
    combined = 0.4 * nb_score + 0.6 * cnn_score
    status   = "Genuine" if combined >= 0.5 else "Suspicious"

    return PredictResponse(
        status=status,
        confidence=round(combined, 4),
        naive_bayes_score=round(nb_score, 4),
        cnn_score=round(cnn_score, 4),
        detail=(
            f"NaiveBayes={nb_status}({nb_score:.2%}), "
            f"CNN-MLP={cnn_status}({cnn_score:.2%}), "
            f"Ensemble={status}({combined:.2%})"
        ),
    )


# ─── Image Prediction Endpoint ────────────────────────────────────────────────
@app.post("/predict/image", response_model=PredictResponse)
async def predict_image(file: UploadFile = File(...)):
    """
    Predict certificate authenticity from uploaded image.
    Uses visual feature extraction (color, layout, structure).
    Ensemble: 70% Visual + 30% placeholder text score.
    """
    if not vis_model.is_trained:
        raise HTTPException(status_code=503, detail="Model visual belum siap. Coba lagi sebentar.")

    allowed = {"image/jpeg", "image/png", "image/jpg"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Format tidak didukung: {file.content_type}. Gunakan JPG/PNG.")

    try:
        from PIL import Image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal membaca gambar: {str(e)}")

    vis_status, vis_score = vis_model.predict_image(img)

    # Image-only confidence (visual is primary)
    confidence = round(vis_score, 4)
    status = "Genuine" if confidence >= 0.5 else "Suspicious"

    return PredictResponse(
        status=status,
        confidence=confidence,
        naive_bayes_score=round(vis_score, 4),
        cnn_score=round(vis_score, 4),
        detail=(
            f"Visual={vis_status}({vis_score:.2%}), "
            f"Dataset=Appskep Indonesia (57 sertifikat genuine), "
            f"Result={status}({confidence:.2%})"
        ),
    )


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "version": "2.0.0",
        "models": ["NaiveBayes-Appskep", "CNN-MLP-Appskep", "VisualClassifier-Pillow"],
        "dataset": "Appskep Indonesia 57 genuine certificates",
        "visual_ready": vis_model.is_trained,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
