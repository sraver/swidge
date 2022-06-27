ENV ?= dev

TEMP_ENV_FILE := $(shell mktemp -t ".env.XXXXXX")

$(foreach env, default ${ENV}, $(eval _ := $(shell \
	find env/${env} -type f -name "*.env" -follow \
	| xargs awk 1 \
	| grep -ve "^\#" \
	>> ${TEMP_ENV_FILE}) \
))



$(eval _ := $(shell \
	test -f .env && \
	cat .env \
	| grep -ve "^\#" \
	>> ${TEMP_ENV_FILE} \
))

-include ${TEMP_ENV_FILE}

ENV_KEYS := $(shell ( \
	cat ${TEMP_ENV_FILE} \
	| sed -E 's/^([A-Za-z][A-Za-z0-9_-]*)=(.*)/\1/' \
	| sort -u \
))

export ${ENV_KEYS}

REMOVE_TEMP_ENV_FILE := $(shell unlink ${TEMP_ENV_FILE})

DOCKER_USER ?= $(shell id -u)
DOCKER_COMPOSE_COMMAND ?= docker-compose

DOCKER_COMPOSE = ${DOCKER_COMPOSE_COMMAND} $(1)
DOCKER_COMPOSE_RUN = ${DOCKER_COMPOSE_COMMAND} run --user ${DOCKER_USER} $(1)
DOCKER_COMPOSE_EXEC = ${DOCKER_COMPOSE_COMMAND} exec --user ${DOCKER_USER} $(1)

DOCKER_COMMAND ?= docker
DOCKER = ${DOCKER_COMMAND} $(1)

CONFIRM = (\
	printf "$(1) [y/N]" 1>&2; printf " " 1>&2; \
	read answer && ( \
	test "$${answer:-N}" = "y" || \
	test "$${answer:-N}" = "Y") \
)

### State management

up:
	@$(call DOCKER_COMPOSE, up --detach ${MAKE_APP_SERVICES})

start:
	@$(call DOCKER_COMPOSE, start ${MAKE_APP_SERVICES})

stop: down
down:
	@$(call DOCKER_COMPOSE, stop ${MAKE_APP_SERVICES})

restart:
	@$(call DOCKER_COMPOSE, restart)

rm:
	@$(call DOCKER_COMPOSE, rm --force -v)

build:
	@$(call DOCKER_COMPOSE, build ${MAKE_APP_SERVICES})

create:
	@$(call DOCKER_COMPOSE, up --no-start ${MAKE_APP_SERVICES})

logs:
	@$(call DOCKER_COMPOSE, logs --follow)

$(addprefix build-, ${MAKE_DOCKER_IMAGES}): build-%:
	@$(call DOCKER_COMPOSE, build $*)

$(addprefix create-, ${MAKE_APP_SERVICES}): create-%:
	@$(call DOCKER_COMPOSE, up --no-start $*)

$(addprefix start-, ${MAKE_APP_SERVICES}): start-%:
	@$(call DOCKER_COMPOSE, up -d $*)

$(addprefix stop-, ${MAKE_APP_SERVICES}): stop-%:
	@$(call DOCKER_COMPOSE, stop $*)

$(addprefix kill-, ${MAKE_APP_SERVICES}): kill-%:
	@$(call DOCKER_COMPOSE, kill $*)

$(addprefix restart-, ${MAKE_APP_SERVICES}): restart-%:
	@$(call DOCKER_COMPOSE, restart $*)

$(addprefix rm-, ${MAKE_APP_SERVICES}): rm-%:
	@$(call DOCKER_COMPOSE, rm --force -v $*)

$(addprefix fuck-, ${MAKE_APP_SERVICES}): fuck-%: \
	stop-% rm-% build-% create-% start-%

$(addsuffix -sh, ${MAKE_APP_SERVICES}): %-sh:
	@$(call DOCKER_COMPOSE, exec $* sh)

$(addsuffix -logs, ${MAKE_APP_SERVICES}): %-logs:
	@$(call DOCKER_COMPOSE, logs --follow $*)

setup: db-migrate build-contracts

fuck: stop rm build create start

off: up logs

### Database

db-client:
	@$(call DOCKER_COMPOSE_EXEC, \
		db mysql \
			--user=${MYSQL_USER} \
			--password=${MYSQL_PASSWORD} \
			--default-character-set=utf8mb4 \
			${MYSQL_DB} \
	)

db-import:
	@$(call DOCKER_COMPOSE_EXEC, \
			-T db mysql \
			--host=${MYSQL_HOST} \
			--user=${MYSQL_USER} \
			--password=${MYSQL_PASSWORD} \
			--default-character-set=utf8mb4 \
			${MYSQL_DB} \
	)

db-upgrade: db-migrate
db-migrate:
	@$(call DOCKER_COMPOSE_RUN, --rm api migration:run)

db-rollback:
	@$(call DOCKER_COMPOSE_RUN, --rm api migration:revert)

db-generate-migration:
	@$(call DOCKER_COMPOSE_RUN, --rm api migration:generate)

