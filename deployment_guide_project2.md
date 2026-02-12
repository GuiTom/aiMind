# `project2.aihelper360.com` AWS 部署指南

基于 `aiMind` (Vue/Vite 项目) 的部署经验，以下是将 `project2` 部署到新子域名的分步指南。

## 1. 准备工作 (本地)
1.  **构建项目**:
    ```bash
    npm run build
    ```
    - 检查 `dist` 文件夹，确保其中包含 `index.html` 和 `assets` 目录。

## 2. S3 Bucket (存储)
1.  **创建存储桶 (Bucket)**:
    - 前往 **S3 控制台 (Console)** > **创建存储桶 (Create bucket)**。
    - **存储桶名称 (Bucket name)**: `project2-hosting` (或类似的唯一名称)。
    - **区域 (Region)**: 与你的其他资源保持一致 (例如 `us-east-1` 通常用于全球加速，但请根据你的偏好选择)。
    - **阻止公有访问设置 (Block Public Access settings)**: **取消勾选** "阻止所有公有访问 (Block all public access)" (如果你想直接使用 S3 托管，虽然 CloudFront OAC/OAI 安全性更好)。*经验证的简单方法*: 取消勾选及其下的所有子选项。
    - **存储桶版本控制 (Bucket Versioning)**: 禁用 (除非你需要备份)。
    - 点击 **创建存储桶 (Create bucket)**。
2.  **启用静态网站托管 (Static website hosting)** (如果完全使用 CloudFront 可选，但用于测试通常更方便):
    - 前往 **属性 (Properties)** > **静态网站托管 (Static website hosting)** > **启用 (Enable)**。
    - **索引文档 (Index document)**: `index.html`。
    - **错误文档 (Error document)**: `index.html` (对 SPA 路由至关重要)。
3.  **上传文件**:
    - 前往 **对象 (Objects)** -> **上传 (Upload)**。
    - 拖放 `dist` 文件夹内的 **所有内容** (不要拖放 `dist` 文件夹本身)。
4.  **权限 (存储桶策略 / Bucket Policy)**:
    - 前往 **权限 (Permissions)** > **存储桶策略 (Bucket policy)** 并粘贴以下内容:
      ```json
      {
          "Version": "2012-10-17",
          "Statement": [
              {
                  "Sid": "PublicReadGetObject",
                  "Effect": "Allow",
                  "Principal": "*",
                  "Action": "s3:GetObject",
                  "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
              }
          ]
      }
      ```
      *(将 `YOUR_BUCKET_NAME` 替换为你的实际存储桶名称)*

## 3. Certificate Manager (HTTPS 证书)
1.  **请求证书**:
    - 前往 **ACM (AWS Certificate Manager)**。
    - **区域 (Region)**: 必须是 **us-east-1 (N. Virginia)** 才能用于 CloudFront。
    - 请求一个公有证书，域名填写 `*.aihelper360.com` (通配符) 或明确指定 `project2.aihelper360.com`。
    - 验证方法: 使用 **DNS 验证**。请求后点击 "在 Route 53 中创建记录 (Create records in Route 53)"。

## 4. CloudFront (CDN & HTTPS)
1.  **创建分配 (Distribution)**:
    - **源域 (Origin Domain)**: 选择你的 S3 存储桶。
    - **查看器协议策略 (Viewer Protocol Policy)**: HTTP 重定向到 HTTPS (Redirect HTTP to HTTPS)。
    - **允许的 HTTP 方法 (Allowed HTTP Methods)**: GET, HEAD, OPTIONS。
    - **设置 (WAF)**: 如果需要安全保护则启用 (或为了简单省钱可禁用)。
    - **备用域名 (CNAMEs)**: `project2.aihelper360.com`。
    - **自定义 SSL 证书 (Custom SSL Certificate)**: 选择步骤 3 中创建的证书。
    - **默认根对象 (Default Root Object)**: `index.html`。
2.  **错误页面 (Error Pages) (SPA 关键步骤)**:
    - 前往 **错误页面 (Error pages)** 选项卡。
    - 创建自定义错误响应 (Create Custom Error Response):
        - **HTTP 错误代码**: `403` 和 `404` (分别创建)。
        - **自定义错误响应 (Customize Error Response)**: 是 (Yes)。
        - **响应页面路径 (Response Page Path)**: `/index.html`。
        - **HTTP 响应代码**: `200`。

## 5. Route 53 (DNS 解析)
1.  **创建记录**:
    - 前往 **托管区域 (Hosted Zones)** > `aihelper360.com`。
    - 点击 **创建记录 (Create record)**。
    - **记录名称 (Record name)**: `project2`。
    - **记录类型 (Record type)**: A。
    - **别名 (Alias)**: 是 (Yes)。
    - **路由流量至 (Route traffic to)**: 别名至 CloudFront 分配 (Alias to CloudFront distribution)。
    - 选择你的 CloudFront 分配。
    - 点击 **创建记录 (Create records)**。

## 🛑 之前踩过的坑 (常见问题总结)
1.  **SPA 路由问题 (刷新报 404/403)**:
    - *症状*: 本地访问子页面链接正常，但上线后直接访问或刷新会报错。
    - *修复*: 在 CloudFront "错误页面 (Error pages)" 中，将 403 和 404 错误重定向到 `/index.html` 并返回状态码 200。仅在 S3 设置 "错误文档" 为 `index.html` 也是必须的。
2.  **HTTPS 证书区域**:
    - *坑*: 在本地所在区域 (如 ap-northeast-1) 创建 ACM 证书。
    - *修复*: CloudFront **强制要求** ACM 证书必须在 **us-east-1** 区域创建。
3.  **缓存问题**:
    - *坑*: 上传新代码后，访问看到的还是旧版本。
    - *修复*: 每次部署后，在 CloudFront 创建一个 **失效 (Invalidation)**，路径填写 `/*`。
4.  **存储桶策略冲突**:
    - *坑*: 即使策略正确，仍然提示 "Access Denied"。
    - *修复*: 确保存储桶设置中的 "阻止所有公有访问 (Block all public access)" 处于 **关闭 (OFF)** 状态 (如果使用的是公有读策略)。
