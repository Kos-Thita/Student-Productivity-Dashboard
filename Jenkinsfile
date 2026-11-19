
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        EC2_HOST = '52.66.246.209'
        EC2_USER = 'ubuntu'
        EC2_PROJECT = '/home/ubuntu/Student-Productivity-Dashboard'
        IMAGE_NAME = 'student-productivity-dashboard'
        CONTAINER_NAME = 'student-productivity-dashboard'
    }

    stages {

        stage('Deploy to EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'EC2_SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    bat '''
                        icacls "%EC2_SSH_KEY%" /inheritance:r
                        icacls "%EC2_SSH_KEY%" /remove:g "*S-1-5-21-351373108-3636330957-2019055228-1001"
                        icacls "%EC2_SSH_KEY%" /grant:r "*S-1-5-18:R"

                        ssh -i "%EC2_SSH_KEY%" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL %SSH_USER%@%EC2_HOST% "cd %EC2_PROJECT% && git pull origin main && docker build -t %IMAGE_NAME% . && docker rm -f %CONTAINER_NAME% && docker run -d --name %CONTAINER_NAME% --restart unless-stopped -p 8000:8000 -v student-dashboard-data:/app/data %IMAGE_NAME%"
                    '''
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'EC2_SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    bat '''
                        icacls "%EC2_SSH_KEY%" /inheritance:r
                        icacls "%EC2_SSH_KEY%" /remove:g "*S-1-5-21-351373108-3636330957-2019055228-1001"
                        icacls "%EC2_SSH_KEY%" /grant:r "*S-1-5-18:R"

                        ssh -i "%EC2_SSH_KEY%" -o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL %SSH_USER%@%EC2_HOST% "sleep 5 && docker ps --filter name=%CONTAINER_NAME% && docker inspect --format '{{.State.Health.Status}}' %CONTAINER_NAME% && docker exec %CONTAINER_NAME% ls -lh /app/data"
                    '''
                }
            }
        }
    }
}
