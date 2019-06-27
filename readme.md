목표 : 동영상 편집 프로그램 제작

목적 : 
문제 해결 능력 증명
주제 -> 동영상 도메인 전문지식 습득과 활용
- 다양한 코덱, 파일 포맷과 프로토콜에 대한리서치 및 개발
- 동영상 트랜스코더 엔진 및 스트리머 (HLS, MPEG-DASH, RTMP 등) 개발
- GPU 기반 동영상 Effect 개발 (얼굴인식 애니메이션 필터, 무비 필터, 오디오 변조 필터 등)
- OpenGL/Metal 등을 이용한 GPU 프로세싱 개발

코딩 역량 증명
- 실시간 LIVE/VOD 인코더 개발
- 실시간 프로세싱을 위한 최적화 기술 개발
- VOD 편집 기능 개발(Merge, Trim, Speed, Reverse, BGM 등)

기한 : 2019.07.14까지 진행

개발환경

vscode 최신버전
- GitHub
- GitHub Pull Requests
- Korean Language Pack for Visual Studio Code

node.js
- 10.16.0 LTS for windows x64
- https://nodejs.org/dist/v10.16.0/node-v10.16.0-x64.msi

package manager
npm 사용

공통 개발을 위한 룰

모든 활동은 GitHub에서 제공하는 Issue로 등록한다. hotfix, feature, issure 브랜치는 GitHub에 등록된 <issue_number>를 기준으로 생성한다. 

master 브랜치
- 사용자에게 배포되는 것과 동일
- release 이름은 사용안함

develop 브랜치
- 개발자 공통 브랜치

hotfix 브랜치
- master 브랜치로부터 생성하는 브랜치이다. master 브랜치에 심각한 오류가 있는 경우에만 생성한다. 
- 명명규칙: hotfix/<issue_number>
- 완료 후 master, release, develop 브랜치에 병합한다. 

feature 브랜치
- develop 브랜치로부터 생성하는 브랜치이다. 
- 명명규칙: feature/<issue_number>/<짧은설명> 
- 완료 후 develop 브랜치에 병합한다. 

issue 브랜치
- develop, feature, release 브랜치로부터 생성하는 브랜치이다. 
- 명명규칙: issue/<issue_number>
- 완료 후에는 생성된 부모 브랜치로 병합한다. 