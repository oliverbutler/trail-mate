resource "aws_lb" "trail_mate_alb" {
  name               = "trail-mate-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.trail_mate_sg.id]
  subnets            = [aws_subnet.trail_mate_subnet_a.id, aws_subnet.trail_mate_subnet_b.id]
}


# Redirect HTTP to HTTPS for the LB
resource "aws_lb_listener" "trail_mate_listener" {
  load_balancer_arn = aws_lb.trail_mate_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https_listener" {
  load_balancer_arn = aws_lb.trail_mate_alb.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.trail_mate_api_cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.trail_mate_target_group.arn
  }
}

resource "aws_lb_target_group" "trail_mate_target_group" {
  name     = "trail-mate-target-group"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.trail_mate_vpc.id

  target_type = "ip"

  health_check {
    enabled             = true
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 3
    matcher             = "200-299"
  }
}

resource "aws_security_group" "trail_mate_sg" {
  vpc_id      = aws_vpc.trail_mate_vpc.id
  name        = "trail-mate-sg"
  description = "Allow inbound traffic on port 3000"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "trail-mate-sg"
  }
}
