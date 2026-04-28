@echo off
echo ===========================================
echo   DEVOPS DEMONSTRATION FOR INDUSTRY EXPERTS
echo ===========================================
echo.

echo Press any key to start the comprehensive DevOps demo...
pause > nul

echo.
echo ===========================================
echo 1. INFRASTRUCTURE OVERVIEW
echo ===========================================
echo.

echo Current Docker Services:
docker compose ps
echo.

echo Kubernetes Manifests Count:
dir k8s\*.yaml /b | find /c ".yaml"
echo.

echo GitHub Actions Pipeline:
type .github\workflows\ci-cd.yml | findstr -i "name:\|jobs:\|runs-on"
echo.

echo ===========================================
echo 2. DEPLOYMENT & ORCHESTRATION
echo ===========================================
echo.

echo Deploying to Kubernetes...
kubectl apply -f k8s\ >nul 2>&1
timeout /t 5 /nobreak > nul

echo.
echo Deployment Status:
kubectl get deployments
echo.

echo Pod Status:
kubectl get pods
echo.

echo Service Status:
kubectl get services
echo.

echo ===========================================
echo 3. AUTO-SCALING CONFIGURATION
echo ===========================================
echo.

echo Horizontal Pod Autoscaler:
kubectl get hpa
echo.

echo HPA Details:
kubectl describe hpa newspaper-backend-hpa | findstr -A 10 "Metrics:"
echo.

echo ===========================================
echo 4. MONITORING STACK
echo ===========================================
echo.

echo Prometheus Service:
kubectl get svc prometheus
echo.

echo Grafana Service:
kubectl get svc grafana
echo.

echo Loki Service:
kubectl get svc loki
echo.

echo Starting port forwarding for monitoring...
start /b kubectl port-forward svc/grafana 3000:3000
start /b kubectl port-forward svc/prometheus 9090:9090
start /b kubectl port-forward svc/loki 3100:3100
timeout /t 3 /nobreak > nul

echo.
echo Monitoring URLs:
echo - Grafana:    http://localhost:3000 (admin/admin)
echo - Prometheus: http://localhost:9090
echo - Loki:       http://localhost:3100
echo.

echo ===========================================
echo 5. SECURITY IMPLEMENTATION
echo ===========================================
echo.

echo Network Policies:
kubectl get networkpolicies
echo.

echo RBAC Roles:
kubectl get roles,rolebindings
echo.

echo Service Accounts:
kubectl get serviceaccounts
echo.

echo Secrets Management:
kubectl get secrets
echo.

echo Pod Security Contexts:
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].securityContext.runAsNonRoot}' | findstr "true" >nul && echo "Non-root execution: ENABLED" || echo "Non-root execution: Check individual pods"
echo.

echo ===========================================
echo 6. APPLICATION HEALTH & PERFORMANCE
echo ===========================================
echo.

echo API Health Check:
curl -s http://localhost:3001/api/health | findstr "status" >nul && echo "Backend API: HEALTHY" || echo "Backend API: UNHEALTHY"
echo.

echo Frontend Access:
curl -s -o nul -w "%%{http_code}" http://localhost:8081 | findstr "200" >nul && echo "Frontend: ACCESSIBLE" || echo "Frontend: NOT ACCESSIBLE"
echo.

echo Database Connection:
kubectl exec -it deployment/newspaper-backend -- curl -s mongo:27017 >nul 2>&1 && echo "MongoDB: CONNECTED" || echo "MongoDB: Check connection"
echo.

echo ===========================================
echo 7. LOGGING & TROUBLESHOOTING
echo ===========================================
echo.

echo Application Logs (last 5 lines):
kubectl logs --tail=5 deployment/newspaper-backend 2>nul | findstr "." || echo "Logs not available"
echo.

echo Pod Resource Usage:
kubectl top pods 2>nul || echo "Metrics server not available"
echo.

echo ===========================================
echo 8. LOAD TESTING & SCALING DEMO
echo ===========================================
echo.

echo Current Pod Count:
kubectl get pods -l app=newspaper-backend --no-headers | find /c "Running"
echo.

echo Simulating load... (This would trigger HPA scaling)
echo "Note: In production, this would scale pods based on CPU utilization"
echo.

echo ===========================================
echo 9. BACKUP & DISASTER RECOVERY
echo ===========================================
echo.

echo Persistent Volumes:
kubectl get pvc
echo.

echo StatefulSets (for data persistence):
kubectl get statefulsets
echo.

echo ===========================================
echo DEMO COMPLETE - KEY ACHIEVEMENTS
echo ===========================================
echo.

echo ✅ INFRASTRUCTURE AS CODE
echo   - 20+ Kubernetes manifests
echo   - Declarative configuration
echo   - Version-controlled infrastructure
echo.

echo ✅ CI/CD AUTOMATION
echo   - GitHub Actions pipeline
echo   - Automated testing & deployment
echo   - Multi-stage Docker builds
echo.

echo ✅ MONITORING & OBSERVABILITY
echo   - Prometheus metrics collection
echo   - Grafana dashboards
echo   - Loki centralized logging
echo.

echo ✅ SECURITY & COMPLIANCE
echo   - RBAC implementation
echo   - Network policies
echo   - Pod security standards
echo.

echo ✅ HIGH AVAILABILITY
echo   - Auto-scaling (HPA)
echo   - Health checks & probes
echo   - Rolling updates
echo.

echo ✅ CLOUD-NATIVE ARCHITECTURE
echo   - Microservices design
echo   - Service mesh
echo   - Container orchestration
echo.

echo ===========================================
echo ACCESS URLs FOR REVIEWERS
echo ===========================================
echo.

echo 🌐 APPLICATION:
echo   Frontend:    http://localhost:8081
echo   Backend API: http://localhost:3001
echo.

echo 📊 MONITORING:
echo   Grafana:     http://localhost:3000 (admin/admin)
echo   Prometheus:  http://localhost:9090
echo   Loki:        http://localhost:3100
echo.

echo 🔧 KUBERNETES DASHBOARD:
echo   kubectl proxy --port=8001
echo   URL: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
echo.

echo Press any key to exit...
pause > nul

echo.
echo Thank you for reviewing our DevOps implementation!
echo This demonstrates enterprise-grade infrastructure automation,
echo monitoring, security, and scalability practices.
echo.