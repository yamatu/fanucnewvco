//go:build ticket_tool
// +build ticket_tool

package main

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to database
	config.ConnectDatabase()
	db := config.GetDB()

	log.Println("Creating ticket tables manually...")

	// Create tables
	if err := db.AutoMigrate(&models.Ticket{}); err != nil {
		log.Fatalf("Failed to create tickets table: %v", err)
	}
	log.Println("✓ Created tickets table")

	if err := db.AutoMigrate(&models.TicketReply{}); err != nil {
		log.Fatalf("Failed to create ticket_replies table: %v", err)
	}
	log.Println("✓ Created ticket_replies table")

	if err := db.AutoMigrate(&models.TicketAttachment{}); err != nil {
		log.Fatalf("Failed to create ticket_attachments table: %v", err)
	}
	log.Println("✓ Created ticket_attachments table")

	log.Println("All ticket tables created successfully!")
}
