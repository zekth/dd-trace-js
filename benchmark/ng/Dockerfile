FROM node
WORKDIR /app
ARG vcsref
ARG app_dir
ENV GIT_COMMIT_HASH=$vcsref
ENV APP_DIR=$app_dir
RUN apt update && apt install time
WORKDIR /app/benchmark/ng
ENTRYPOINT node runner
