package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"math/big"
)

var (
	ErrInvalidKey        = errors.New("invalid encryption key")
	ErrInvalidCiphertext = errors.New("invalid ciphertext")
)

type Cipher struct {
	aead cipher.AEAD
}

// NewCipherFromHex — key harus 32 byte (64 hex chars)
func NewCipherFromHex(hexKey string) (*Cipher, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidKey, err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("%w: butuh 32 byte (64 hex chars), dapat %d", ErrInvalidKey, len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Cipher{aead: aead}, nil
}

func (c *Cipher) Encrypt(plaintext string) (ciphertext, iv []byte, err error) {
	nonce := make([]byte, c.aead.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, err
	}
	ct := c.aead.Seal(nil, nonce, []byte(plaintext), nil)
	return ct, nonce, nil
}

func (c *Cipher) Decrypt(ciphertext, iv []byte) (string, error) {
	if len(iv) != c.aead.NonceSize() {
		return "", ErrInvalidCiphertext
	}
	pt, err := c.aead.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return "", ErrInvalidCiphertext
	}
	return string(pt), nil
}

// alphabet tanpa karakter membingungkan (0/O, 1/I/L)
const passwordAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// GenerateRandomPassword — 6 karakter uppercase + digit, aman dari typo kartu
func GenerateRandomPassword(length int) (string, error) {
	if length <= 0 {
		length = 6
	}
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(passwordAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = passwordAlphabet[n.Int64()]
	}
	return string(b), nil
}
