## Requirements

### Terraform

- An IAM account has to exist with admin privileges, it will be used by Terraform to set things up
- An S3 bucket has to exist, it will be used as backend by Terraform to store the state

### Ansible

- Copy `inventory.template.yml` to create `inventory.yml`, needed to track all created instances

## Deploy a new environment

- Create two SSH key-pair's for the EC2 instances(API and relayer), and set them on the env variables.
- Execute Terraform apply to create the environment infrastructure.
- Create an access key for `github-deployer-{env}`.
- Copy the `github-deployer-{env}` key details into GitHub secrets. Needed to deploy to S3 and invalidate distributions.
- Set the frontend bucket name into GitHub secrets.
- Set the frontend Cloudfront distribution ID into GitHub secrets.
- Copy the API/relayer IP into GitHub secrets.
- Copy the API/relayer SSH private key into GitHub secrets. Needed to connect to instance and push changes.


- Add the instances IPs to the Ansible inventory.
- Add the keyfile paths to the Ansible inventory.
- Run Ansible playbooks (`setup-instances-${ENV}`).
- Set `.env` files on API and relayer with the required variables.
- Set required parameters on the `prometheus.yml` config file on API and relayer instances.
- Set user/password on Prometheus scraper(Grafana instance) to access the API metrics endpoint.
- Force deploy of all projects to new environment.