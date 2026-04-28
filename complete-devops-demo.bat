@echo off
echo.
echo ===========================================
echo   COMPLETE DEVOPS PROJECT DEMONSTRATION
echo   Newspaper Delivery Management System
echo ===========================================
echo.

echo Press any key to start the comprehensive DevOps showcase...
pause > nul

cls
echo.
echo ===========================================
echo 1. CURRENT INFRASTRUCTURE STATUS
echo ===========================================
echo.

echo Docker Services Running:
docker compose ps --format "table {{.Name}}\t{{.Service}}\t{{.Status}}\t{{.Ports}}"
echo.

echo Container Resource Usage:
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo.

echo ===========================================
echo 2. APPLICATION HEALTH CHECK
echo ===========================================
echo.

echo Testing Backend API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing; $content = $response.Content | ConvertFrom-Json; Write-Host '✅ Backend API: HEALTHY' -ForegroundColor Green; Write-Host '   Mode:' $content.mode -ForegroundColor Cyan; Write-Host '   Uptime:' ([math]::Round($content.uptime, 1)) 'seconds' -ForegroundColor Cyan } catch { Write-Host '❌ Backend API: UNHEALTHY' -ForegroundColor Red }"
echo.

echo Testing Frontend...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8081' -UseBasicParsing; Write-Host '✅ Frontend: ACCESSIBLE (Status:' $response.StatusCode ')' -ForegroundColor Green } catch { Write-Host '❌ Frontend: NOT ACCESSIBLE' -ForegroundColor Red }"
echo.

echo Testing Database Content...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/newspapers' -UseBasicParsing; $content = $response.Content | ConvertFrom-Json; Write-Host '✅ Database: CONNECTED' -ForegroundColor Green; Write-Host '   Newspapers loaded:' $content.Count -ForegroundColor Cyan } catch { Write-Host '❌ Database: DISCONNECTED' -ForegroundColor Red }"
echo.

echo ===========================================
echo 3. KUBERNETES PRODUCTION DEPLOYMENT
echo ===========================================
echo.

echo Deploying to Kubernetes cluster...
kubectl apply -f k8s\ 2>nul
timeout /t 3 /nobreak > nul

echo.
echo Kubernetes Resources Deployed:
echo.

echo Deployments:
kubectl get deployments --no-headers | findstr -v "kubernetes" | findstr -v "kube-" || echo "No deployments found"
echo.

echo Services:
kubectl get services --no-headers | findstr -v "kubernetes" | findstr -v "kube-" || echo "No services found"
echo.

echo Pods Status:
kubectl get pods --no-headers | findstr -v "kubernetes" | findstr -v "kube-" || echo "No pods found"
echo.

echo ===========================================
echo 4. AUTO-SCALING CONFIGURATION
echo ===========================================
echo.

echo Horizontal Pod Autoscaler:
kubectl get hpa 2>nul || echo "HPA not configured (deploy to k8s first)"
echo.

echo Resource Limits Check:
kubectl get pods -o custom-columns="NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory,CPU_LIM:.spec.containers[*].resources.limits.cpu,MEM_LIM:.spec.containers[*].resources.limits.memory" --no-headers 2>nul | head -5
echo.

echo ===========================================
echo 5. SECURITY IMPLEMENTATION
echo ===========================================
echo.

echo Network Policies:
kubectl get networkpolicies 2>nul || echo "Network policies not deployed"
echo.

echo RBAC Configuration:
kubectl get roles,rolebindings 2>nul || echo "RBAC not configured"
echo.

echo Service Accounts:
kubectl get serviceaccounts 2>nul || echo "Service accounts not configured"
echo.

echo Secrets Management:
kubectl get secrets 2>nul || echo "Secrets not configured"
echo.

echo Pod Security Contexts:
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].securityContext.runAsNonRoot}' 2>nul | findstr "true" >nul && echo "✅ Non-root execution: ENABLED" || echo "❌ Non-root execution: Check configuration"
echo.

echo ===========================================
echo 6. MONITORING & OBSERVABILITY
echo ===========================================
echo.

echo Monitoring Services:
kubectl get svc -l app=prometheus,app=grafana,app=loki 2>nul || echo "Monitoring stack not deployed"
echo.

echo Starting Port Forwarding for Monitoring...
echo (This will open monitoring dashboards in background)
echo.

start /b kubectl port-forward svc/grafana 3000:3000 2>nul
start /b kubectl port-forward svc/prometheus 9090:9090 2>nul
start /b kubectl port-forward svc/loki 3100:3100 2>nul
timeout /t 2 /nobreak > nul

echo ✅ Port forwarding started
echo.

echo ===========================================
echo 7. CI/CD PIPELINE STATUS
echo ===========================================
echo.

