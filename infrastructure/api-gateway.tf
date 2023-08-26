resource "aws_apigatewayv2_vpc_link" "trail_mate_vpc_link" {
  name               = "trail-mate-vpc-link"
  security_group_ids = [aws_security_group.trail_mate_sg.id]
  subnet_ids         = [aws_subnet.trail_mate_subnet_a.id, aws_subnet.trail_mate_subnet_b.id]
}


# Create HTTP API
resource "aws_apigatewayv2_api" "trail_mate_api" {
  name          = "trail-mate-api"
  protocol_type = "HTTP"
  description   = "API for trail-mate"
}

# Integrate the Route with VPC Link
resource "aws_apigatewayv2_route" "trail_mate_route" {
  api_id    = aws_apigatewayv2_api.trail_mate_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.trail_mate_integration.id}"
}

resource "aws_apigatewayv2_integration" "trail_mate_integration" {
  api_id           = aws_apigatewayv2_api.trail_mate_api.id
  integration_type = "HTTP_PROXY"
  connection_type  = "VPC_LINK"
  connection_id    = aws_apigatewayv2_vpc_link.trail_mate_vpc_link.id
  description      = "Integration for Trail Mate Service"
  integration_method = "ANY"
  integration_uri = aws_lb_listener.trail_mate_listener.arn
}

# Deploy the HTTP API
resource "aws_apigatewayv2_deployment" "trail_mate_api_deployment" {
  api_id      = aws_apigatewayv2_api.trail_mate_api.id
  description = "Trail Mate API Deployment"

  depends_on = [aws_apigatewayv2_route.trail_mate_route]
}

resource "aws_apigatewayv2_stage" "trail_mate_api_stage" {
  api_id        = aws_apigatewayv2_api.trail_mate_api.id
  name          = "prod"
  deployment_id = aws_apigatewayv2_deployment.trail_mate_api_deployment.id
  auto_deploy   = true
}
