package domain

// ExamCardDTO represents the data needed for printing an exam card
type ExamCardDTO struct {
	ID          string `json:"id"`
	CardNumber  string `json:"card_number"`
	StudentID   string `json:"student_id"`
	StudentName string `json:"student_name"`
	StudentNIS  string `json:"student_nis"`
	StudentNISN string `json:"student_nisn"`
	ClassID     string `json:"class_id"`
	ClassNama   string `json:"class_nama"`
	Username    string `json:"username"`
	Password    string `json:"password"`  // Decrypted by usecase
	CardType    string `json:"card_type"` // "PERMANENT" or "TEMPORARY"
	Status      string `json:"status"`    // "ACTIVE"
	Reason      string `json:"reason,omitempty"`
}
