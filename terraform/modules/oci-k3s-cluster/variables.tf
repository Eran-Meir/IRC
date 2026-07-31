variable "compartment_ocid" {
  description = "The OCID of the compartment where resources will be created"
  type        = string
}

variable "environment" {
  description = "The environment name (e.g., test, prod)"
  type        = string
}

variable "instance_count" {
  description = "Number of instances to provision"
  type        = number
  default     = 1
}

variable "instance_shape" {
  description = "The shape of the instance"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "ocpus" {
  description = "Number of OCPUs for the Flex shape"
  type        = number
  default     = 1
}

variable "memory_in_gbs" {
  description = "Memory in GBs for the Flex shape"
  type        = number
  default     = 6
}
