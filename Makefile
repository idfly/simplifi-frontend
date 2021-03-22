ENV ?= digiu.local
BRANCH ?= main

build-image:
	docker build --rm -t rush .

build:
	docker run --rm -v "`pwd`:/app" -w /app rush bash -c "\
		rush update; \
		rush build; \
	  "
start:
	docker-compose -f config/${ENV}/docker-compose.yml  up -d --force-recreate

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