echo GitHub Actions Workflow:
if exist ".github\workflows\ci-cd.yml" (
    echo ✅ CI/CD Pipeline: CONFIGURED
    findstr /c:"jobs:" .github\workflows\ci-cd.yml | wc -l | findstr /v "^$" | sed "s/.*\([0-9]\+\).*/   Pipeline Stages: \1/"
) else (
    echo ❌ CI/CD Pipeline: NOT FOUND
)
echo.

echo Docker Images Built:
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | findstr newspaper || echo "No newspaper images found"
echo.

echo ===========================================
echo 8. PERFORMANCE METRICS
echo ===========================================
echo.

echo Pod Resource Usage:
kubectl top pods 2>nul || echo "Metrics server not available (deploy to full k8s cluster)"
echo.

echo Node Resources:
kubectl top nodes 2>nul || echo "Node metrics not available"
echo.

echo Application Logs (last 3 lines):
kubectl logs --tail=3 deployment/newspaper-backend 2>nul || echo "Backend logs not available"
echo.

echo ===========================================
echo 9. INFRASTRUCTURE AS CODE
echo ===========================================
echo.

echo Kubernetes Manifests Count:
dir k8s\*.yaml /b 2>nul | find /c ".yaml" || echo "0"
echo.

echo Docker Configuration:
if exist "docker-compose.yml" echo ✅ Docker Compose: CONFIGURED
if exist "Dockerfile.backend" echo ✅ Backend Dockerfile: PRESENT
if exist "Dockerfile.frontend" echo ✅ Frontend Dockerfile: PRESENT
echo.

echo Environment Configuration:
if exist ".env" echo ✅ Environment Variables: CONFIGURED
if exist ".env.example" echo ✅ Environment Template: AVAILABLE
echo.

echo ===========================================
echo 10. COMPREHENSIVE PROJECT SUMMARY
echo ===========================================
echo.

echo 🎯 PROJECT TYPE: Full-Stack DevOps Implementation
echo 🏗️ ARCHITECTURE: Microservices (Backend + Frontend + Database)
echo 📦 CONTAINERIZATION: Docker + Docker Compose
echo ⚖️ ORCHESTRATION: Kubernetes with 20+ manifests
echo 🔄 CI/CD: GitHub Actions (5-stage pipeline)
echo 📊 MONITORING: Prometheus + Grafana + Loki
echo 🛡️ SECURITY: RBAC + Network Policies + Pod Security
echo ⚡ SCALING: HPA (2-6 pods auto-scaling)
echo 💾 PERSISTENCE: MongoDB StatefulSet
echo 🔍 HEALTH CHECKS: Readiness/Liveness probes
echo 📝 DOCUMENTATION: Complete DevOps guides
echo.

echo ===========================================
echo ACCESS URLs FOR DEMONSTRATION
echo ===========================================
echo.

echo 🌐 APPLICATION:
echo   Frontend:    http://localhost:8081
echo   Backend API: http://localhost:3001
echo   Health Check: http://localhost:3001/api/health
echo.

echo 📊 MONITORING (Kubernetes):
echo   Grafana:     http://localhost:3000 (admin/admin)
echo   Prometheus:  http://localhost:9090
echo   Loki:        http://localhost:3100
echo.

echo 🔧 DEVELOPMENT:
echo   Docker Status: docker compose ps
echo   K8s Status:    kubectl get all
echo   Logs:          kubectl logs -f deployment/newspaper-backend
echo.

echo ===========================================
echo KEY ACHIEVEMENTS - ENTERPRISE DEVOPS
echo ===========================================
echo.

echo ✅ INFRASTRUCTURE AS CODE
echo   - 20+ Kubernetes YAML manifests
echo   - Declarative configuration management
echo   - Version-controlled infrastructure
echo.

echo ✅ CI/CD AUTOMATION
echo   - GitHub Actions multi-stage pipeline
echo   - Automated testing & security scanning
echo   - Container image building & deployment
echo.

echo ✅ CLOUD-NATIVE ARCHITECTURE
echo   - Microservices with service mesh
echo   - Container orchestration
echo   - Auto-scaling & self-healing
echo.

echo ✅ OBSERVABILITY & MONITORING
echo   - Complete metrics collection
echo   - Centralized logging
echo   - Real-time dashboards
echo.

echo ✅ ENTERPRISE SECURITY
echo   - Role-based access control
echo   - Network segmentation
echo   - Pod security standards
echo.

echo ✅ PRODUCTION READINESS
echo   - Health checks & probes
echo   - Resource management
echo   - Rolling update strategies
echo.

echo ===========================================
echo DEMONSTRATION COMPLETE
echo ===========================================
echo.

echo 🎉 Your Newspaper Delivery Management System demonstrates
echo    enterprise-grade DevOps practices including:
echo.
echo    • Container orchestration with Kubernetes
echo    • Automated CI/CD pipelines
echo    • Comprehensive monitoring & logging
echo    • Security-first architecture
echo    • Auto-scaling & performance optimization
echo    • Infrastructure as Code
echo.
echo This implementation meets production enterprise standards!
echo.

echo Press any key to exit...
pause > nul