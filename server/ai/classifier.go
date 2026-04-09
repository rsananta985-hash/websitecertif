package ai

import (
	"log"
	"math"
	"strings"

	"github.com/jbrukh/bayesian"
)

const (
	Genuine    bayesian.Class = "Genuine"
	Suspicious bayesian.Class = "Suspicious"
)

// Classifier wraps the Naive Bayes classifier
type Classifier struct {
	classifier *bayesian.Classifier
}

// NewClassifier initializes and trains the Naive Bayes model
func NewClassifier() *Classifier {
	c := bayesian.NewClassifier(Genuine, Suspicious)

	genuineData := [][]string{
		{"university", "degree", "academic", "authorized", "registrar", "original", "authentic"},
		{"certified", "transcript", "bachelor", "master", "accredited", "institution", "official"},
		{"dean", "chancellor", "signature", "valid", "issued", "diploma", "graduation", "awarded"},
		{"academic", "record", "graduate", "stamp", "verified", "seal", "document", "completion"},
		{"lulus", "resmi", "ijazah", "asli", "universitas", "sarjana", "diploma", "terakreditasi"},
		{"achievement", "excellence", "conferred", "prescribed", "studies", "board", "certificate"},
		{"accredited", "recognized", "national", "institution", "department", "awarded", "honors"},
	}

	suspiciousData := [][]string{
		{"fake", "copy", "unauthorized", "invalid", "template", "sample", "replica"},
		{"tampered", "edited", "photoshop", "unverified", "temporary", "duplicate", "error"},
		{"buy", "online", "cheap", "discount", "certificate", "unofficial", "blank"},
		{"palsu", "tidak", "resmi", "murah", "beli", "kosong", "tidak-valid"},
		{"demonstration", "testing", "purposes", "placeholder", "example", "fill", "here"},
		{"mill", "purchased", "unapproved", "unaccredited", "forged", "altered", "void"},
		{"provisional", "not-official", "invalid-stamp", "rejected", "expired", "revoked"},
	}

	for _, data := range genuineData {
		c.Learn(data, Genuine)
	}
	for _, data := range suspiciousData {
		c.Learn(data, Suspicious)
	}

	log.Println("✅ Naive Bayes classifier trained")
	return &Classifier{classifier: c}
}

// Predict returns class label and raw log scores
func (c *Classifier) Predict(text string) (string, []float64) {
	tokens := strings.Fields(strings.ToLower(text))
	scores, _, _ := c.classifier.LogScores(tokens)
	if scores[0] > scores[1] {
		return string(Genuine), scores
	}
	return string(Suspicious), scores
}

// PredictScore returns class label and a normalized probability [0, 1]
func (c *Classifier) PredictScore(text string) (string, float64) {
	tokens := strings.Fields(strings.ToLower(text))
	scores, _, _ := c.classifier.LogScores(tokens)

	// Softmax on log scores
	genuineLog := scores[0]
	suspiciousLog := scores[1]

	// Avoid underflow by shifting
	maxLog := math.Max(genuineLog, suspiciousLog)
	expGenuine := math.Exp(genuineLog - maxLog)
	expSuspicious := math.Exp(suspiciousLog - maxLog)
	prob := expGenuine / (expGenuine + expSuspicious)

	if prob >= 0.5 {
		return string(Genuine), prob
	}
	return string(Suspicious), 1.0 - prob
}
