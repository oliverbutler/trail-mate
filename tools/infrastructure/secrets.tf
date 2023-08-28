resource "aws_secretsmanager_secret" "db_connection_string" {
  name        = "db_connection_string"
  description = "DB credentials as JSON"
}


