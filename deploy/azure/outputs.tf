output "resource_group_name" { value = data.azurerm_resource_group.project.name }
output "vm_name" { value = azurerm_linux_virtual_machine.apps.name }
output "release_storage_account" { value = azurerm_storage_account.releases.name }
output "public_origin" { value = "https://${azurerm_public_ip.apps.fqdn}" }
output "deploy_client_id" { value = azurerm_user_assigned_identity.deploy.client_id }
output "tenant_id" { value = azurerm_user_assigned_identity.deploy.tenant_id }
output "dotnet_runtime_identifier" { value = "linux-${var.architecture}" }