### Localstack

AWS_CLI = \
	@$(call DOCKER, run \
		--network ${DOCKER_NETWORK_NAME} \
		--rm -it \
		-e "AWS_DEFAULT_REGION=${AWS_SQS_REGION}" \
		-e "AWS_ACCESS_KEY_ID=${AWS_SQS_ACCESS_KEY}" \
		-e "AWS_SECRET_ACCESS_KEY=${AWS_SQS_SECRET}" \
		$(2) \
		amazon/aws-cli \
		--endpoint-url=http://${DOCKER_LOCALSTACK_SERVICE}:${LOCALSTACK_PORT} \
		$(1) \
	)

AWS_CLI_MESSAGE = \
	@$(call AWS_CLI,\
		$(1),\
		-v $(PWD)/relayer/message.json:/message.json\
	)

create-queue:
	@$(call AWS_CLI, sqs create-queue --queue-name ${AWS_SQS_QUEUE_NAME} --attributes '{"FifoQueue": "True"}')

list-queues:
	@$(call AWS_CLI, sqs list-queues)

send-message:
	@$(call AWS_CLI_MESSAGE, sqs send-message \
 		--queue-url ${AWS_SQS_QUEUE_URL} \
 		--message-body '' \
 		--message-deduplication-id '' \
 		--message-group-id '' \
 		--message-attributes file:///message.json \
 	)

### Contracts

CONTRACTS = $(call DOCKER_COMPOSE_RUN,--rm ${DOCKER_CONTRACTS_SERVICE} $(1))

build-contracts:
	@$(call CONTRACTS, build)

test-contracts:
	@$(call CONTRACTS, test)

# Live chain

CONTRACTS_LIVE_RUN = $(call CONTRACTS,$(1) --network $(2) --chain $(2))

$(addprefix deploy-all-, ${ENABLED_NETWORKS}): deploy-all-%:
	@$(call CONFIRM,Deploy all?)
	@$(call CONTRACTS_LIVE_RUN,deploy-all,$*)

$(addprefix verify-, ${ENABLED_NETWORKS}): verify-%:
	@$(call CONFIRM,Verify diamond?)
	@$(call CONTRACTS_LIVE_RUN,verify-diamond,$*)

# Forked chain

$(addprefix fork-, ${ENABLED_NETWORKS}): fork-%:
	@$(call DOCKER_COMPOSE_RUN, \
		--rm \
		-e "FORKING=true" \
		-e "FORKED_RPC_NODE=${$*_RPC_NODE}" \
		-e "FORKED_CHAIN_ID=${$*_CHAIN_ID}" \
		-p ${$*_EXTERNAL_PORT}:8545 \
		--name "running-$*" \
		${DOCKER_CONTRACTS_SERVICE} \
		up \
	)

CONTRACTS_DOCKER_EXEC = $(call DOCKER,exec -it "running-$(1)" $(2))
CONTRACTS_RUN = $(call CONTRACTS_DOCKER_EXEC,$(1),yarn $(3) --network $(2))

CONTRACTS_DEPLOY_DIAMOND = $(call CONTRACTS_RUN,$(1),$(2),deploy-diamond)
CONTRACTS_UPDATE_DIAMOND = $(call CONTRACTS_RUN,$(1),$(2),update-diamond --chain $(1) --facet $(3))
CONTRACTS_DEPLOY_ALL = $(call CONTRACTS_RUN,$(1),$(2),deploy-all --chain $(1))
CONTRACTS_GET_TOKENS = $(call CONTRACTS_RUN,$(1),$(2),get-tokens --chain $(1) --token $(3))

$(addprefix deploy-diamond-fork-, ${ENABLED_NETWORKS}): deploy-diamond-fork-%:
	@$(call CONTRACTS_DEPLOY_DIAMOND,$*,localhost)

$(addprefix update-diamond-fork-, ${ENABLED_NETWORKS}): update-diamond-fork-%:
	@$(call CONTRACTS_UPDATE_DIAMOND,$*,localhost,$(facet))

$(addprefix deploy-all-fork-, ${ENABLED_NETWORKS}): deploy-all-fork-%:
	@$(call CONTRACTS_DEPLOY_ALL,$*,localhost)

$(addprefix get-tokens-, ${ENABLED_NETWORKS}): get-tokens-%:
	@$(call CONTRACTS_GET_TOKENS,$*,localhost,$(token))

### Relayer

RELAYER = $(call DOCKER_COMPOSE_RUN,--rm ${DOCKER_RELAYER_SERVICE} $(1))

relayer-events: create-queue
	@$(call RELAYER,run:dev:events)

relayer-consumer:
	@$(call RELAYER,run:dev:consumer)

### Terraform

TERRAFORM = $(call DOCKER_COMPOSE_RUN,--rm ${DOCKER_TERRAFORM_SERVICE} $(1))

tf-apply:
	@$(call TERRAFORM,apply)

tf-plan:
	@$(call TERRAFORM,plan)

tf-destroy:
	@$(call TERRAFORM,destroy)
