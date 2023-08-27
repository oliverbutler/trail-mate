terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "eu-west-2"
}

resource "aws_s3_bucket" "bucket" {
  bucket = "trail-mate"
}

resource "aws_s3_bucket" "logs" {
  bucket = "trail-mate-logs"
}

resource "aws_budgets_budget" "warning" {
  budget_type       = "COST"
  limit_amount      = "10"
  limit_unit        = "USD"
  time_period_start = "2023-08-01_00:00"
  time_unit         = "MONTHLY"
}

variable "environment" {
  type    = string
  default = "prod"
}

