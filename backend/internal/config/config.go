package config

import (
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

type Config struct {
	AppPort       string `mapstructure:"APP_PORT"`
	DbSource      string `mapstructure:"DB_SOURCE"`
	RedisAddr     string `mapstructure:"REDIS_ADDR"`
	RedisPassword string `mapstructure:"REDIS_PASSWORD"`
	AllowedOrigin string `mapstructure:"ALLOWED_ORIGIN"`

	// TAMBAHAN BARU
	JWTSecret     string `mapstructure:"JWT_SECRET"`
	SiakadBaseURL string `mapstructure:"SIAKAD_BASE_URL"`

	CredentialsEncryptionKey string `mapstructure:"CREDENTIALS_ENCRYPTION_KEY"`
}

func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		log.Error().Err(err).Msg("Gagal membaca file .env CBT Engine")
		return config, nil
	}

	err = viper.Unmarshal(&config)
	return
}
