resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "db_credentials"
  description = "DB credentials as JSON"
}


