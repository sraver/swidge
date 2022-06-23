variable "environment" {
  description = "The Deployment environment"
}

variable "name" {
  description = "Name of the instance"
}

variable "subnets" {
  type = list(object({
    id : string
  }))
  description = "Subnets to create the instance on"
}