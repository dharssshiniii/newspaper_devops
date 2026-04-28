# Newspaper Delivery System - DevOps Lifecycle Demo

This project demonstrates an end-to-end DevOps lifecycle for a multi-tier Node.js newspaper delivery application.

## What this repository proves

- Version control and Git branch strategy (`main`, `dev`, `feature/*`)
- Docker containerization for backend and frontend
- Local orchestration with `docker-compose`
- CI/CD automation through GitHub Actions
- Kubernetes deployment manifests with services, ingress, configmaps, secrets, and autoscaling
- Monitoring and logging platform manifests for Prometheus, Grafana, and Loki
- Environment-driven deployment using Kubernetes Secrets and ConfigMaps

## Architecture

1. Developer writes code
2. Push to GitHub
3. CI pipeline runs lint, tests, frontend build
4. Docker images are built and pushed
5. CD deploys containers to Kubernetes
6. Kubernetes handles scaling and healing
7. Monitoring tracks service health
8. Centralized logs are available via Loki/Grafana

## Local development

### Backend

```bash
cd "KCT_SRS_Newspaper Project"
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run locally with Docker Compose

```bash
docker-compose up --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3000
- Backend health: http://localhost:3000/api/health

## Kubernetes deployment

```bash
kubectl apply -f k8s/
```

## GitHub Actions requirements

Set repository secrets:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_PASSWORD`
- `KUBE_CONFIG_DATA` (base64-encoded kubeconfig)

## DevOps components

- `Dockerfile.backend` and `Dockerfile.frontend`
- `docker-compose.yml`
- `.github/workflows/ci-cd.yml`
- `k8s/` manifests for deployment, service, ingress, HPA, monitoring, logging, configmap, secret

## Notes

This repo is intentionally focused on infrastructure and pipeline design. The application logic is intentionally lightweight and suitable for a DevOps showcase.
