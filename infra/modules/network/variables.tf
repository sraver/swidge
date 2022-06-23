variable "environment" {
  description = "The Deployment environment"
}

variable "region" {
  description = "The region to launch the bastion host"
}

variable "vpc_id" {
  description = "The VPC ID"
}

variable "public_subnets_cidr" {
  type        = list(string)
  description = "The CIDR block for the public subnet"
}

variable "availability_zones" {
  type        = list(string)
  description = "The az that the resources will be launched"
}