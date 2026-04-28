# 🔒 Kubernetes Security & Configuration Deep Dive

## 🛡️ **POD SECURITY CONFIGURATIONS**

### **1. Resource Limits & Requests**
```yaml
resources:
  requests:
    cpu: "100m"      # Guaranteed CPU allocation
    memory: "128Mi"  # Guaranteed memory allocation
  limits:
    cpu: "500m"      # Maximum CPU usage
    memory: "256Mi"  # Maximum memory usage (prevents OOM)
```

**Benefits:**
- **Resource Quotas**: Prevents resource starvation
- **Cost Optimization**: Efficient resource utilization
- **Stability**: Prevents pods from consuming all cluster resources

### **2. Health Probes**
```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10  # Wait 10s before first check
  periodSeconds: 10        # Check every 10 seconds

livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 20  # Wait 20s before first check
  periodSeconds: 15        # Check every 15 seconds
```

**Benefits:**
- **Zero-downtime deployments**: Traffic only routes to healthy pods
- **Automatic recovery**: Unhealthy pods are restarted automatically
- **Load balancer integration**: Only healthy pods receive traffic

### **3. Security Contexts**
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  allowPrivilegeEscalation: false
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
```

**Benefits:**
- **Non-root execution**: Reduces attack surface
- **Least privilege**: Minimal required permissions
- **Container escape prevention**: Dropped capabilities

---

## 🔐 **CREDENTIALS MANAGEMENT**

### **1. Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: newspaper-secret
type: Opaque
stringData:
  SESSION_SECRET: "super-secret-session-key"
  DB_PASSWORD: "secure-db-password"
  API_KEY: "external-service-key"
```

**Features:**
- **Base64 encoded**: Automatic encoding/decoding
- **Memory-only**: Not written to disk
- **RBAC protected**: Access controlled via RBAC

### **2. ConfigMaps for Non-Sensitive Data**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: newspaper-config
data:
  MONGO_URI: "mongodb://mongo:27017/newspaperDB"
  NODE_ENV: "production"
  LOG_LEVEL: "info"
```

**Benefits:**
- **Version controlled**: Changes tracked in Git
- **Environment specific**: Different configs per environment
- **Hot reload**: Changes applied without pod restart

### **3. External Secret Management**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: newspaper-external-secret
spec:
  secretStoreRef:
    name: aws-secretsmanager
    kind: SecretStore
  target:
    name: newspaper-secret
    creationPolicy: Owner
  data:
  - secretKey: password
    remoteRef:
      key: prod/newspaper/db
      property: password
```

---

## 🛡️ **ADVANCED SECURITY FEATURES**

### **1. Network Policies**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: newspaper-network-policy
spec:
  podSelector:
    matchLabels:
      app: newspaper-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: newspaper-frontend  # Only frontend can access backend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: mongo  # Only MongoDB access allowed
```

**Benefits:**
- **Zero-trust networking**: Explicit allow rules
- **Lateral movement prevention**: Pods can't communicate freely
- **Compliance**: Meets security standards

### **2. RBAC (Role-Based Access Control)**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: newspaper-pod-reader
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
subjects:
- kind: ServiceAccount
  name: newspaper-service-account
roleRef:
  kind: Role
  name: newspaper-pod-reader
```

**Benefits:**
- **Principle of least privilege**: Minimal required permissions
- **Audit trail**: All actions are logged
- **Compliance**: Meets enterprise security requirements

### **3. Service Accounts**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: newspaper-service-account
automountServiceAccountToken: false  # Prevents token mounting
```

**Benefits:**
- **No default tokens**: Eliminates default service account access
- **Scoped access**: Only assigned permissions
- **Token rotation**: Automatic token management

### **4. Pod Security Standards**
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: newspaper-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  runAsUser:
    rule: MustRunAsNonRoot
  fsGroup:
    rule: MustRunAs
    ranges:
    - min: 1000
      max: 2000
  readOnlyRootFilesystem: true
```

**Benefits:**
- **Runtime security**: Enforced at pod creation
- **Compliance**: Meets security standards
- **Attack prevention**: Blocks common attack vectors

---

## 🔍 **MONITORING & AUDITING**

### **1. Security Event Logging**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: security-monitor
spec:
  containers:
  - name: fluent-bit
    image: fluent/fluent-bit:latest
    volumeMounts:
    - name: varlogcontainers
      mountPath: /var/log/containers
    - name: varlogpods
      mountPath: /var/log/pods
```

### **2. Audit Policies**
```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets"]
- level: RequestResponse
  resources:
  - group: ""
    resources: ["secrets"]
  verbs: ["create", "update", "patch"]
```

---

## 🚀 **DEPLOYMENT COMMANDS**

```bash
# Deploy all security configurations
kubectl apply -f k8s/

# Verify security contexts
kubectl get pods -o jsonpath='{.spec.containers[*].securityContext}'

# Check network policies
kubectl get networkpolicies

# Verify RBAC
kubectl get rolebindings

# Monitor security events
kubectl logs -f deployment/newspaper-backend | grep -i security
```

---

## 📊 **SECURITY METRICS TO MONITOR**

- **Failed authentication attempts**
- **Unauthorized access attempts**
- **Resource usage anomalies**
- **Network traffic patterns**
- **Pod security violations**
- **Secret access patterns**

This implementation provides **enterprise-grade security** suitable for production deployments! 🛡️