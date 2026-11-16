package domain

type Room struct {
	ID        string `json:"id"`
	Nama      string `json:"nama"`
	Kapasitas int    `json:"kapasitas"`
	Gedung    string `json:"gedung,omitempty"`
}
