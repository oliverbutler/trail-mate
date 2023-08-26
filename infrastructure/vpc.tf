
resource "aws_vpc" "trail_mate_vpc" {
  cidr_block = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "trail-mate-vpc"
  }
}

resource "aws_subnet" "trail_mate_subnet_a" {
  vpc_id     = aws_vpc.trail_mate_vpc.id
  cidr_block = "10.0.1.0/24"
  availability_zone = "eu-west-2a"
  map_public_ip_on_launch = true
  tags = {
    Name = "trail-mate-subnet-a"
  }
}

resource "aws_subnet" "trail_mate_subnet_b" {
  vpc_id     = aws_vpc.trail_mate_vpc.id
  cidr_block = "10.0.2.0/24"
  availability_zone = "eu-west-2b"
  map_public_ip_on_launch = true
  tags = {
    Name = "trail-mate-subnet-b"
  }
}

resource "aws_internet_gateway" "trail_mate_igw" {
  vpc_id = aws_vpc.trail_mate_vpc.id
}

resource "aws_route_table" "trail_mate_rt" {
  vpc_id = aws_vpc.trail_mate_vpc.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.trail_mate_igw.id
  }

  tags = {
    Name = "trail-mate-route-table"
  }
}

resource "aws_route_table_association" "trail_mate_subnet_a_association" {
  subnet_id      = aws_subnet.trail_mate_subnet_a.id
  route_table_id = aws_route_table.trail_mate_rt.id
}

resource "aws_route_table_association" "trail_mate_subnet_b_association" {
  subnet_id      = aws_subnet.trail_mate_subnet_b.id
  route_table_id = aws_route_table.trail_mate_rt.id
}

