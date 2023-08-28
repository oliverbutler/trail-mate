resource "aws_ecr_repository" "trail_mate_repository" {
  name = "trail-mate-repository"
}

resource "aws_lb" "trail_mate_alb" {
  name               = "trail-mate-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.trail_mate_alb_sg.id]
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

resource "aws_security_group" "trail_mate_alb_sg" {
  name        = "trail-mate-alb-sg"
  description = "Security group for ALB"
  vpc_id      = aws_vpc.trail_mate_vpc.id

  ingress {
    description = "Allow HTTPS inbound traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTP inbound traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}


resource "aws_iam_role" "ecs_execution_role" {
  name = "trail-mate-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_execution_secrets_access" {
  name = "trail-mate-ecs-execution-secrets-access"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue"
        ],
        Resource = [
          "arn:aws:secretsmanager:eu-west-2:${data.aws_caller_identity.current.account_id}:secret:*"
        ]
      }
    ]
  })
}


resource "aws_iam_role" "ecs_task_role" {
  name = "trail-mate-ecs-task-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action    = "sts:AssumeRole",
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        },
        Effect = "Allow",
        Sid    = ""
      }
    ]
  })
}


resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "ecs_logging_policy" {
  name        = "trail-mate-ecs-logging-policy"
  description = "Allows ECS tasks to write logs to CloudWatch."

  policy = jsonencode({
    Version   = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        Effect   = "Allow",
        Resource = aws_cloudwatch_log_group.trail_mate_logs.arn
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_logging_policy_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_logging_policy.arn
}


resource "aws_ecs_cluster" "trail_mate_cluster" {
  name = "trail-mate-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}


resource "aws_ecs_service" "trail_mate_service" {
  name          = "trail-mate-service"
  cluster       = aws_ecs_cluster.trail_mate_cluster.id
  desired_count = 1
  launch_type   = "FARGATE"

  task_definition = aws_ecs_task_definition.trail_mate_task.arn

  network_configuration {
    subnets          = [aws_subnet.trail_mate_subnet_a.id, aws_subnet.trail_mate_subnet_b.id]
    security_groups  = [aws_security_group.trail_mate_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.trail_mate_target_group.arn
    container_name   = "trail-mate-container"
    container_port   = 3000
  }

  lifecycle {
    ignore_changes = [task_definition]
  }
}

resource "aws_cloudwatch_log_group" "trail_mate_logs" {
  name = "trail-mate-logs"
}


resource "aws_security_group" "trail_mate_sg" {
  # TODO Rename this `trail_mate_ecs_sg`
  name = "trail-mate-sg"

  vpc_id = aws_vpc.trail_mate_vpc.id

  description = "Allow inbound traffic on port 3000"


  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.trail_mate_alb_sg.id]
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


resource "aws_ecs_task_definition" "trail_mate_task" {
  family                   = "trail-mate"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name         = "trail-mate-container"
      image        = "${aws_ecr_repository.trail_mate_repository.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment      = []
      logConfiguration = {
        logDriver = "awslogs"
        options   = {
          "awslogs-group"         = aws_cloudwatch_log_group.trail_mate_logs.name,
          "awslogs-region"        = "eu-west-2", # Replace with your region, e.g., "eu-west-2"
          "awslogs-stream-prefix" = "trail-mate"
        }
      }
    }
  ])
}

