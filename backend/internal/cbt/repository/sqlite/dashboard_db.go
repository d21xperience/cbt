package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"cbt-engine-service/internal/cbt/domain"
)

// GetParticipantNISN — resolve participant_id → nisn
func (r *ExamDB) GetParticipantNISN(ctx context.Context, participantID string) (string, error) {
	var nisn string
	err := r.DB.QueryRowContext(ctx,
		`SELECT nisn FROM eligible_participants WHERE participant_id = ? LIMIT 1`,
		participantID).Scan(&nisn)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return nisn, err
}

// GetParticipantDashboard — 3 section response
func (r *ExamDB) GetParticipantDashboard(ctx context.Context, participantID string) (*domain.DashboardResponse, error) {
	resp := &domain.DashboardResponse{
		Scheduled: []domain.DashboardExamItem{},
		Makeup:    []domain.DashboardExamItem{},
		Completed: []domain.CompletedExamItem{},
	}

	// 1. Scheduled + Makeup (dari participant_sessions)
	const q = `
		SELECT es.exam_id, es.id, COALESCE(e.title, es.exam_id),
		       es.session_type, es.start_time, es.end_time, es.status,
		       COALESCE(ps.is_makeup, 0), COALESCE(ps.makeup_reason, '')
		FROM participant_sessions ps
		JOIN exam_sessions es ON es.id = ps.session_id
		LEFT JOIN exams e ON e.id = es.exam_id
		WHERE ps.participant_id = ?
		ORDER BY es.start_time ASC`

	rows, err := r.DB.QueryContext(ctx, q, participantID)
	if err != nil {
		return nil, fmt.Errorf("dashboard query: %w", err)
	}
	defer rows.Close()

	now := time.Now()
	for rows.Next() {
		var it domain.DashboardExamItem
		var isMakeup int
		if err := rows.Scan(&it.ExamID, &it.SessionID, &it.Title,
			&it.SessionType, &it.StartTime, &it.EndTime, &it.SessionStatus,
			&isMakeup, &it.MakeupReason); err != nil {
			return nil, err
		}
		it.IsMakeup = isMakeup == 1

		// Derived status
		start, _ := time.Parse(time.RFC3339, it.StartTime)
		end, _ := time.Parse(time.RFC3339, it.EndTime)
		switch {
		case it.SessionStatus == "CLOSED":
			// skip — sudah selesai
			continue
		case now.Before(start):
			it.SessionStatus = "NOT_STARTED"
		case now.After(end):
			it.SessionStatus = "EXPIRED"
		default:
			it.SessionStatus = "ACTIVE"
		}

		if it.IsMakeup {
			resp.Makeup = append(resp.Makeup, it)
		} else {
			resp.Scheduled = append(resp.Scheduled, it)
		}
	}

	// 2. Completed (dari exam_results)
	const qc = `
		SELECT er.exam_id, COALESCE(e.title, er.exam_id),
		       er.total_questions, er.correct_answers, er.final_score,
		       er.status, er.submitted_at
		FROM exam_results er
		LEFT JOIN exams e ON e.id = er.exam_id
		WHERE er.participant_id = ?
		ORDER BY er.submitted_at DESC`

	rowsC, err := r.DB.QueryContext(ctx, qc, participantID)
	if err != nil {
		return nil, err
	}
	defer rowsC.Close()

	for rowsC.Next() {
		var c domain.CompletedExamItem
		var submittedAt string
		if err := rowsC.Scan(&c.ExamID, &c.Title, &c.TotalQuestions,
			&c.CorrectAnswers, &c.FinalScore, &c.Status, &submittedAt); err != nil {
			return nil, err
		}
		c.SubmittedAt = submittedAt
		resp.Completed = append(resp.Completed, c)
	}

	return resp, nil
}
