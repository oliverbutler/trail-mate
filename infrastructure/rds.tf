resource "aws_db_instance" "trail_mate_db" {
  allocated_storage = 20  # minimum allowed for PostgreSQL
  storage_type      = "gp2"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.micro"

  username = "trailmate"
  password = "password"
  db_name  = "trailmatedb"

  identifier = "trail-mate-db"

  skip_final_snapshot = true

  vpc_security_group_ids = [aws_security_group.trail_mate_db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.trail_mate_db_subnet_group.name
}

resource "aws_security_group" "trail_mate_db_sg" {
  vpc_id = aws_vpc.trail_mate_vpc.id
  name   = "trail-mate-db-sg"

  #  Allow traffic from within the VPC
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.trail_mate_vpc.cidr_block]
  }
}

resource "aws_db_subnet_group" "trail_mate_db_subnet_group" {
  name       = "trail-mate-db-subnet-group"
  subnet_ids = [aws_subnet.trail_mate_subnet_a.id, aws_subnet.trail_mate_subnet_b.id]
}


output "db_endpoint" {
  value = aws_db_instance.trail_mate_db.endpoint
}
