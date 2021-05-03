ENV ?= digiu.local
BRANCH ?= main

build-image:
	docker build --rm -t rush .

build-sdk:
	docker run --rm -v "`pwd`:/app" -v "`pwd`/.rush:/root/.rush" -w /app rush bash -c "rush update; rush build -t @pancakeswap-libs/sdk;"

build-uikit:
	docker run --rm -v "`pwd`:/app" -v "`pwd`/.rush:/root/.rush" -w /app rush bash -c "rush update; rush build -t @pancakeswap-libs/uikit;"

build:
	docker run --rm -v "`pwd`:/app" -v "`pwd`/.rush:/root/.rush" -w /app rush bash -c "rush update; rush build;"

update:
	docker run --rm -v "`pwd`:/app" -v "`pwd`/.rush:/root/.rush" -w /app rush bash -c "rush update --purge;"

purge:
	docker run --rm -v "`pwd`:/app" -v "`pwd`/.rush:/root/.rush" -w /app rush bash -c "rush purge;"

start:
	docker-compose -f config/${ENV}/docker-compose.yml  up -d --force-recreate frontend

start-uikit:
	docker-compose -f config/${ENV}/docker-compose.yml  up -d --force-recreate uikit

up:
	make build-image
	make build
	make start

logs:
	docker-compose -f config/${ENV}/docker-compose.yml logs --tail 100 -f

stop:
	docker-compose -f config/${ENV}/docker-compose.yml stop

ps:
	docker-compose -f config/${ENV}/docker-compose.yml ps

fetch:
	git fetch;

fetch-apply:
	git reset --hard origin/${BRANCH}

rollout:
ifeq (yes,$(shell \
	test "`git --no-pager diff "${BRANCH}" "origin/${BRANCH}"`" != "" && echo "yes" \
))
	make fetch-apply
	make up
else
	# up-to-date!
endif

deploy:
	make fetch
	make rollout
