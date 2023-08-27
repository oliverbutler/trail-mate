resource "aws_iam_policy" "github_actions_ecs_deploy" {
  name        = "GitHubActionsECSDeployPolicy"
  description = "Allows GitHub Actions to deploy to ECS and manage ECR repositories"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = ["ecs:UpdateService", "ecs:RegisterTaskDefinition", "ecs:DescribeServices"],
        Resource = "*"
      },
      {
        Effect   = "Allow",
        Action   = ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability", "ecr:PutImage"],
        Resource = aws_ecr_repository.trail_mate_repository.arn
      },
      {
        Effect   = "Allow",
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"],
        Resource = aws_cloudwatch_log_group.trail_mate_logs.arn
      }
    ]
  })
}

resource "aws_iam_user" "github_actions_user" {
  name = "github-actions-user"
}

resource "aws_iam_user_policy_attachment" "github_actions_user_ecs_deploy" {
  user       = aws_iam_user.github_actions_user.name
  policy_arn = aws_iam_policy.github_actions_ecs_deploy.arn
}
