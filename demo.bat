@echo off
echo ===========================================
echo   NEWSPAPER DELIVERY SYSTEM - DEVOPS DEMO
echo ===========================================
echo.

echo 1. CURRENT DOCKER CONTAINERS:
docker compose ps
echo.

echo 2. DOCKER IMAGES:
docker images | findstr newspaper
echo.

echo 3. KUBERNETES MANIFESTS:
dir k8s\ /b
echo.

echo 4. GITHUB ACTIONS WORKFLOW:
type .github\workflows\ci-cd.yml | findstr -i "name:\|jobs:\|runs-on\|uses:"
echo.

echo 5. MONITORING STACK:
echo - Prometheus: kubectl port-forward svc/prometheus 9090:9090
echo - Grafana: kubectl port-forward svc/grafana 3000:3000
echo - Loki: kubectl port-forward svc/loki 3100:3100
echo.

echo 6. PRODUCTION DEPLOYMENT:
echo kubectl apply -f k8s\
echo kubectl get pods
echo kubectl get services
echo kubectl get ingress
echo.

echo ===========================================
echo   DEMO COMPLETE - READY FOR PRESENTATION!
echo ===========================================
pause