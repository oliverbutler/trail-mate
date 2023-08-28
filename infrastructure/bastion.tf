resource "aws_key_pair" "bastion_key" {
  key_name   = "bastion_key"
  public_key = file("~/.ssh/olly.pub")
}

resource "aws_security_group" "bastion_sg" {
  name        = "bastion_sg"
  description = "Bastion Security Group"

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [
      "154.57.233.120/32" # Family's Home
    ]
  }

  ingress {
    from_port   = 41641
    to_port     = 41641
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "bastion" {
  ami           = "ami-062ec2beae7c79c8e"
  instance_type = "t4g.nano"

  key_name                    = aws_key_pair.bastion_key.key_name
  security_groups             = [aws_security_group.bastion_sg.name]
  associate_public_ip_address = true

  tags = {
    Name = "Bastion Host"
  }
}

resource "aws_eip" "bastion_eip" {
  instance = aws_instance.bastion.id
}

output "bastion_ip" {
  value = aws_eip.bastion_eip.public_ip
}
