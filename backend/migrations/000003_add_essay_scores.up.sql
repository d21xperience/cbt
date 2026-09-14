CREATE TABLE IF NOT EXISTS essay_scores (
    participant_id TEXT NOT NULL,
    exam_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    score REAL NOT NULL,
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(participant_id, exam_id, question_id)
);