resource "aws_key_pair" "bastion_key" {
  key_name   = "bastion_key"
  public_key = file("~/.ssh/olly.pub")
}

resource "aws_security_group" "trail_mate_bastion_sg" {
  name        = "trail-mate-bastion-sg"
  description = "Bastion Security Group"

  vpc_id = aws_vpc.trail_mate_vpc.id

  # SSH access if you want to connect to the bastion host directly
  #  ingress {
  #    from_port   = 22
  #    to_port     = 22
  #    protocol    = "tcp"
  #    cidr_blocks = [
  #      "154.57.233.120/32"
  #    ]
  #  }

  ingress {
    from_port   = 41641
    to_port     = 41641
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Tailscale"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "tail_mate_bastion" {
  ami           = "ami-062ec2beae7c79c8e"
  instance_type = "t4g.nano"

  key_name                    = aws_key_pair.bastion_key.key_name
  vpc_security_group_ids      = [aws_security_group.trail_mate_bastion_sg.id]
  associate_public_ip_address = true

  subnet_id = aws_subnet.trail_mate_subnet_a.id


  tags = {
    Name = "Bastion"
  }
}

resource "aws_eip" "bastion_eip" {
  instance = aws_instance.tail_mate_bastion.id
}

output "bastion_ip" {
  value = aws_eip.bastion_eip.public_ip
}
