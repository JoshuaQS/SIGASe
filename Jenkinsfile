pipeline {
    agent any

options {
    timestamps()
    disableConcurrentBuilds()
    skipDefaultCheckout(true)
    buildDiscarder(logRotator(numToKeepStr: '20'))
}

    environment {
        COMPOSE_PROJECT_NAME = 'sigase'
        COMPOSE_FILE = 'docker-compose.yml'
        COMPOSE_ENV_CREDENTIALS = 'sigase-compose-env'
        SERVER_ENV_CREDENTIALS = 'sigase-server-env'
        DOCKER_BUILDKIT = '1'
        COMPOSE_DOCKER_CLI_BUILD = '1'
        BACKEND_TEST_IMAGE = 'maven:3.9.11-eclipse-temurin-21-alpine'
        FRONTEND_TEST_IMAGE = 'node:22-alpine'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
            }
        }

        stage('Prepare Environment Files') {
            steps {
                withCredentials([
                    file(credentialsId: env.COMPOSE_ENV_CREDENTIALS, variable: 'COMPOSE_ENV_FILE'),
                    file(credentialsId: env.SERVER_ENV_CREDENTIALS, variable: 'SERVER_ENV_FILE')
                ]) {
                    sh '''
                        set -eu

                        cp "$COMPOSE_ENV_FILE" .env
                        cp "$SERVER_ENV_FILE" server/.env

                        test -s .env
                        test -s server/.env
                    '''
                }
            }
        }

        stage('Validate Compose') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env -f "${COMPOSE_FILE}" config -q
                '''
            }
        }

        stage('Stop Previous Stack') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env -f "${COMPOSE_FILE}" down --remove-orphans || true
                '''
            }
        }

        stage('Start Database') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env -f "${COMPOSE_FILE}" up -d mysql
                '''
            }
        }

        stage('Run Backend Tests') {
            steps {
                sh '''
                    set -eu
                    set -a
                    . ./.env
                    set +a

                    until docker compose --env-file .env -f "${COMPOSE_FILE}" exec -T mysql sh -lc 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent'; do
                        echo "Esperando a MySQL..."
                        sleep 3
                    done

                    docker run --rm \
                        --network "${COMPOSE_PROJECT_NAME}-network" \
                        --env-file server/.env \
                        -e SPRING_PROFILES_ACTIVE=test \
                        -e SERVER_PORT=8080 \
                        -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
                        -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/${MYSQL_DATABASE}?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" \
                        -e SPRING_DATASOURCE_USERNAME="${MYSQL_USER}" \
                        -e SPRING_DATASOURCE_PASSWORD="${MYSQL_PASSWORD}" \
                        -e HOME=/tmp \
                        -u "$(id -u):$(id -g)" \
                        -v "$PWD/server:/workspace" \
                        -w /workspace \
                        "${BACKEND_TEST_IMAGE}" \
                        sh -lc 'chmod +x mvnw && ./mvnw -B test'
                '''
            }
        }

        stage('Validate Frontend Build') {
            steps {
                sh '''
                    set -eu
                    set -a
                    . ./.env
                    set +a

                    docker run --rm \
                        -e VITE_API_URL="${VITE_API_URL}" \
                        -u "$(id -u):$(id -g)" \
                        -v "$PWD/client:/workspace" \
                        -w /workspace \
                        "${FRONTEND_TEST_IMAGE}" \
                        sh -lc 'npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-retry-maxtimeout 120000 && npm config set maxsockets 1 && npm ci --no-audit --no-fund && npm run build'
                '''
            }
        }

        stage('Build Runtime Images') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env -f "${COMPOSE_FILE}" build --pull backend frontend
                '''
            }
        }

        stage('Deploy Stack') {
            steps {
                sh '''
                    set -eu
                    docker compose --env-file .env -f "${COMPOSE_FILE}" up -d backend frontend
                '''
            }
        }

        stage('Health Checks') {
            steps {
                sh '''
                    set -eu

                    docker compose --env-file .env -f "${COMPOSE_FILE}" exec -T mysql sh -lc 'mysqladmin ping -h 127.0.0.1 -uroot -p"$MYSQL_ROOT_PASSWORD" --silent'
                    docker compose --env-file .env -f "${COMPOSE_FILE}" exec -T backend sh -lc 'wget -q -O - http://127.0.0.1:8080/actuator/health'
                    docker compose --env-file .env -f "${COMPOSE_FILE}" exec -T frontend sh -lc 'wget -q -O - http://127.0.0.1/healthz'
                '''
            }
        }
    }

    post {
        success {
            sh '''
                docker compose --env-file .env -f "${COMPOSE_FILE}" ps
            '''
        }

        failure {
            sh '''
                docker compose --env-file .env -f "${COMPOSE_FILE}" ps || true
                docker compose --env-file .env -f "${COMPOSE_FILE}" logs --no-color --tail=200 || true
            '''
        }
    }
}
