output "instance_public_ips" {
  description = "Public IPs of the provisioned instances"
  value       = oci_core_instance.k3s_node[*].public_ip
}

output "instance_private_ips" {
  description = "Private IPs of the provisioned instances"
  value       = oci_core_instance.k3s_node[*].private_ip
}
