variable "root_domain_name" {
  type    = string
  default = "trail-mate.com"
}

resource "aws_route53_zone" "trail_mate_zone" {
  name = var.root_domain_name
}

resource "aws_acm_certificate" "trail_mate_api_cert" {
  domain_name       = "api.${var.root_domain_name}"
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate" "trail_mate_cert" {
  domain_name       = var.root_domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

# Point `api.trail-mate.com` to the ALB for API traffic
resource "aws_route53_record" "trail_mate_api" {
  name    = "api.${var.root_domain_name}"
  type    = "A"
  zone_id = aws_route53_zone.trail_mate_zone.zone_id

  alias {
    name                   = aws_lb.trail_mate_alb.dns_name
    zone_id                = aws_lb.trail_mate_alb.zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "trail_mate_api_dns" {
  allow_overwrite = true
  name            = tolist(aws_acm_certificate.trail_mate_api_cert.domain_validation_options)[0].resource_record_name
  records         = [tolist(aws_acm_certificate.trail_mate_api_cert.domain_validation_options)[0].resource_record_value]
  type            = tolist(aws_acm_certificate.trail_mate_api_cert.domain_validation_options)[0].resource_record_type
  zone_id         = aws_route53_zone.trail_mate_zone.zone_id
  ttl             = 60
}

resource "aws_route53_record" "trail_mate_dns" {
  allow_overwrite = true
  name            = tolist(aws_acm_certificate.trail_mate_cert.domain_validation_options)[0].resource_record_name
  records         = [tolist(aws_acm_certificate.trail_mate_cert.domain_validation_options)[0].resource_record_value]
  type            = tolist(aws_acm_certificate.trail_mate_cert.domain_validation_options)[0].resource_record_type
  zone_id         = aws_route53_zone.trail_mate_zone.zone_id
  ttl             = 60
}

resource "aws_acm_certificate_validation" "trail_mate_api_validate" {
  certificate_arn         = aws_acm_certificate.trail_mate_api_cert.arn
  validation_record_fqdns = [aws_route53_record.trail_mate_api_dns.fqdn]
}

resource "aws_acm_certificate_validation" "trail_mate_validate" {
  certificate_arn         = aws_acm_certificate.trail_mate_cert.arn
  validation_record_fqdns = [aws_route53_record.trail_mate_dns.fqdn]
}
