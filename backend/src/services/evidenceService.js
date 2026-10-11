const EVIDENCE_GRADES = [
  { grade: 'A', minimumScore: 0.8 },
  { grade: 'B', minimumScore: 0.65 },
  { grade: 'C', minimumScore: 0.5 },
  { grade: 'D', minimumScore: 0 }
];

function getEvidenceGrade(score) {
  if (!Number.isFinite(score)) return { grade: 'D', confidence: 0 };
  const normalizedScore = Math.max(0, Math.min(1, score));
  const match = EVIDENCE_GRADES.find(({ minimumScore }) => normalizedScore >= minimumScore);
  return {
    grade: match.grade,
    confidence: Number(normalizedScore.toFixed(3))
  };
}

/**
 * Add stable, user-facing evidence metadata to retrieved chunks.
 *
 * The grade is a retrieval-strength indicator, not a claim that the source
 * has been independently fact-checked.
 *
 * @param {import('./queryService.js').RetrievedChunk[]} chunks
 * @returns {Array<import('./queryService.js').RetrievedChunk & {sourceNumber: number, evidenceGrade: string, confidence: number}>}
 */
export function addEvidenceMetadata(chunks) {
  return chunks.map((chunk, index) => {
    const evidence = getEvidenceGrade(Number(chunk.score));
    return {
      ...chunk,
      sourceNumber: index + 1,
      evidenceGrade: evidence.grade,
      confidence: evidence.confidence
    };
  });
}

export { getEvidenceGrade };
