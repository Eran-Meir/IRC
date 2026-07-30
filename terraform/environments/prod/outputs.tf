output "server_public_ip" {
  description = "The raw public IP address of the server"
  value       = module.prod_cluster.instance_public_ips[0]
}

output "web_client_url" {
  description = "Direct link to the future web client"
  value       = "https://${module.prod_cluster.instance_public_ips[0]}"
}
